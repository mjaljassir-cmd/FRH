import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { Field } from "@/components/ui";
import { AuthShell } from "../auth-shell";
import { loginAction } from "../auth-actions";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("loginTitle")}>
      <ActionForm action={loginAction}>
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label={t("email")}>
          <input name="email" type="email" required className="input" autoComplete="email" dir="ltr" />
        </Field>
        <Field label={t("password")}>
          <input name="password" type="password" required className="input" autoComplete="current-password" dir="ltr" />
        </Field>
        <SubmitButton className="btn-primary w-full">{t("loginButton")}</SubmitButton>
        <div className="flex justify-between text-sm">
          <Link href="/forgot-password" className="text-brand-600 hover:underline">
            {t("forgotPassword")}
          </Link>
          <Link href="/register" className="text-brand-600 hover:underline">
            {t("registerOrganizer")}
          </Link>
        </div>
      </ActionForm>
    </AuthShell>
  );
}
