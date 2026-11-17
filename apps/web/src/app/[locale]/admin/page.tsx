import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { Link } from "@/i18n/navigation";
import { PageHeader, Stat } from "@/components/ui";
import { fmtMoney } from "@/lib/i18n-helpers";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.dashboard");
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [all, month, customers, organizers, pendingOrgs, published, pendingEvents, failedRefunds, payouts] = await Promise.all([
    prisma.order.aggregate({ where: { status: "PAID" }, _sum: { totalAmount: true, commissionAmount: true, vatAmount: true, organizerNet: true }, _count: true }),
    prisma.order.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { totalAmount: true, commissionAmount: true }, _count: true }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.organizer.count({ where: { status: "APPROVED" } }),
    prisma.organizer.count({ where: { status: "PENDING" } }),
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.event.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.refund.count({ where: { status: "FAILED" } }),
    prisma.payout.aggregate({ _sum: { amount: true } }),
  ]);
  const m = (v: number | null | undefined) => fmtMoney(v ?? 0, locale);
  const due = (all._sum.organizerNet ?? 0) - (payouts._sum.amount ?? 0);

  return (
    <>
      <PageHeader title={t("title")} />
      {(pendingOrgs > 0 || pendingEvents > 0 || failedRefunds > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {pendingOrgs > 0 && (
            <Link href="/admin/organizers?status=PENDING" className="btn-secondary">
              {t("pendingOrganizers", { count: pendingOrgs })}
            </Link>
          )}
          {pendingEvents > 0 && (
            <Link href="/admin/events?status=PENDING_REVIEW" className="btn-secondary">
              {t("pendingEvents", { count: pendingEvents })}
            </Link>
          )}
          {failedRefunds > 0 && (
            <Link href="/admin/refunds?status=FAILED" className="btn-danger">
              {t("failedRefunds", { count: failedRefunds })}
            </Link>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("totalSales")} value={m(all._sum.totalAmount)} sub={t("ordersCount", { count: all._count })} />
        <Stat label={t("totalCommission")} value={m(all._sum.commissionAmount)} />
        <Stat label={t("monthSales")} value={m(month._sum.totalAmount)} sub={t("ordersCount", { count: month._count })} />
        <Stat label={t("monthCommission")} value={m(month._sum.commissionAmount)} />
        <Stat label={t("vatCollected")} value={m(all._sum.vatAmount)} />
        <Stat label={t("dueToOrganizers")} value={m(due)} />
        <Stat label={t("customers")} value={customers} />
        <Stat label={t("organizersPublished")} value={`${organizers} / ${published}`} sub={t("organizersPublishedSub")} />
      </div>
    </>
  );
}
