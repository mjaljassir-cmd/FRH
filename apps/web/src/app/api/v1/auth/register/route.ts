import { prisma } from "@events/db";
import { customerRegisterSchema } from "@events/shared";
import { HttpError, hashPassword, signToken } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/api";
import { serializeMe } from "@/lib/serialize";

export const POST = route(async (req) => {
  const body = await parseBody(req, customerRegisterSchema);
  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) throw new HttpError(409, "EMAIL_TAKEN");
  if (body.cityId) {
    const city = await prisma.city.findUnique({ where: { id: body.cityId } });
    if (!city) throw new HttpError(400, "INVALID_CITY");
  }
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      cityId: body.cityId || null,
      locale: body.locale,
      role: "CUSTOMER",
      passwordHash: await hashPassword(body.password),
    },
  });
  return json({ token: await signToken(user), user: serializeMe(user) }, { status: 201 });
});
