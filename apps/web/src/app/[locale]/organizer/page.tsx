import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { Link } from "@/i18n/navigation";
import { Alert, PageHeader, Stat } from "@/components/ui";
import { fmtDate, fmtMoney, loc } from "@/lib/i18n-helpers";
import { organizerBalance } from "@/lib/orders";
import { requireOrganizerPage } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OrganizerDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { organizer } = await requireOrganizerPage(locale);
  const t = await getTranslations("organizer.dashboard");

  if (organizer.status !== "APPROVED") {
    return (
      <>
        <PageHeader title={organizer.name} />
        {organizer.status === "PENDING" && <Alert kind="warning">{t("pending")}</Alert>}
        {organizer.status === "REJECTED" && (
          <Alert kind="error">
            {t("rejected")} {organizer.rejectionReason && <strong>{organizer.rejectionReason}</strong>}
            <div className="mt-2">
              <Link href="/organizer/profile" className="underline">
                {t("updateProfile")}
              </Link>
            </div>
          </Alert>
        )}
        {organizer.status === "SUSPENDED" && <Alert kind="error">{t("suspended")}</Alert>}
      </>
    );
  }

  const now = new Date();
  const [bal, upcoming, pendingReview, ticketsSold] = await Promise.all([
    organizerBalance(organizer.id),
    prisma.event.findMany({
      where: { organizerId: organizer.id, status: "PUBLISHED", endAt: { gt: now } },
      orderBy: { startAt: "asc" },
      take: 5,
      include: { ticketTypes: true },
    }),
    prisma.event.count({ where: { organizerId: organizer.id, status: "PENDING_REVIEW" } }),
    prisma.ticket.count({ where: { order: { status: "PAID", event: { organizerId: organizer.id } } } }),
  ]);
  const m = (v: number) => fmtMoney(v, locale);

  return (
    <>
      <PageHeader
        title={organizer.name}
        actions={
          <Link href="/organizer/events/new" className="btn-primary">
            {t("newEvent")}
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("sales")} value={m(bal.gross)} sub={t("ordersCount", { count: bal.orders })} />
        <Stat label={t("net")} value={m(bal.net)} sub={t("commissionRate", { rate: Number(organizer.commissionRate) })} />
        <Stat label={t("due")} value={m(bal.due)} />
        <Stat label={t("ticketsSold")} value={ticketsSold} sub={pendingReview ? t("pendingReview", { count: pendingReview }) : undefined} />
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold">{t("upcoming")}</h2>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <tbody>
            {upcoming.length === 0 && (
              <tr>
                <td className="text-center text-slate-500">{t("noUpcoming")}</td>
              </tr>
            )}
            {upcoming.map((e) => {
              const sold = e.ticketTypes.reduce((s, x) => s + x.sold, 0);
              const cap = e.ticketTypes.reduce((s, x) => s + x.quantity, 0);
              return (
                <tr key={e.id}>
                  <td>
                    <Link href={`/organizer/events/${e.id}`} className="font-medium text-brand-600 hover:underline">
                      {loc(e, "title", locale)}
                    </Link>
                  </td>
                  <td>{fmtDate(e.startAt, locale)}</td>
                  <td>
                    {sold} / {cap}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
