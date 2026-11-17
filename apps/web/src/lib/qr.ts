import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/** QR payload format: "T1.<ticketId>.<signature>" */
export function signTicket(ticketId: string): string {
  const sig = createHmac("sha256", env.qrSecret).update(ticketId).digest("base64url").slice(0, 24);
  return `T1.${ticketId}.${sig}`;
}

export function verifyTicketPayload(payload: string): string | null {
  const parts = payload.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "T1") return null;
  const [, ticketId, sig] = parts;
  const expected = signTicket(ticketId).split(".")[2];
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return ticketId;
}
