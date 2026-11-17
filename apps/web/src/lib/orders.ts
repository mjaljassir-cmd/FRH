import { prisma, Prisma, type Order } from "@events/db";
import { computeOrderBreakdown, checkRefundEligibility } from "@events/shared";
import { HttpError } from "./auth";
import { refundPayment } from "./moyasar";
import { sendPushToUsers } from "./push";
import { getSettings } from "./settings";

export const ORDER_HOLD_MINUTES = 15;

type Tx = Prisma.TransactionClient;

async function reserveStock(tx: Tx, ticketTypeId: string, qty: number) {
  const n = await tx.$executeRaw`
    UPDATE "TicketType" SET "sold" = "sold" + ${qty}
    WHERE "id" = ${ticketTypeId} AND "sold" + ${qty} <= "quantity"`;
  return n === 1;
}

async function releaseStock(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const it of items) {
    await tx.$executeRaw`
      UPDATE "TicketType" SET "sold" = GREATEST("sold" - ${it.quantity}, 0) WHERE "id" = ${it.ticketTypeId}`;
  }
}

async function reserveOrderItems(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const it of items) {
    if (!(await reserveStock(tx, it.ticketTypeId, it.quantity))) return false;
  }
  return true;
}

export async function createOrder(userId: string, input: { eventId: string; items: { ticketTypeId: string; quantity: number }[] }) {
  const now = new Date();
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    include: { ticketTypes: true, organizer: true },
  });
  if (!event || event.status !== "PUBLISHED" || event.organizer.status !== "APPROVED") {
    throw new HttpError(404, "EVENT_NOT_AVAILABLE");
  }
  if (event.endAt <= now) throw new HttpError(400, "EVENT_ENDED");

  // The cron job may run only once a day (Vercel Hobby), so free expired holds right here
  await expireStaleOrders(event.id);

  // Merge duplicate lines
  const merged = new Map<string, number>();
  for (const it of input.items) merged.set(it.ticketTypeId, (merged.get(it.ticketTypeId) ?? 0) + it.quantity);

  const lines = [...merged.entries()].map(([ticketTypeId, quantity]) => {
    const tt = event.ticketTypes.find((t) => t.id === ticketTypeId);
    if (!tt) throw new HttpError(400, "INVALID_TICKET_TYPE");
    if (tt.salesStartAt && tt.salesStartAt > now) throw new HttpError(400, "SALES_NOT_STARTED");
    if (tt.salesEndAt && tt.salesEndAt < now) throw new HttpError(400, "SALES_ENDED");
    return { tt, quantity };
  });

  const settings = await getSettings();
  const vatRate = Number(settings.vatRate);
  const commissionRate = Number(event.organizer.commissionRate);
  const breakdown = computeOrderBreakdown(
    lines.map((l) => ({ unitPrice: l.tt.price, quantity: l.quantity })),
    vatRate,
    commissionRate,
  );

  const order = await prisma.$transaction(async (tx) => {
    for (const l of lines) {
      if (!(await reserveStock(tx, l.tt.id, l.quantity))) throw new HttpError(409, "SOLD_OUT");
    }
    return tx.order.create({
      data: {
        userId,
        eventId: event.id,
        ...breakdown,
        vatRate,
        commissionRate,
        expiresAt: new Date(now.getTime() + ORDER_HOLD_MINUTES * 60_000),
        items: {
          create: lines.map((l) => ({ ticketTypeId: l.tt.id, quantity: l.quantity, unitPrice: l.tt.price })),
        },
      },
    });
  });

  if (order.totalAmount === 0) {
    await markOrderPaid(order.id, null, "free");
    return prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  }
  return order;
}

