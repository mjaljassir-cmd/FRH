import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { Field } from "@/components/ui";
import { AuthShell } from "../auth-shell";
import { resetPasswordAction } from "../auth-actions";

export default async function ResetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; app?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token, app } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("resetTitle")}>
      <ActionForm action={resetPasswordAction} successMessage={app ? t("resetDoneApp") : t("resetDone")}>
        <input type="hidden" name="token" value={token ?? ""} />
        <Field label={t("newPassword")} hint={t("passwordHint")}>
          <input name="password" type="password" required minLength={8} className="input" dir="ltr" />
        </Field>
        <Field label={t("confirmPassword")}>
          <input name="confirm" type="password" required minLength={8} className="input" dir="ltr" />
        </Field>
        <SubmitButton className="btn-primary w-full">{t("resetButton")}</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
