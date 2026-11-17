import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { PageHeader } from "@/components/ui";
import { saveCategoryAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminCategories({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.lookups");
  const c = await getTranslations("common");
  const items = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }] });
  return (
    <>
      <PageHeader title={t("categoriesTitle")} />
      <div className="card mb-6">
        <h2 className="mb-3 font-bold">{t("add")}</h2>
        <ActionForm action={saveCategoryAction} className="grid items-end gap-3 sm:grid-cols-4" resetOnSuccess>
          <input name="nameAr" required placeholder={t("nameAr")} className="input" dir="rtl" />
          <input name="nameEn" required placeholder={t("nameEn")} className="input" dir="ltr" />
          <input name="sortOrder" type="number" defaultValue={0} placeholder={t("sortOrder")} className="input" />
          <SubmitButton>{t("add")}</SubmitButton>
        </ActionForm>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <ActionForm key={it.id} action={saveCategoryAction} className="card grid items-center gap-3 p-3 sm:grid-cols-5">
            <input type="hidden" name="id" value={it.id} />
            <input name="nameAr" defaultValue={it.nameAr} required className="input" dir="rtl" />
            <input name="nameEn" defaultValue={it.nameEn} required className="input" dir="ltr" />
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
