import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

/** Short-lived token that lets the in-app browser open the payment page for one order. */
export async function paymentUrlFor(orderId: string, userId: string, locale: string) {
  const t = await new SignJWT({ oid: orderId, pay: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime("30m")
    .sign(env.jwtSecret);
  return `${env.appUrl}/${locale === "en" ? "en" : "ar"}/pay/${orderId}?t=${t}`;
}

export async function verifyPaymentToken(token: string, orderId: string) {
  try {
    const { payload } = await jwtVerify(token, env.jwtSecret);
    return payload.pay === 1 && payload.oid === orderId ? (payload.sub as string) : null;
  } catch {
    return null;
  }
}
