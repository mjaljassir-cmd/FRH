"use server";

import { z } from "zod";
import { prisma } from "@events/db";
import { emailSchema, forgotPasswordSchema, passwordSchema, resetPasswordSchema, loginSchema } from "@events/shared";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { HttpError, clearSessionCookie, hashPassword, setSessionCookie, signToken, verifyPassword } from "@/lib/auth";
import { safeAction, type ActionState } from "@/lib/action-state";
import { formUploadUrl } from "@/lib/storage";
import { homeFor } from "@/lib/session";
import { completePasswordReset, startPasswordReset } from "@/lib/password-reset";

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = await getLocale();
  let dest = "";
  const res = await safeAction(async () => {
    const body = loginSchema.parse({ email: fd.get("email"), password: fd.get("password") });
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || user.role === "CUSTOMER" || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new HttpError(401, "INVALID_CREDENTIALS");
    }
    if (!user.isActive) throw new HttpError(403, "ACCOUNT_SUSPENDED");
    await setSessionCookie(await signToken(user));
    const next = String(fd.get("next") ?? "");
    dest = next.startsWith(`/${locale}/`) ? next.slice(locale.length + 1) : homeFor(user.role);
  });
  if (dest) redirect({ href: dest, locale });
  return res;
}

export async function logoutAction() {
  const locale = await getLocale();
  await clearSessionCookie();
  redirect({ href: "/login", locale });
}

const organizerRegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  phone: z.string().trim().min(8).max(20),
  password: passwordSchema,
  orgName: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  commercialRegNumber: z.string().trim().min(5).max(30),
  iban: z
    .string()
    .trim()
    .transform((s) => s.replace(/\s+/g, "").toUpperCase())
    .pipe(z.string().regex(/^SA\d{22}$/)),
  bankName: z.string().trim().min(2).max(100),
  accountHolderName: z.string().trim().min(2).max(150),
});

export async function registerOrganizerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = await getLocale();
  let done = false;
  const res = await safeAction(async () => {
    const body = organizerRegisterSchema.parse(Object.fromEntries(fd));
    const docUrl = formUploadUrl(fd, "commercialRegFileUrl", "docs");
    if (!docUrl) throw new HttpError(400, "FILE_REQUIRED");
    const logoUrl = formUploadUrl(fd, "logoUrl", "organizers");
    if (await prisma.user.findUnique({ where: { email: body.email } })) throw new HttpError(409, "EMAIL_TAKEN");
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        role: "ORGANIZER",
        locale: locale === "en" ? "en" : "ar",
        passwordHash: await hashPassword(body.password),
        organizer: {
          create: {
            name: body.orgName,
            description: body.description || null,
            logoUrl,
            commercialRegNumber: body.commercialRegNumber,
            commercialRegFileUrl: docUrl,
            iban: body.iban,
            bankName: body.bankName,
            accountHolderName: body.accountHolderName,
          },
        },
      },
    });
    await setSessionCookie(await signToken(user));
    done = true;
  });
  if (done) redirect({ href: "/organizer", locale });
  return res;
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const body = forgotPasswordSchema.parse({ email: fd.get("email") });
    await startPasswordReset(body.email, "web");
  });
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const body = resetPasswordSchema.parse({ token: fd.get("token"), password: fd.get("password") });
    if (fd.get("password") !== fd.get("confirm")) throw new HttpError(400, "PASSWORDS_DONT_MATCH");
    if (!(await completePasswordReset(body.token, body.password))) throw new HttpError(400, "INVALID_OR_EXPIRED_TOKEN");
  });
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { requireUser } = await import("@/lib/auth");
  return safeAction(async () => {
    const user = await requireUser("ADMIN", "ORGANIZER", "STAFF");
    const current = String(fd.get("current") ?? "");
    const next = passwordSchema.parse(fd.get("password"));
    if (fd.get("password") !== fd.get("confirm")) throw new HttpError(400, "PASSWORDS_DONT_MATCH");
    if (!(await verifyPassword(current, user.passwordHash))) throw new HttpError(400, "WRONG_PASSWORD");
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() },
    });
    await setSessionCookie(await signToken(updated));
  });
}
