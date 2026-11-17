import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { Field } from "@/components/ui";
import { FileUpload } from "@/components/file-upload";
import { AuthShell } from "../auth-shell";
import { registerOrganizerAction } from "../auth-actions";

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("registerTitle")} wide>
      <p className="mb-5 text-sm text-slate-600">{t("registerIntro")}</p>
      <ActionForm action={registerOrganizerAction}>
        <h2 className="font-semibold text-slate-800">{t("sectionAccount")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fullName")}>
            <input name="name" required className="input" />
          </Field>
          <Field label={t("phone")}>
            <input name="phone" required className="input" dir="ltr" placeholder="05XXXXXXXX" />
          </Field>
          <Field label={t("email")}>
            <input name="email" type="email" required className="input" dir="ltr" />
          </Field>
          <Field label={t("password")} hint={t("passwordHint")}>
            <input name="password" type="password" required minLength={8} className="input" dir="ltr" />
          </Field>
        </div>
        <h2 className="pt-2 font-semibold text-slate-800">{t("sectionOrganization")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("orgName")}>
            <input name="orgName" required className="input" />
          </Field>
          <Field label={t("commercialRegNumber")}>
            <input name="commercialRegNumber" required className="input" dir="ltr" />
          </Field>
          <Field label={t("commercialRegFile")} hint={t("fileHint")}>
            <FileUpload name="commercialRegFileUrl" folder="docs" accept="application/pdf,image/jpeg,image/png,image/webp" testId="upload-cr" />
          </Field>
          <Field label={t("logo")} hint={t("optional")}>
            <FileUpload name="logoUrl" folder="organizers" accept="image/jpeg,image/png,image/webp" />
          </Field>
        </div>
        <Field label={t("orgDescription")} hint={t("optional")}>
          <textarea name="description" rows={3} className="input" />
        </Field>
        <h2 className="pt-2 font-semibold text-slate-800">{t("sectionBank")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("bankName")}>
            <input name="bankName" required className="input" />
          </Field>
          <Field label={t("accountHolderName")}>
            <input name="accountHolderName" required className="input" />
          </Field>
          <Field label={t("iban")} hint="SA0000000000000000000000">
            <input name="iban" required className="input" dir="ltr" />
          </Field>
        </div>
        <SubmitButton className="btn-primary w-full">{t("registerButton")}</SubmitButton>
        <p className="text-center text-sm">
          <Link href="/login" className="text-brand-600 hover:underline">
            {t("haveAccount")}
          </Link>
        </p>
      </ActionForm>
    </AuthShell>
  );
}
