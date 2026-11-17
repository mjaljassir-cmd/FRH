import { resetPasswordSchema } from "@events/shared";
import { HttpError } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/api";
import { completePasswordReset } from "@/lib/password-reset";

export const POST = route(async (req) => {
  const body = await parseBody(req, resetPasswordSchema);
  const ok = await completePasswordReset(body.token, body.password);
  if (!ok) throw new HttpError(400, "INVALID_OR_EXPIRED_TOKEN");
  return json({ ok: true });
});
