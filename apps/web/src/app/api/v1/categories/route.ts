import { prisma } from "@events/db";
import { json, route } from "@/lib/api";

export const GET = route(async () => {
  const items = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    select: { id: true, nameAr: true, nameEn: true },
  });
  return json({ items });
});