/** Mark an order as paid and issue tickets. Idempotent. */
export async function markOrderPaid(orderId: string, paymentId: string | null, method: string) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");
    if (order.status === "PAID" || order.status === "REFUNDED") return { order, issued: false, refundNeeded: false };

    if (order.status === "EXPIRED" || order.status === "FAILED") {
      // Payment completed after the hold expired: try to re-reserve.
      if (!(await reserveOrderItems(tx, orderId))) {
        return { order, issued: false, refundNeeded: true };
      }
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID", paidAt: new Date(), moyasarPaymentId: paymentId, paymentMethod: method },
    });
    const items = await tx.orderItem.findMany({ where: { orderId } });
    await tx.ticket.createMany({
      data: items.flatMap((it) => Array.from({ length: it.quantity }, () => ({ orderId, orderItemId: it.id }))),
    });
    return { order: updated, issued: true, refundNeeded: false };
  });

  if (result.refundNeeded && paymentId) {
    // Could not honour the order (sold out after expiry) – give the money back.
    await prisma.order.update({ where: { id: orderId }, data: { moyasarPaymentId: paymentId, paymentMethod: method } });
    const r = await refundPayment(paymentId, result.order.totalAmount);
    await prisma.refund.create({
      data: {
        orderId,
        amount: result.order.totalAmount,
        reason: "CUSTOMER_REQUEST",
        status: r.ok ? "COMPLETED" : "FAILED",
        errorMessage: r.error ?? "Sold out after hold expired",
      },
    });
    await prisma.order.update({ where: { id: orderId }, data: { status: r.ok ? "REFUNDED" : "FAILED" } });
    return { ok: false as const };
  }

  if (result.issued) {
    const ev = await prisma.event.findUnique({ where: { id: result.order.eventId } });
    if (ev) {
      await sendPushToUsers([result.order.userId], {
        titleAr: "تم تأكيد حجزك",
        titleEn: "Booking confirmed",
        bodyAr: `تذاكرك لفعالية ${ev.titleAr} جاهزة`,
        bodyEn: `Your tickets for ${ev.titleEn} are ready`,
        data: { type: "order", orderId },
      });
    }
  }
  return { ok: true as const };
}

export async function failOrder(orderId: string) {
  await prisma.$transaction(async (tx) => {
    const n = await tx.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "FAILED" } });
    if (n.count === 1) await releaseStock(tx, orderId);
  });
}

/** Release tickets held by unpaid orders whose 15-minute hold has passed (optionally for one event). */
export async function expireStaleOrders(eventId?: string) {
  const stale = await prisma.order.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() }, ...(eventId ? { eventId } : {}) },
    select: { id: true },
  });
  for (const o of stale) {
    await prisma.$transaction(async (tx) => {
      const n = await tx.order.updateMany({ where: { id: o.id, status: "PENDING" }, data: { status: "EXPIRED" } });
      if (n.count === 1) await releaseStock(tx, o.id);
    });
  }
  return stale.length;
}

/**
 * Refund a whole paid order through Moyasar.
 * For customer requests the organizer's refund policy is enforced.
 */
