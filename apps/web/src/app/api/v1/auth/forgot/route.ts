import { forgotPasswordSchema } from "@events/shared";
import { json, parseBody, route } from "@/lib/api";
import { startPasswordReset } from "@/lib/password-reset";

export const POST = route(async (req) => {
  const body = await parseBody(req, forgotPasswordSchema);
  await startPasswordReset(body.email, "mobile");
  // Always succeed so the endpoint can't be used to discover accounts
  return json({ ok: true });
});
