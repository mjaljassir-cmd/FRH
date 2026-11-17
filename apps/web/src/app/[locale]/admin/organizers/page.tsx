import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma, type OrganizerStatus } from "@events/db";
import { Link } from "@/i18n/navigation";
import { Badge, Empty, PageHeader, statusColor } from "@/components/ui";
import { fmtDate } from "@/lib/i18n-helpers";

export const dynamic = "force-dynamic";
const STATUSES = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;

export default async function OrganizersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("admin.organizers");
  const ts = await getTranslations("status");
  const c = await getTranslations("common");
  const status = STATUSES.includes(sp.status as OrganizerStatus) ? (sp.status as OrganizerStatus) : undefined;
  const items = await prisma.organizer.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { owner: { email: { contains: sp.q, mode: "insensitive" } } }] } : {}),
    },
    include: { owner: true, _count: { select: { events: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
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
                <th>{t("owner")}</th>
                <th>{t("commission")}</th>
                <th>{t("events")}</th>
                <th>{c("status")}</th>
                <th>{t("registered")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/organizers/${o.id}`} className="font-medium text-brand-600 hover:underline">
                      {o.name}
                    </Link>
                  </td>
                  <td>
                    <div>{o.owner.name}</div>
                    <div className="text-xs text-slate-500" dir="ltr">
                      {o.owner.email}
                    </div>
                  </td>
                  <td>{Number(o.commissionRate)}%</td>
                  <td>{o._count.events}</td>
                  <td>
                    <Badge color={statusColor[o.status]}>{ts(o.status)}</Badge>
                  </td>
                  <td>{fmtDate(o.createdAt, locale, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
