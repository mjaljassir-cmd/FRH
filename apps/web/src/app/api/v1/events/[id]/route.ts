import { prisma } from "@events/db";
import { HttpError, getCurrentUser } from "@/lib/auth";
import { json, route } from "@/lib/api";
import { publicEventWhere, ratingsFor } from "@/lib/events";

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  const now = new Date();
  const e = await prisma.event.findFirst({
    // Past (ended) events stay viewable so attendees can review them
    where: { id, status: { in: ["PUBLISHED", "ENDED"] }, organizer: { status: "APPROVED" } },
    include: {
      city: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      organizer: { select: { id: true, name: true, logoUrl: true, description: true } },
      ticketTypes: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!e) throw new HttpError(404, "NOT_FOUND");

  const user = await getCurrentUser();
  const [ratings, organizerRating, favorite, attended, myReview] = await Promise.all([
    ratingsFor([e.id]),
    prisma.review.aggregate({
      where: { event: { organizerId: e.organizerId }, isHidden: false },
      _avg: { rating: true },
      _count: true,
    }),
    user ? prisma.favorite.findUnique({ where: { userId_eventId: { userId: user.id, eventId: e.id } } }) : null,
    user ? prisma.ticket.findFirst({ where: { status: "USED", order: { userId: user.id, eventId: e.id } } }) : null,
    user ? prisma.review.findUnique({ where: { userId_eventId: { userId: user.id, eventId: e.id } } }) : null,
  ]);
  const isOnSale = (await prisma.event.count({ where: { id: e.id, ...publicEventWhere(now) } })) === 1;

  return json({
    event: {
      id: e.id,
      titleAr: e.titleAr,
      titleEn: e.titleEn,
      descriptionAr: e.descriptionAr,
      descriptionEn: e.descriptionEn,
      coverImageUrl: e.coverImageUrl,
      images: e.images.map((i) => i.url),
      startAt: e.startAt,
      endAt: e.endAt,
      venueName: e.venueName,
      address: e.address,
      lat: e.lat,
      lng: e.lng,
      city: { id: e.city.id, nameAr: e.city.nameAr, nameEn: e.city.nameEn },
      category: { id: e.category.id, nameAr: e.category.nameAr, nameEn: e.category.nameEn },
      organizer: {
        ...e.organizer,
        rating: organizerRating._count
          ? { avg: Math.round((organizerRating._avg.rating ?? 0) * 10) / 10, count: organizerRating._count }
          : null,
      },
      refundPolicy: { type: e.refundPolicyType, hoursBefore: e.refundHoursBefore },
      ticketTypes: e.ticketTypes.map((t) => ({
        id: t.id,
        nameAr: t.nameAr,
        nameEn: t.nameEn,
        price: t.price,
        remaining: Math.max(t.quantity - t.sold, 0),
        onSale: isOnSale && (!t.salesStartAt || t.salesStartAt <= now) && (!t.salesEndAt || t.salesEndAt >= now),
        salesStartAt: t.salesStartAt,
        salesEndAt: t.salesEndAt,
      })),
      isOnSale,
      rating: ratings.get(e.id) ?? null,
      isFavorite: !!favorite,
      canReview: !!attended && !myReview,
    },
  });
});
