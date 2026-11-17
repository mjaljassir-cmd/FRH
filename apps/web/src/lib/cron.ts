import { prisma } from "@events/db";
import { expireStaleOrders } from "./orders";
import { sendPushToUsers } from "./push";

/** Periodic jobs: expire unpaid orders, close finished events, send 24h reminders. */
export async function runCron() {
  const now = new Date();
  const expired = await expireStaleOrders();

  const ended = await prisma.event.updateMany({
    where: { status: "PUBLISHED", endAt: { lt: now } },
    data: { status: "ENDED", isFeatured: false },
  });

  const in24h = new Date(now.getTime() + 24 * 3600 * 1000);
  const upcoming = await prisma.event.findMany({
    where: { status: "PUBLISHED", reminderSentAt: null, startAt: { gt: now, lte: in24h } },
  });
  let reminders = 0;
  for (const ev of upcoming) {
    // Claim the event first so parallel cron runs don't double-send
    const claimed = await prisma.event.updateMany({
      where: { id: ev.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claimed.count !== 1) continue;
    const buyers = await prisma.order.findMany({
      where: { eventId: ev.id, status: "PAID" },
      select: { userId: true },
      distinct: ["userId"],
    });
    reminders += await sendPushToUsers(
      buyers.map((b) => b.userId),
      {
        titleAr: "تذكير بفعاليتك",
        titleEn: "Event reminder",
        bodyAr: `فعالية ${ev.titleAr} تبدأ خلال أقل من 24 ساعة`,
        bodyEn: `${ev.titleEn} starts in less than 24 hours`,
        data: { type: "event", eventId: ev.id },
      },
    );
  }
  return { expired, ended: ended.count, reminders };
}
