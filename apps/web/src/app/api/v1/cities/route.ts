import { prisma } from "@events/db";
import { json, route } from "@/lib/api";

export const GET = route(async () => {
  const items = await prisma.city.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    select: { id: true, nameAr: true, nameEn: true, lat: true, lng: true },
  });
  return json({ items });
});
