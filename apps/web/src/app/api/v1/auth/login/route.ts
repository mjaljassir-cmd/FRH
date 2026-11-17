import { prisma } from "@events/db";
import { loginSchema } from "@events/shared";
import { HttpError, signToken, verifyPassword } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/api";
import { serializeMe } from "@/lib/serialize";

export const POST = route(async (req) => {
  const body = await parseBody(req, loginSchema);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || user.role !== "CUSTOMER" || !(await verifyPassword(body.password, user.passwordHash))) {
    throw new HttpError(401, "INVALID_CREDENTIALS");
  }
  if (!user.isActive) throw new HttpError(403, "ACCOUNT_SUSPENDED");
  return json({ token: await signToken(user), user: serializeMe(user) });
});
