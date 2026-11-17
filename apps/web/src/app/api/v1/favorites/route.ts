import { prisma } from "@events/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/api";
import { listInclude, ratingsFor, serializeEventSummary } from "@/lib/events";

export const GET = route(async () => {
  const user = await requireUser("CUSTOMER");
  const favs = await prisma.favorite.findMany({
    where: { userId: user.id, event: { status: { in: ["PUBLISHED", "ENDED"] } } },
    orderBy: { createdAt: "desc" },
    include: { event: { include: listInclude } },
  });
  const ratings = await ratingsFor(favs.map((f) => f.eventId));
  return json({ items: favs.map((f) => serializeEventSummary(f.event, undefined, undefined, ratings)) });
});
