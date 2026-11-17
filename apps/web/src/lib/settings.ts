import { prisma } from "@events/db";

export async function getSettings() {
  return prisma.platformSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
