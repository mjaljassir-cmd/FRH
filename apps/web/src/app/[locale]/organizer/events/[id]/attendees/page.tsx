import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { Badge, Empty, PageHeader, statusColor } from "@/components/ui";
import { fmtDate, fmtMoney, loc } from "@/lib/i18n-helpers";
import { requireOrganizerPage } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Attendees({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { organizer } = await requireOrganizerPage(locale, { approved: true });
  const t = await getTranslations("organizer.attendees");
  const ts = await getTranslations("status");
  const e = await prisma.event.findFirst({ where: { id, organizerId: organizer.id } });
  if (!e) notFound();
  const orders = await prisma.order.findMany({
    where: { eventId: id, status: { in: ["PAID", "REFUNDED"] } },
    include: { user: true, tickets: { include: { orderItem: { include: { ticketType: true } } } } },
    orderBy: { paidAt: "desc" },
  });
  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={loc(e, "title", locale)}
        actions={
          <a href={`/api/organizer/events/${id}/attendees?locale=${locale}`} className="btn-secondary">
            {t("exportCsv")}
          </a>
        }
      />
      {orders.length === 0 ? (
        <Empty>{t("empty")}</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t("name")}</th>
                <th>{t("email")}</th>
                <th>{t("phone")}</th>
                <th>{t("tickets")}</th>
                <th>{t("total")}</th>
                <th>{t("orderStatus")}</th>
                <th>{t("checkedIn")}</th>
                <th>{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const types = new Map<string, number>();
                for (const tk of o.tickets) {
                  const n = loc(tk.orderItem.ticketType, "name", locale);
                  types.set(n, (types.get(n) ?? 0) + 1);
                }
                return (
                  <tr key={o.id}>
                    <td>{o.receiptNumber}</td>
                    <td>{o.user.name}</td>
                    <td dir="ltr">{o.user.email}</td>
                    <td dir="ltr">{o.user.phone}</td>
                    <td className="text-xs">
                      {[...types.entries()].map(([n, c]) => (
                        <div key={n}>
                          {n} × {c}
                        </div>
                      ))}
                    </td>
                    <td>{fmtMoney(o.totalAmount, locale)}</td>
                    <td>
                      <Badge color={statusColor[o.status]}>{ts(o.status)}</Badge>
                    </td>
                    <td>
                      {o.tickets.filter((tk) => tk.status === "USED").length} / {o.tickets.length}
                    </td>
                    <td className="whitespace-nowrap">{o.paidAt ? fmtDate(o.paidAt, locale) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
