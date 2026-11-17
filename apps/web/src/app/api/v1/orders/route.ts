import { prisma } from "@events/db";
import { createOrderSchema } from "@events/shared";
import { requireUser } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/api";
import { createOrder } from "@/lib/orders";
import { paymentUrlFor } from "@/lib/payment-link";

export const POST = route(async (req) => {
  const user = await requireUser("CUSTOMER");
  const body = await parseBody(req, createOrderSchema);
  const order = await createOrder(user.id, body);
  return json(
    {
      order: { id: order.id, status: order.status, totalAmount: order.totalAmount, expiresAt: order.expiresAt },
      paymentUrl: order.status === "PENDING" ? await paymentUrlFor(order.id, user.id, user.locale) : null,
    },
    { status: 201 },
  );
});

export const GET = route(async () => {
  const user = await requireUser("CUSTOMER");
  const orders = await prisma.order.findMany({
    where: { userId: user.id, status: { in: ["PAID", "REFUNDED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      event: { select: { id: true, titleAr: true, titleEn: true, startAt: true, endAt: true, coverImageUrl: true, venueName: true, status: true } },
      _count: { select: { tickets: true } },
    },
  });
  return json({
    items: orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      ticketCount: o._count.tickets,
      event: o.event,
    })),
  });
});
