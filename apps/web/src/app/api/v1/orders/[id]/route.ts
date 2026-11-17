import { prisma } from "@events/db";
import { checkRefundEligibility } from "@events/shared";
import { HttpError, requireUser } from "@/lib/auth";
import { json, route } from "@/lib/api";
import { signTicket } from "@/lib/qr";
import { getSettings } from "@/lib/settings";

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  const user = await requireUser("CUSTOMER");
  const o = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: {
      event: { include: { city: true, organizer: { select: { name: true } } } },
      items: { include: { ticketType: true } },
      tickets: { include: { orderItem: { include: { ticketType: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!o) throw new HttpError(404, "NOT_FOUND");
  const settings = await getSettings();
  const refund = checkRefundEligibility({
    policyType: o.event.refundPolicyType,
    hoursBefore: o.event.refundHoursBefore,
    eventStartAt: o.event.startAt,
    orderStatus: o.status,
    anyTicketUsed: o.tickets.some((t) => t.status === "USED"),
  });
  return json({
    order: {
      id: o.id,
      status: o.status,
      receiptNumber: o.receiptNumber,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      paymentMethod: o.paymentMethod,
      totalAmount: o.totalAmount,
      vatAmount: o.vatAmount,
      subtotalAmount: o.subtotalAmount,
      vatRate: Number(o.vatRate),
      items: o.items.map((i) => ({
        nameAr: i.ticketType.nameAr,
        nameEn: i.ticketType.nameEn,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      event: {
        id: o.event.id,
        titleAr: o.event.titleAr,
        titleEn: o.event.titleEn,
        startAt: o.event.startAt,
        endAt: o.event.endAt,
        venueName: o.event.venueName,
        address: o.event.address,
        lat: o.event.lat,
        lng: o.event.lng,
        coverImageUrl: o.event.coverImageUrl,
        status: o.event.status,
        cityAr: o.event.city.nameAr,
        cityEn: o.event.city.nameEn,
        organizerName: o.event.organizer.name,
        refundPolicy: { type: o.event.refundPolicyType, hoursBefore: o.event.refundHoursBefore },
      },
      tickets: o.tickets.map((t) => ({
        id: t.id,
        status: t.status,
        checkedInAt: t.checkedInAt,
        typeAr: t.orderItem.ticketType.nameAr,
        typeEn: t.orderItem.ticketType.nameEn,
        qr: o.status === "PAID" ? signTicket(t.id) : null,
      })),
      refund: refund.eligible ? { eligible: true } : { eligible: false, reason: refund.reason },
      seller: {
        nameAr: settings.nameAr,
        nameEn: settings.nameEn,
        vatNumber: settings.vatNumber,
        addressAr: settings.addressAr,
        addressEn: settings.addressEn,
      },
    },
  });
});
