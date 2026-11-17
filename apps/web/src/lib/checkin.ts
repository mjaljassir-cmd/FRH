import { prisma, type User } from "@events/db";
import { verifyTicketPayload } from "./qr";

export type CheckInResult =
  | { status: "OK"; ticket: TicketInfo }
  | { status: "ALREADY_USED"; ticket: TicketInfo; checkedInAt: Date }
  | { status: "REFUNDED"; ticket: TicketInfo }
  | { status: "WRONG_EVENT"; ticket: TicketInfo }
  | { status: "INVALID" };

interface TicketInfo {
  id: string;
  holder: string;
  ticketTypeAr: string;
  ticketTypeEn: string;
  eventTitleAr: string;
  eventTitleEn: string;
}

/** Resolve the organizer a scanning user acts for. */
export async function scannerOrganizerId(user: User): Promise<string | null> {
  if (user.role === "ORGANIZER") {
    const org = await prisma.organizer.findUnique({ where: { ownerId: user.id } });
    return org?.status === "APPROVED" ? org.id : null;
  }
  if (user.role === "STAFF") {
    const s = await prisma.staffMember.findUnique({ where: { userId: user.id }, include: { organizer: true } });
    return s?.organizer.status === "APPROVED" ? s.organizerId : null;
  }
  return null;
}

export async function checkInTicket(payload: string, user: User, eventId?: string): Promise<CheckInResult> {
  const ticketId = verifyTicketPayload(payload);
  if (!ticketId) return { status: "INVALID" };
  const organizerId = await scannerOrganizerId(user);
  if (!organizerId) return { status: "INVALID" };

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      order: { include: { event: true, user: true } },
      orderItem: { include: { ticketType: true } },
    },
  });
  if (!ticket || ticket.order.event.organizerId !== organizerId) return { status: "INVALID" };

  const info: TicketInfo = {
    id: ticket.id,
    holder: ticket.order.user.name,
    ticketTypeAr: ticket.orderItem.ticketType.nameAr,
    ticketTypeEn: ticket.orderItem.ticketType.nameEn,
    eventTitleAr: ticket.order.event.titleAr,
    eventTitleEn: ticket.order.event.titleEn,
  };

  if (eventId && ticket.order.eventId !== eventId) return { status: "WRONG_EVENT", ticket: info };
  if (ticket.status === "REFUNDED") return { status: "REFUNDED", ticket: info };
  if (ticket.status === "USED") return { status: "ALREADY_USED", ticket: info, checkedInAt: ticket.checkedInAt! };

  const n = await prisma.ticket.updateMany({
    where: { id: ticket.id, status: "VALID" },
    data: { status: "USED", checkedInAt: new Date(), checkedInById: user.id },
  });
  if (n.count !== 1) {
    const fresh = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    return { status: "ALREADY_USED", ticket: info, checkedInAt: fresh?.checkedInAt ?? new Date() };
  }
  return { status: "OK", ticket: info };
}
