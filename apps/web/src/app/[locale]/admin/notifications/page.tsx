import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { Field, PageHeader } from "@/components/ui";
import { fmtDate, loc } from "@/lib/i18n-helpers";
import { sendNotificationAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminNotifications({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.notifications");
  const [cities, categories, events, log] = await Promise.all([
    prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.event.findMany({ where: { status: "PUBLISHED" }, orderBy: { startAt: "asc" }, take: 200 }),
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { city: true, category: true } }),
  ]);
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-2">
          <ActionForm action={sendNotificationAction} successMessage={t("sent")} resetOnSuccess>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("titleAr")}>
                <input name="titleAr" required maxLength={100} className="input" dir="rtl" />
              </Field>
              <Field label={t("titleEn")}>
                <input name="titleEn" required maxLength={100} className="input" dir="ltr" />
              </Field>
            </div>
            <Field label={t("bodyAr")}>
              <textarea name="bodyAr" required maxLength={500} rows={3} className="input" dir="rtl" />
            </Field>
            <Field label={t("bodyEn")}>
              <textarea name="bodyEn" required maxLength={500} rows={3} className="input" dir="ltr" />
            </Field>
            <Field label={t("target")}>
              <select name="target" className="input" defaultValue="ALL">
                <option value="ALL">{t("targets.ALL")}</option>
                <option value="CITY">{t("targets.CITY")}</option>
                <option value="CATEGORY">{t("targets.CATEGORY")}</option>
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("city")} hint={t("cityHint")}>
                <select name="cityId" className="input" defaultValue="">
                  <option value="">—</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {loc(c, "name", locale)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("category")} hint={t("categoryHint")}>
                <select name="categoryId" className="input" defaultValue="">
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {loc(c, "name", locale)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t("linkEvent")} hint={t("linkEventHint")}>
              <select name="eventId" className="input" defaultValue="">
                <option value="">—</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {loc(e, "title", locale)}
                  </option>
                ))}
              </select>
            </Field>
            <SubmitButton className="btn-primary w-full" confirm={t("confirmSend")}>
              {t("send")}
            </SubmitButton>
          </ActionForm>
        </div>
        <div className="lg:col-span-3">
          <h2 className="mb-3 font-bold">{t("log")}</h2>
          <div className="space-y-3">
            {log.map((n) => (
              <div key={n.id} className="card p-4">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>
                    {t(`targets.${n.target}`)}
                    {n.city ? ` — ${loc(n.city, "name", locale)}` : ""}
                    {n.category ? ` — ${loc(n.category, "name", locale)}` : ""}
                  </span>
                  <span>{fmtDate(n.createdAt, locale)}</span>
                </div>
                <div className="mt-1 font-semibold">{loc(n, "title", locale)}</div>
                <div className="text-sm text-slate-600">{loc(n, "body", locale)}</div>
                <div className="mt-1 text-xs text-slate-500">{t("devices", { count: n.recipients })}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
