import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma, type EventStatus } from "@events/db";
import { Link } from "@/i18n/navigation";
import { Badge, Empty, PageHeader, statusColor } from "@/components/ui";
import { fmtDate, loc } from "@/lib/i18n-helpers";
import { featuredWhere } from "@/lib/events";

export const dynamic = "force-dynamic";
const STATUSES = ["PENDING_REVIEW", "PUBLISHED", "REJECTED", "CANCELLED", "ENDED", "DRAFT"] as const;

export default async function AdminEvents({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string; featured?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("admin.events");
  const ts = await getTranslations("status");
  const c = await getTranslations("common");
  const status = STATUSES.includes(sp.status as EventStatus) ? (sp.status as EventStatus) : undefined;
  const items = await prisma.event.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(sp.featured === "1" ? featuredWhere() : {}),
      ...(sp.q
        ? {
            OR: [
              { titleAr: { contains: sp.q, mode: "insensitive" } },
              { titleEn: { contains: sp.q, mode: "insensitive" } },
              { organizer: { name: { contains: sp.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { organizer: true, city: true },
    orderBy: [{ startAt: "desc" }],
    take: 200,
  });
  const now = new Date();
  return (
    <>
      <PageHeader title={t("title")} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder={c("search")} className="input max-w-xs" />
        <select name="status" defaultValue={status ?? ""} className="input max-w-[12rem]">
          <option value="">{c("all")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {ts(s)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" value="1" defaultChecked={sp.featured === "1"} />
          {t("featuredOnly")}
        </label>
        <button className="btn-secondary">{c("filter")}</button>
      </form>
      {items.length === 0 ? (
        <Empty>{c("noResults")}</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>{t("event")}</th>
                <th>{t("organizer")}</th>
                <th>{t("city")}</th>
                <th>{t("date")}</th>
                <th>{c("status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/admin/events/${e.id}`} className="font-medium text-brand-600 hover:underline">
                      {loc(e, "title", locale)}
                    </Link>
                    {e.isFeatured && (!e.featuredUntil || e.featuredUntil > now) && (
                      <span className="ms-2">
                        <Badge color="purple">{t("featured")}</Badge>
                      </span>
                    )}
                  </td>
                  <td>{e.organizer.name}</td>
                  <td>{loc(e.city, "name", locale)}</td>
                  <td>{fmtDate(e.startAt, locale)}</td>
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
