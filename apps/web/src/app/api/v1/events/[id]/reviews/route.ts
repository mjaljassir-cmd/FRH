import { prisma } from "@events/db";
import { reviewSchema } from "@events/shared";
import { HttpError, requireUser } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page") ?? 1));
  const items = await prisma.review.findMany({
    where: { eventId: id, isHidden: false },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * 20,
    take: 20,
    include: { user: { select: { name: true } } },
  });
  return json({
    items: items.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, userName: r.user.name })),
  });
});

export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const user = await requireUser("CUSTOMER");
  const body = await parseBody(req, reviewSchema);
  // Only attendees whose ticket was scanned may review
  const attended = await prisma.ticket.findFirst({ where: { status: "USED", order: { userId: user.id, eventId: id } } });
  if (!attended) throw new HttpError(403, "NOT_ATTENDED");
  const exists = await prisma.review.findUnique({ where: { userId_eventId: { userId: user.id, eventId: id } } });
  if (exists) throw new HttpError(409, "ALREADY_REVIEWED");
  const review = await prisma.review.create({
    data: { userId: user.id, eventId: id, rating: body.rating, comment: body.comment || null },
  });
  return json({ review }, { status: 201 });
});
