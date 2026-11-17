import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { fmtDate, loc } from "@/lib/i18n-helpers";
import { setUserActiveAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminCustomers({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;
  const t = await getTranslations("admin.customers");
  const c = await getTranslations("common");
  const items = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }
        : {}),
    },
    include: { city: true, _count: { select: { orders: { where: { status: "PAID" } } } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <>
      <PageHeader title={t("title")} />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder={c("search")} className="input max-w-xs" />
        <button className="btn-secondary">{c("filter")}</button>
      </form>
      {items.length === 0 ? (
        <Empty>{c("noResults")}</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("email")}</th>
                <th>{t("phone")}</th>
                <th>{t("city")}</th>
                <th>{t("orders")}</th>
                <th>{t("joined")}</th>
                <th>{c("status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td dir="ltr">{u.email}</td>
                  <td dir="ltr">{u.phone}</td>
                  <td>{u.city ? loc(u.city, "name", locale) : "—"}</td>
                  <td>{u._count.orders}</td>
                  <td>{fmtDate(u.createdAt, locale, false)}</td>
                  <td>{u.isActive ? <Badge color="green">{t("active")}</Badge> : <Badge color="red">{t("suspended")}</Badge>}</td>
                  <td>
                    <ActionForm action={setUserActiveAction} className="">
                      <input type="hidden" name="id" value={u.id} />
                      {u.isActive ? (
                        <SubmitButton name="active" value="0" className="btn-secondary btn-sm" confirm={t("confirmSuspend")}>
                          {t("suspend")}
                        </SubmitButton>
                      ) : (
                        <SubmitButton name="active" value="1" className="btn-secondary btn-sm">
                          {t("activate")}
                        </SubmitButton>
                      )}
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
