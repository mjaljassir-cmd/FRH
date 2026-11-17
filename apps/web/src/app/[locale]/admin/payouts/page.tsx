import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/ui";
import { fmtDate, fmtMoney } from "@/lib/i18n-helpers";
import { organizerBalance } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function AdminPayouts({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.payouts");
  const c = await getTranslations("common");
  const organizers = await prisma.organizer.findMany({ where: { status: { in: ["APPROVED", "SUSPENDED"] } }, orderBy: { name: "asc" } });
  const balances = await Promise.all(organizers.map(async (o) => ({ o, b: await organizerBalance(o.id) })));
  const recent = await prisma.payout.findMany({
    include: { organizer: true, createdBy: { select: { name: true } } },
    orderBy: { transferredAt: "desc" },
    take: 100,
  });
  const m = (v: number) => fmtMoney(v, locale);
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="card mb-8 overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>{t("organizer")}</th>
              <th>{t("iban")}</th>
              <th>{t("net")}</th>
              <th>{t("paidOut")}</th>
              <th>{t("due")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {balances.map(({ o, b }) => (
              <tr key={o.id}>
                <td>{o.name}</td>
                <td dir="ltr" className="text-xs">
                  {o.iban}
                  <div className="text-slate-500">{o.bankName} — {o.accountHolderName}</div>
                </td>
                <td>{m(b.net)}</td>
                <td>{m(b.paidOut)}</td>
                <td className={b.due > 0 ? "font-bold text-emerald-700" : ""}>{m(b.due)}</td>
                <td>
                  <Link href={`/admin/organizers/${o.id}`} className="btn-secondary btn-sm">
                    {t("recordPayout")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mb-3 text-lg font-bold">{t("history")}</h2>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>{t("date")}</th>
              <th>{t("organizer")}</th>
              <th>{t("amount")}</th>
              <th>{t("reference")}</th>
              <th>{t("by")}</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-slate-500">
                  {c("noResults")}
                </td>
              </tr>
            )}
            {recent.map((p) => (
              <tr key={p.id}>
                <td>{fmtDate(p.transferredAt, locale)}</td>
                <td>{p.organizer.name}</td>
                <td>{m(p.amount)}</td>
                <td dir="ltr">{p.reference}</td>
                <td>{p.createdBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
