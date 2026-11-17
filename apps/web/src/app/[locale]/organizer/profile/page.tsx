import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { ChangePasswordCard } from "@/components/change-password";
import { Field, PageHeader } from "@/components/ui";
import { requireOrganizerPage } from "@/lib/session";
import { updateOrganizerProfileAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function Profile({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { organizer } = await requireOrganizerPage(locale);
  const t = await getTranslations("auth");
  const p = await getTranslations("organizer.profile");
  const c = await getTranslations("common");
  return (
    <>
      <PageHeader title={p("title")} subtitle={organizer.status === "REJECTED" ? p("resubmitHint") : undefined} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <ActionForm action={updateOrganizerProfileAction} successMessage={c("saved")}>
            {organizer.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={organizer.logoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
            )}
            <Field label={t("orgName")}>
              <input name="name" defaultValue={organizer.name} required className="input" />
            </Field>
            <Field label={t("orgDescription")}>
              <textarea name="description" defaultValue={organizer.description ?? ""} rows={3} className="input" />
            </Field>
            <Field label={t("logo")} hint={t("optional")}>
              <input name="logo" type="file" accept="image/*" className="input" />
            </Field>
            <Field label={t("commercialRegNumber")}>
              <input value={organizer.commercialRegNumber} disabled className="input" dir="ltr" />
            </Field>
            <Field label={t("commercialRegFile")} hint={p("replaceFileHint")}>
              <input name="commercialRegFile" type="file" accept=".pdf,image/*" className="input" />
            </Field>
            <Field label={t("bankName")}>
              <input name="bankName" defaultValue={organizer.bankName} required className="input" />
            </Field>
            <Field label={t("accountHolderName")}>
              <input name="accountHolderName" defaultValue={organizer.accountHolderName} required className="input" />
            </Field>
            <Field label={t("iban")}>
              <input name="iban" defaultValue={organizer.iban} required className="input" dir="ltr" />
            </Field>
            <SubmitButton>{c("save")}</SubmitButton>
          </ActionForm>
        </div>
        <ChangePasswordCard />
      </div>
    </>
  );
}
