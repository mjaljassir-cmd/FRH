import { ZodError } from "zod";
import { HttpError } from "./auth";
import { UploadError } from "./storage";

export interface ActionState {
  ok?: boolean;
  error?: string;
  detail?: string;
}

/** Run a server action body, mapping known errors into ActionState. Re-throws Next.js redirects. */
export async function safeAction(fn: () => Promise<void | ActionState>): Promise<ActionState> {
  try {
    const r = await fn();
    return r ?? { ok: true };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) {
      throw err;
    }
    if (err instanceof HttpError) return { error: err.code };
    if (err instanceof UploadError) return { error: err.message };
    if (err instanceof ZodError) {
      const issue = err.issues[0];
      return { error: "VALIDATION_ERROR", detail: issue?.path.join(".") };
    }
    console.error(err);
    return { error: "GENERIC" };
  }
}
