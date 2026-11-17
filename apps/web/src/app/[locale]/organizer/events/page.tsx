import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { Link } from "@/i18n/navigation";
import { Badge, Empty, PageHeader, statusColor } from "@/components/ui";
import { fmtDate, loc } from "@/lib/i18n-helpers";
import { requireOrganizerPage } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OrganizerEvents({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { organizer } = await requireOrganizerPage(locale, { approved: true });
  const t = await getTranslations("organizer.events");
  const ts = await getTranslations("status");
  const c = await getTranslations("common");
  const events = await prisma.event.findMany({
    where: { organizerId: organizer.id },
    orderBy: { startAt: "desc" },
    include: { ticketTypes: true, city: true },
  });
  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <Link href="/organizer/events/new" className="btn-primary">
            {t("new")}
          </Link>
        }
      />
      {events.length === 0 ? (
        <Empty>{t("empty")}</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>{t("event")}</th>
                <th>{t("city")}</th>
                <th>{t("date")}</th>
                <th>{t("sold")}</th>
                <th>{c("status")}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/organizer/events/${e.id}`} className="font-medium text-brand-600 hover:underline">
                      {loc(e, "title", locale)}
                    </Link>
                  </td>
                  <td>{loc(e.city, "name", locale)}</td>
                  <td>{fmtDate(e.startAt, locale)}</td>
                  <td>
                    {e.ticketTypes.reduce((s, x) => s + x.sold, 0)} / {e.ticketTypes.reduce((s, x) => s + x.quantity, 0)}
                  </td>
                  <td>
                    <Badge color={statusColor[e.status]}>{ts(e.status)}</Badge>
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
