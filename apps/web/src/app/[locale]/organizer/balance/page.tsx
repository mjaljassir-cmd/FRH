import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { PageHeader, Stat } from "@/components/ui";
import { fmtDate, fmtMoney, loc } from "@/lib/i18n-helpers";
import { organizerBalance } from "@/lib/orders";
import { requireOrganizerPage } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Balance({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { organizer } = await requireOrganizerPage(locale, { approved: true });
  const t = await getTranslations("organizer.balance");
  const c = await getTranslations("common");
  const bal = await organizerBalance(organizer.id);
  const [payouts, perEvent] = await Promise.all([
    prisma.payout.findMany({ where: { organizerId: organizer.id }, orderBy: { transferredAt: "desc" } }),
    prisma.order.groupBy({
      by: ["eventId"],
      where: { status: "PAID", event: { organizerId: organizer.id } },
      _sum: { totalAmount: true, commissionAmount: true, organizerNet: true, vatAmount: true },
      _count: true,
    }),
  ]);
  const events = await prisma.event.findMany({ where: { id: { in: perEvent.map((p) => p.eventId) } } });
  const m = (v: number | null | undefined) => fmtMoney(v ?? 0, locale);
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle", { rate: Number(organizer.commissionRate) })} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label={t("gross")} value={m(bal.gross)} />
        <Stat label={t("vat")} value={m(bal.vat)} />
        <Stat label={t("commission")} value={m(bal.commission)} />
        <Stat label={t("paidOut")} value={m(bal.paidOut)} />
        <Stat label={t("due")} value={m(bal.due)} />
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold">{t("byEvent")}</h2>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>{t("event")}</th>
              <th>{t("orders")}</th>
              <th>{t("gross")}</th>
              <th>{t("commission")}</th>
              <th>{t("net")}</th>
            </tr>
          </thead>
          <tbody>
            {perEvent.map((p) => {
              const e = events.find((x) => x.id === p.eventId);
              return (
                <tr key={p.eventId}>
                  <td>{e ? loc(e, "title", locale) : p.eventId}</td>
                  <td>{p._count}</td>
                  <td>{m(p._sum.totalAmount)}</td>
                  <td>{m(p._sum.commissionAmount)}</td>
                  <td>{m(p._sum.organizerNet)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold">{t("payouts")}</h2>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>{t("date")}</th>
              <th>{t("amount")}</th>
              <th>{t("reference")}</th>
              <th>{t("note")}</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-slate-500">
                  {c("noResults")}
                </td>
              </tr>
            )}
            {payouts.map((p) => (
              <tr key={p.id}>
                <td>{fmtDate(p.transferredAt, locale)}</td>
                <td>{m(p.amount)}</td>
                <td dir="ltr">{p.reference}</td>
                <td>{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
