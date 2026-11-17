import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { prisma, type Role, type User } from "@events/db";
import { env } from "./env";

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function signToken(user: Pick<User, "id" | "role">) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(env.jwtSecret);
}

export async function verifyToken(token: string): Promise<{ userId: string; role: Role; iat: number } | null> {
  try {
    const { payload } = await jwtVerify(token, env.jwtSecret);
    if (!payload.sub) return null;
    return { userId: payload.sub, role: payload.role as Role, iat: payload.iat ?? 0 };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Load the active user from the bearer token (mobile) or the session cookie (web). */
export async function getCurrentUser(): Promise<User | null> {
  const h = await headers();
  const authz = h.get("authorization");
  let token: string | undefined;
  if (authz?.toLowerCase().startsWith("bearer ")) token = authz.slice(7).trim();
  else token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) return null;
  // Tokens issued before a password change are invalid.
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000) return null;
  return user;
}

export class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

/** Require a logged-in user with one of the given roles (throws HttpError). */
export async function requireUser(...roles: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "UNAUTHORIZED");
  if (roles.length && !roles.includes(user.role)) throw new HttpError(403, "FORBIDDEN");
  return user;
}
