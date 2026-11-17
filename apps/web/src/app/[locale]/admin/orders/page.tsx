import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma, type OrderStatus } from "@events/db";
import { Link } from "@/i18n/navigation";
import { Badge, Empty, PageHeader, statusColor } from "@/components/ui";
import { fmtDate, fmtMoney, loc } from "@/lib/i18n-helpers";

export const dynamic = "force-dynamic";
const STATUSES = ["PAID", "PENDING", "REFUNDED", "FAILED", "EXPIRED"] as const;

export default async function AdminOrders({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string; eventId?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("admin.orders");
  const ts = await getTranslations("status");
  const c = await getTranslations("common");
  const status = STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const receipt = sp.q && /^\d+$/.test(sp.q) ? Number(sp.q) : undefined;
  const items = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(sp.eventId ? { eventId: sp.eventId } : {}),
      ...(sp.q
        ? {
            OR: [
              ...(receipt ? [{ receiptNumber: receipt }] : []),
              { user: { email: { contains: sp.q, mode: "insensitive" as const } } },
              { user: { name: { contains: sp.q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: { user: true, event: { include: { organizer: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <>
      <PageHeader title={t("title")} />
      <form className="mb-4 flex flex-wrap gap-2">
        {sp.eventId && <input type="hidden" name="eventId" value={sp.eventId} />}
        <input name="q" defaultValue={sp.q} placeholder={t("searchHint")} className="input max-w-xs" />
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
                <th>#</th>
                <th>{t("customer")}</th>
                <th>{t("event")}</th>
                <th>{t("total")}</th>
                <th>{t("vat")}</th>
                <th>{t("commission")}</th>
                <th>{t("net")}</th>
                <th>{c("status")}</th>
                <th>{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id}>
                  <td>{o.receiptNumber}</td>
                  <td>
                    <div>{o.user.name}</div>
                    <div className="text-xs text-slate-500" dir="ltr">
                      {o.user.email}
                    </div>
                  </td>
                  <td>
                    <Link href={`/admin/events/${o.eventId}`} className="text-brand-600 hover:underline">
                      {loc(o.event, "title", locale)}
                    </Link>
                    <div className="text-xs text-slate-500">{o.event.organizer.name}</div>
                  </td>
                  <td>{fmtMoney(o.totalAmount, locale)}</td>
                  <td>{fmtMoney(o.vatAmount, locale)}</td>
                  <td>
                    {fmtMoney(o.commissionAmount, locale)} <span className="text-xs text-slate-500">({Number(o.commissionRate)}%)</span>
                  </td>
                  <td>{fmtMoney(o.organizerNet, locale)}</td>
                  <td>
                    <Badge color={statusColor[o.status]}>{ts(o.status)}</Badge>
                  </td>
                  <td className="whitespace-nowrap">{fmtDate(o.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
