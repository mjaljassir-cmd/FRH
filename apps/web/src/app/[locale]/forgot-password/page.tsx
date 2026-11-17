import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { Field } from "@/components/ui";
import { AuthShell } from "../auth-shell";
import { forgotPasswordAction } from "../auth-actions";

export default async function ForgotPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("forgotTitle")}>
      <ActionForm action={forgotPasswordAction} successMessage={t("forgotSent")}>
        <Field label={t("email")}>
          <input name="email" type="email" required className="input" dir="ltr" />
        </Field>
        <SubmitButton className="btn-primary w-full">{t("sendResetLink")}</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
