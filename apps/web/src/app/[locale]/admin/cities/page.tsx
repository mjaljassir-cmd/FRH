import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { PageHeader } from "@/components/ui";
import { saveCityAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminCities({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.lookups");
  const c = await getTranslations("common");
  const items = await prisma.city.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] });
  return (
    <>
      <PageHeader title={t("citiesTitle")} subtitle={t("citiesHint")} />
      <div className="card mb-6">
        <h2 className="mb-3 font-bold">{t("add")}</h2>
        <ActionForm action={saveCityAction} className="grid items-end gap-3 sm:grid-cols-6" resetOnSuccess>
          <input name="nameAr" required placeholder={t("nameAr")} className="input" dir="rtl" />
          <input name="nameEn" required placeholder={t("nameEn")} className="input" dir="ltr" />
          <input name="lat" placeholder={t("lat")} className="input" dir="ltr" />
          <input name="lng" placeholder={t("lng")} className="input" dir="ltr" />
          <input name="sortOrder" type="number" defaultValue={0} placeholder={t("sortOrder")} className="input" />
          <SubmitButton>{t("add")}</SubmitButton>
        </ActionForm>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <ActionForm key={it.id} action={saveCityAction} className="card grid items-center gap-3 p-3 sm:grid-cols-7">
            <input type="hidden" name="id" value={it.id} />
            <input name="nameAr" defaultValue={it.nameAr} required className="input" dir="rtl" />
            <input name="nameEn" defaultValue={it.nameEn} required className="input" dir="ltr" />
            <input name="lat" defaultValue={it.lat ?? ""} className="input" dir="ltr" />
            <input name="lng" defaultValue={it.lng ?? ""} className="input" dir="ltr" />
            <input name="sortOrder" type="number" defaultValue={it.sortOrder} className="input" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={it.isActive} /> {t("active")}
            </label>
            <SubmitButton className="btn-secondary">{c("save")}</SubmitButton>
          </ActionForm>
        ))}
      </div>
    </>
  );
}
