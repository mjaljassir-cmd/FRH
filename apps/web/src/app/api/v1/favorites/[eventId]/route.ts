import { prisma } from "@events/db";
import { HttpError, requireUser } from "@/lib/auth";
import { json, route } from "@/lib/api";

type Ctx = { params: Promise<{ eventId: string }> };

export const POST = route<Ctx>(async (_req, { params }) => {
  const { eventId } = await params;
  const user = await requireUser("CUSTOMER");
  const ev = await prisma.event.findFirst({ where: { id: eventId, status: { in: ["PUBLISHED", "ENDED"] } } });
  if (!ev) throw new HttpError(404, "NOT_FOUND");
  await prisma.favorite.upsert({
    where: { userId_eventId: { userId: user.id, eventId } },
    update: {},
    create: { userId: user.id, eventId },
  });
  return json({ ok: true });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { eventId } = await params;
  const user = await requireUser("CUSTOMER");
  await prisma.favorite.deleteMany({ where: { userId: user.id, eventId } });
  return json({ ok: true });
});
