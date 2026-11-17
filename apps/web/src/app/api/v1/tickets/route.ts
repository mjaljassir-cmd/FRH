import { prisma } from "@events/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/api";

/** Upcoming and past paid orders grouped for the "My tickets" screen. */
export const GET = route(async () => {
  const user = await requireUser("CUSTOMER");
  const now = new Date();
  const orders = await prisma.order.findMany({
    where: { userId: user.id, status: { in: ["PAID", "REFUNDED"] } },
    orderBy: { event: { startAt: "asc" } },
    include: {
      event: { select: { id: true, titleAr: true, titleEn: true, startAt: true, endAt: true, coverImageUrl: true, venueName: true, status: true } },
      _count: { select: { tickets: true } },
    },
  });
  const map = (o: (typeof orders)[number]) => ({
    orderId: o.id,
    status: o.status,
    ticketCount: o._count.tickets,
    event: o.event,
  });
  return json({
    upcoming: orders.filter((o) => o.event.endAt > now && o.status === "PAID").map(map),
    past: orders.filter((o) => o.event.endAt <= now || o.status !== "PAID").reverse().map(map),
  });
});
