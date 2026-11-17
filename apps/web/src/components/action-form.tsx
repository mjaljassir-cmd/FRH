"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/action-state";

/** A <form> bound to a server action that returns ActionState; shows translated errors/success. */
export function ActionForm({
  action,
  children,
  className = "space-y-4",
  successMessage,
  resetOnSuccess = false,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {} as ActionState);
  const t = useTranslations("errors");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {t.has(state.error) ? t(state.error) : t("GENERIC")}
          {state.detail ? ` (${state.detail})` : ""}
        </div>
      )}
      {state.ok && successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}
      {children}
    </form>
  );
}
