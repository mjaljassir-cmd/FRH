import { prisma } from "@events/db";
import { pushTokenSchema } from "@events/shared";
import { requireUser } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/api";

export const POST = route(async (req) => {
  const user = await requireUser("CUSTOMER");
  const { token } = await parseBody(req, pushTokenSchema);
  await prisma.pushToken.upsert({ where: { token }, update: { userId: user.id }, create: { token, userId: user.id } });
  return json({ ok: true });
});

export const DELETE = route(async (req) => {
  const user = await requireUser("CUSTOMER");
  const { token } = await parseBody(req, pushTokenSchema);
  await prisma.pushToken.deleteMany({ where: { token, userId: user.id } });
  return json({ ok: true });
});
