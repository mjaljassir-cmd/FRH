import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma, type RefundStatus } from "@events/db";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { Badge, Empty, PageHeader, statusColor } from "@/components/ui";
import { fmtDate, fmtMoney, loc } from "@/lib/i18n-helpers";
import { retryRefundAction } from "../actions";

export const dynamic = "force-dynamic";
const STATUSES = ["COMPLETED", "FAILED", "PENDING"] as const;

export default async function AdminRefunds({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("admin.refunds");
  const ts = await getTranslations("status");
  const c = await getTranslations("common");
  const status = STATUSES.includes(sp.status as RefundStatus) ? (sp.status as RefundStatus) : undefined;
  const items = await prisma.refund.findMany({
    where: status ? { status } : {},
    include: { order: { include: { user: true, event: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <>
      <PageHeader title={t("title")} />
      <form className="mb-4 flex gap-2">
        <select name="status" defaultValue={status ?? ""} className="input max-w-[12rem]">
          <option value="">{c("all")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {ts(s)}
            </option>
          ))}
        </select>
        <button className="btn-secondary">{c("filter")}</button>
      </form>
      {items.length === 0 ? (
        <Empty>{c("noResults")}</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>{t("order")}</th>
                <th>{t("customer")}</th>
                <th>{t("event")}</th>
                <th>{t("amount")}</th>
                <th>{t("reason")}</th>
                <th>{c("status")}</th>
                <th>{t("date")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>#{r.order.receiptNumber}</td>
                  <td>{r.order.user.name}</td>
                  <td>{loc(r.order.event, "title", locale)}</td>
                  <td>{fmtMoney(r.amount, locale)}</td>
                  <td>{t(`reasons.${r.reason}`)}</td>
                  <td>
                    <Badge color={statusColor[r.status]}>{ts(r.status)}</Badge>
                    {r.errorMessage && <div className="mt-1 max-w-xs truncate text-xs text-red-600" title={r.errorMessage}>{r.errorMessage}</div>}
                  </td>
                  <td className="whitespace-nowrap">{fmtDate(r.createdAt, locale)}</td>
                  <td>
                    {r.status === "FAILED" && r.order.status === "PAID" && (
                      <ActionForm action={retryRefundAction} className="">
                        <input type="hidden" name="id" value={r.id} />
                        <SubmitButton className="btn-secondary btn-sm">{t("retry")}</SubmitButton>
                      </ActionForm>
                    )}
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
