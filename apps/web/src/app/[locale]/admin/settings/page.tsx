import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { ChangePasswordCard } from "@/components/change-password";
import { Field, PageHeader } from "@/components/ui";
import { getSettings } from "@/lib/settings";
import { saveSettingsAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminSettings({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.settings");
  const c = await getTranslations("common");
  const s = await getSettings();
  return (
    <>
      <PageHeader title={t("title")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-1 font-bold">{t("receiptInfo")}</h2>
          <p className="mb-4 text-sm text-slate-500">{t("receiptInfoHint")}</p>
          <ActionForm action={saveSettingsAction} successMessage={c("saved")}>
            <Field label={t("nameAr")}>
              <input name="nameAr" defaultValue={s.nameAr} required className="input" dir="rtl" />
            </Field>
            <Field label={t("nameEn")}>
              <input name="nameEn" defaultValue={s.nameEn} required className="input" dir="ltr" />
            </Field>
            <Field label={t("vatNumber")}>
              <input name="vatNumber" defaultValue={s.vatNumber} className="input" dir="ltr" />
            </Field>
            <Field label={t("addressAr")}>
              <input name="addressAr" defaultValue={s.addressAr} className="input" dir="rtl" />
            </Field>
            <Field label={t("addressEn")}>
              <input name="addressEn" defaultValue={s.addressEn} className="input" dir="ltr" />
            </Field>
            <Field label={t("vatRate")} hint={t("vatRateHint")}>
              <input name="vatRate" type="number" step="0.01" defaultValue={Number(s.vatRate)} className="input" dir="ltr" />
            </Field>
            <SubmitButton>{c("save")}</SubmitButton>
          </ActionForm>
        </div>
        <ChangePasswordCard />
      </div>
    </>
  );
}
