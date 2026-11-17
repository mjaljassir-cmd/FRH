import { prisma, Prisma } from "@events/db";
import { distanceKm, type eventListQuerySchema } from "@events/shared";
import type { z } from "zod";

type ListQuery = z.infer<typeof eventListQuerySchema>;

export function featuredWhere(now = new Date()): Prisma.EventWhereInput {
  return { isFeatured: true, OR: [{ featuredUntil: null }, { featuredUntil: { gt: now } }] };
}

export function publicEventWhere(now = new Date()): Prisma.EventWhereInput {
  return { status: "PUBLISHED", endAt: { gt: now }, organizer: { status: "APPROVED" } };
}

const listInclude = {
  city: true,
  category: true,
  organizer: { select: { id: true, name: true, logoUrl: true } },
  ticketTypes: { select: { price: true, quantity: true, sold: true } },
} satisfies Prisma.EventInclude;

type ListEvent = Prisma.EventGetPayload<{ include: typeof listInclude }>;

export function serializeEventSummary(e: ListEvent, userLat?: number, userLng?: number, ratings?: Map<string, { avg: number; count: number }>) {
  const prices = e.ticketTypes.map((t) => t.price);
  const now = new Date();
  return {
    id: e.id,
    titleAr: e.titleAr,
    titleEn: e.titleEn,
    coverImageUrl: e.coverImageUrl,
    startAt: e.startAt,
    endAt: e.endAt,
    venueName: e.venueName,
    lat: e.lat,
    lng: e.lng,
    city: { id: e.city.id, nameAr: e.city.nameAr, nameEn: e.city.nameEn },
    category: { id: e.category.id, nameAr: e.category.nameAr, nameEn: e.category.nameEn },
    organizer: e.organizer,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    soldOut: e.ticketTypes.length > 0 && e.ticketTypes.every((t) => t.sold >= t.quantity),
    isFeatured: e.isFeatured && (!e.featuredUntil || e.featuredUntil > now),
    distanceKm: userLat != null && userLng != null ? Math.round(distanceKm(userLat, userLng, e.lat, e.lng) * 10) / 10 : null,
    rating: ratings?.get(e.id) ?? null,
  };
}

export async function ratingsFor(eventIds: string[]) {
  if (!eventIds.length) return new Map<string, { avg: number; count: number }>();
  const rows = await prisma.review.groupBy({
    by: ["eventId"],
    where: { eventId: { in: eventIds }, isHidden: false },
    _avg: { rating: true },
    _count: true,
  });
  return new Map(rows.map((r) => [r.eventId, { avg: Math.round((r._avg.rating ?? 0) * 10) / 10, count: r._count }]));
}

export async function listPublicEvents(q: ListQuery) {
  const now = new Date();
  const and: Prisma.EventWhereInput[] = [publicEventWhere(now)];
  if (q.q) {
    and.push({
      OR: [
        { titleAr: { contains: q.q, mode: "insensitive" } },
        { titleEn: { contains: q.q, mode: "insensitive" } },
        { venueName: { contains: q.q, mode: "insensitive" } },
        { organizer: { name: { contains: q.q, mode: "insensitive" } } },
      ],
    });
  }
  if (q.cityId) and.push({ cityId: q.cityId });
  if (q.categoryId) and.push({ categoryId: q.categoryId });
  // Date range: events that overlap [from, to]
  if (q.from) and.push({ endAt: { gte: new Date(q.from) } });
  if (q.to) and.push({ startAt: { lte: new Date(q.to) } });
  if (q.minPrice != null || q.maxPrice != null) {
    and.push({
      ticketTypes: {
        some: {
          price: {
            ...(q.minPrice != null ? { gte: Math.round(q.minPrice * 100) } : {}),
            ...(q.maxPrice != null ? { lte: Math.round(q.maxPrice * 100) } : {}),
          },
        },
      },
    });
  }
  if (q.featured === "1") and.push(featuredWhere(now));

  const nearby = q.lat != null && q.lng != null && q.radiusKm != null;
  if (nearby) {
    // Bounding box prefilter, exact distance filter below
    const dLat = q.radiusKm! / 111;
    const dLng = q.radiusKm! / (111 * Math.max(Math.cos((q.lat! * Math.PI) / 180), 0.01));
    and.push({ lat: { gte: q.lat! - dLat, lte: q.lat! + dLat }, lng: { gte: q.lng! - dLng, lte: q.lng! + dLng } });
  }

  const where: Prisma.EventWhereInput = { AND: and };

  if (nearby) {
    const rows = await prisma.event.findMany({ where, include: listInclude, take: 500 });
    const ratings = await ratingsFor(rows.map((r) => r.id));
    const items = rows
      .map((e) => serializeEventSummary(e, q.lat, q.lng, ratings))
      .filter((e) => e.distanceKm! <= q.radiusKm!)
      .sort((a, b) => a.distanceKm! - b.distanceKm!);
    const start = (q.page - 1) * q.pageSize;
    return { items: items.slice(start, start + q.pageSize), total: items.length, page: q.page, pageSize: q.pageSize };
  }

  const [rows, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: listInclude,
      orderBy: [{ startAt: "asc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.event.count({ where }),
  ]);
  const ratings = await ratingsFor(rows.map((r) => r.id));
  return {
    items: rows.map((e) => serializeEventSummary(e, q.lat, q.lng, ratings)),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export { listInclude };
