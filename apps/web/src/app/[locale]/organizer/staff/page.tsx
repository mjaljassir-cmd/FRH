import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { Field, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/i18n-helpers";
import { requireOrganizerPage } from "@/lib/session";
import { addStaffAction, removeStaffAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function Staff({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { organizer } = await requireOrganizerPage(locale, { approved: true });
  const t = await getTranslations("organizer.staff");
  const staff = await prisma.staffMember.findMany({
    where: { organizerId: organizer.id },
    include: { user: { include: { _count: { select: { checkIns: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card">
          <h2 className="mb-3 font-bold">{t("add")}</h2>
          <ActionForm action={addStaffAction} successMessage={t("added")} resetOnSuccess>
            <Field label={t("name")}>
              <input name="name" required className="input" />
            </Field>
            <Field label={t("email")}>
              <input name="email" type="email" required className="input" dir="ltr" />
            </Field>
            <Field label={t("password")} hint={t("passwordHint")}>
              <input name="password" type="password" required minLength={8} className="input" dir="ltr" />
            </Field>
            <SubmitButton className="btn-primary w-full">{t("add")}</SubmitButton>
          </ActionForm>
        </div>
        <div className="card overflow-x-auto p-0 lg:col-span-2">
          <table className="table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("email")}</th>
                <th>{t("scans")}</th>
                <th>{t("added_at")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-500">
                    {t("empty")}
                  </td>
                </tr>
              )}
              {staff.map((s) => (
                <tr key={s.id}>
                  <td>{s.user.name}</td>
                  <td dir="ltr">{s.user.email}</td>
                  <td>{s.user._count.checkIns}</td>
                  <td>{fmtDate(s.createdAt, locale, false)}</td>
                  <td>
                    <ActionForm action={removeStaffAction} className="">
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton className="btn-danger btn-sm" confirm={t("confirmRemove")}>
                        {t("remove")}
                      </SubmitButton>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
