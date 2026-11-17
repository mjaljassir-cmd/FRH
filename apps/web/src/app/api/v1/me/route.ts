import { prisma } from "@events/db";
import { updateProfileSchema } from "@events/shared";
import { requireUser } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/api";
import { serializeMe } from "@/lib/serialize";

export const GET = route(async () => {
  const user = await requireUser("CUSTOMER");
  return json({ user: serializeMe(user) });
});

export const PATCH = route(async (req) => {
  const user = await requireUser("CUSTOMER");
  const body = await parseBody(req, updateProfileSchema);
  const updated = await prisma.user.update({ where: { id: user.id }, data: body });
  return json({ user: serializeMe(updated) });
});
