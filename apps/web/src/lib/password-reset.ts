import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@events/db";
import { hashPassword } from "./auth";
import { env } from "./env";
import { sendMail } from "./mail";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Email a reset link. `channel` decides where the link opens (web page or mobile deep link). */
export async function startPasswordReset(email: string, channel: "web" | "mobile") {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;
  const token = randomBytes(32).toString("base64url");
  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash: sha(token), resetExpiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  const link =
    channel === "mobile"
      ? `${env.appUrl}/${user.locale}/reset-password?token=${token}&app=1`
      : `${env.appUrl}/${user.locale}/reset-password?token=${token}`;
  const ar = user.locale === "ar";
  await sendMail(
    user.email,
    ar ? "إعادة تعيين كلمة المرور" : "Reset your password",
    ar
      ? `مرحباً ${user.name}،\n\nلإعادة تعيين كلمة المرور افتح الرابط التالي (صالح لمدة ساعة):\n${link}\n\nإذا لم تطلب ذلك تجاهل هذه الرسالة.`
      : `Hi ${user.name},\n\nOpen this link to reset your password (valid for 1 hour):\n${link}\n\nIf you didn't request this, ignore this email.`,
  );
}

export async function completePasswordReset(token: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: sha(token), resetExpiresAt: { gt: new Date() } },
  });
  if (!user) return false;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      resetTokenHash: null,
      resetExpiresAt: null,
      passwordChangedAt: new Date(),
    },
  });
  return true;
}