export async function refundOrder(orderId: string, reason: "CUSTOMER_REQUEST" | "EVENT_CANCELLED") {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { event: true, tickets: true, refunds: true },
  });
  if (!order) throw new HttpError(404, "NOT_FOUND");

  if (reason === "CUSTOMER_REQUEST") {
    const elig = checkRefundEligibility({
      policyType: order.event.refundPolicyType,
      hoursBefore: order.event.refundHoursBefore,
      eventStartAt: order.event.startAt,
      orderStatus: order.status,
      anyTicketUsed: order.tickets.some((t) => t.status === "USED"),
    });
    if (!elig.eligible) throw new HttpError(400, elig.reason);
  } else if (order.status !== "PAID") {
    throw new HttpError(400, "NOT_PAID");
  }

  // Guard against concurrent refunds
  const refund = await prisma.$transaction(async (tx) => {
    const active = await tx.refund.findFirst({ where: { orderId, status: { in: ["PENDING", "COMPLETED"] } } });
    if (active) throw new HttpError(409, "REFUND_IN_PROGRESS");
    return tx.refund.create({ data: { orderId, amount: order.totalAmount, reason } });
  });

  let ok = true;
  let error: string | undefined;
  if (order.totalAmount > 0) {
    if (!order.moyasarPaymentId) {
      ok = false;
      error = "Missing payment id";
    } else {
      const r = await refundPayment(order.moyasarPaymentId, order.totalAmount);
      ok = r.ok;
      error = r.error;
    }
  }

  if (!ok) {
    await prisma.refund.update({ where: { id: refund.id }, data: { status: "FAILED", errorMessage: error } });
    throw new HttpError(502, "REFUND_FAILED");
  }

  await prisma.$transaction(async (tx) => {
    await tx.refund.update({ where: { id: refund.id }, data: { status: "COMPLETED" } });
    await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
    await tx.ticket.updateMany({ where: { orderId }, data: { status: "REFUNDED" } });
    if (reason === "CUSTOMER_REQUEST") await releaseStock(tx, orderId);
  });

  await sendPushToUsers([order.userId], {
    titleAr: "تم استرداد المبلغ",
    titleEn: "Refund processed",
    bodyAr: `تم استرداد مبلغ طلبك لفعالية ${order.event.titleAr}`,
    bodyEn: `Your order for ${order.event.titleEn} has been refunded`,
    data: { type: "order", orderId },
  });
  return refund;
}

/** Cancel an event and refund all paid orders. Returns counts. */
export async function cancelEvent(eventId: string) {
  const ev = await prisma.event.update({ where: { id: eventId }, data: { status: "CANCELLED", isFeatured: false } });
  const paid = await prisma.order.findMany({ where: { eventId, status: "PAID" }, select: { id: true, userId: true } });
  let refunded = 0;
  let failed = 0;
  for (const o of paid) {
    try {
      await refundOrder(o.id, "EVENT_CANCELLED");
      refunded++;
    } catch {
      failed++;
    }
  }
  const buyers = [...new Set(paid.map((o) => o.userId))];
  await sendPushToUsers(buyers, {
    titleAr: "تم إلغاء الفعالية",
    titleEn: "Event cancelled",
    bodyAr: `نعتذر، تم إلغاء فعالية ${ev.titleAr} وسيتم استرداد المبلغ`,
    bodyEn: `Sorry, ${ev.titleEn} has been cancelled and your payment will be refunded`,
    data: { type: "event", eventId },
  });
  return { refunded, failed };
}

/** Retry a failed refund (admin). */
export async function retryRefund(refundId: string) {
  const r = await prisma.refund.findUnique({ where: { id: refundId } });
  if (!r || r.status !== "FAILED") throw new HttpError(400, "NOT_RETRYABLE");
  // Remove the failed record so refundOrder's guard allows a fresh attempt
  await prisma.refund.delete({ where: { id: refundId } });
  return refundOrder(r.orderId, r.reason === "EVENT_CANCELLED" ? "EVENT_CANCELLED" : "CUSTOMER_REQUEST");
}

export async function organizerBalance(organizerId: string) {
  const [sales, payouts] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "PAID", event: { organizerId } },
      _sum: { totalAmount: true, commissionAmount: true, organizerNet: true, vatAmount: true },
      _count: true,
    }),
    prisma.payout.aggregate({ where: { organizerId }, _sum: { amount: true } }),
  ]);
  const net = sales._sum.organizerNet ?? 0;
  const paidOut = payouts._sum.amount ?? 0;
  return {
    orders: sales._count,
    gross: sales._sum.totalAmount ?? 0,
    vat: sales._sum.vatAmount ?? 0,
    commission: sales._sum.commissionAmount ?? 0,
    net,
    paidOut,
    due: net - paidOut,
  };
}

export type OrderWithEvent = Order & { event: { titleAr: string; titleEn: string } };
