import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { Link } from "@/i18n/navigation";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { EventDetails } from "@/components/event-details";
import { Alert, Badge, Field, PageHeader, Stat, statusColor } from "@/components/ui";
import { fmtMoney, loc, toRiyadhInput } from "@/lib/i18n-helpers";
import { adminCancelEventAction, reviewEventAction, setFeaturedAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function AdminEventDetail({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.events");
  const ts = await getTranslations("status");
  const c = await getTranslations("common");
  const e = await prisma.event.findUnique({
    where: { id },
    include: { city: true, category: true, ticketTypes: { orderBy: { sortOrder: "asc" } }, images: true, organizer: true },
  });
  if (!e) notFound();
  const sales = await prisma.order.aggregate({
    where: { eventId: id, status: "PAID" },
    _sum: { totalAmount: true, commissionAmount: true },
    _count: true,
  });
  const checkedIn = await prisma.ticket.count({ where: { status: "USED", order: { eventId: id } } });
  const now = new Date();
  const featuredActive = e.isFeatured && (!e.featuredUntil || e.featuredUntil > now);

  return (
    <>
      <PageHeader
        title={loc(e, "title", locale)}
        subtitle={e.organizer.name}
        actions={
          <>
            {featuredActive && <Badge color="purple">{t("featured")}</Badge>}
            <Badge color={statusColor[e.status]}>{ts(e.status)}</Badge>
          </>
        }
      />
      {e.status === "REJECTED" && e.rejectionReason && (
        <div className="mb-4">
          <Alert kind="error">
            {t("rejectionReason")}: {e.rejectionReason}
          </Alert>
        </div>
      )}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Stat label={t("sales")} value={fmtMoney(sales._sum.totalAmount ?? 0, locale)} sub={t("ordersCount", { count: sales._count })} />
        <Stat label={t("commission")} value={fmtMoney(sales._sum.commissionAmount ?? 0, locale)} />
        <Stat label={t("checkedIn")} value={checkedIn} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EventDetails e={e} locale={locale} />
        </div>
        <div className="space-y-5">
          {e.status === "PENDING_REVIEW" && (
            <div className="card">
              <h2 className="mb-3 font-bold">{t("review")}</h2>
              {e.organizer.status !== "APPROVED" && (
                <div className="mb-3">
                  <Alert kind="warning">{t("organizerNotApproved")}</Alert>
                </div>
              )}
              <ActionForm action={reviewEventAction} className="space-y-3">
                <input type="hidden" name="id" value={e.id} />
                <Field label={t("reasonIfReject")}>
                  <textarea name="reason" rows={2} className="input" />
                </Field>
                <div className="flex gap-2">
                  <SubmitButton name="decision" value="approve" className="btn-success btn-sm">
                    {t("approve")}
                  </SubmitButton>
                  <SubmitButton name="decision" value="reject" className="btn-danger btn-sm">
                    {t("reject")}
                  </SubmitButton>
                </div>
              </ActionForm>
            </div>
          )}
          {e.status === "PUBLISHED" && (
            <div className="card">
              <h2 className="mb-3 font-bold">{t("featuring")}</h2>
              <ActionForm action={setFeaturedAction} className="space-y-3" successMessage={c("saved")}>
                <input type="hidden" name="id" value={e.id} />
                <Field label={t("featuredUntil")} hint={t("featuredUntilHint")}>
                  <input
                    type="datetime-local"
                    name="featuredUntil"
                    defaultValue={toRiyadhInput(e.featuredUntil)}
                    className="input"
                    dir="ltr"
                  />
                </Field>
                <div className="flex gap-2">
                  <SubmitButton name="featured" value="1" className="btn-primary btn-sm">
                    {featuredActive ? t("updateFeature") : t("feature")}
                  </SubmitButton>
                  {e.isFeatured && (
                    <SubmitButton name="featured" value="0" className="btn-secondary btn-sm">
                      {t("unfeature")}
                    </SubmitButton>
                  )}
                </div>
              </ActionForm>
            </div>
          )}
          {(e.status === "PUBLISHED" || e.status === "PENDING_REVIEW") && (
            <div className="card">
              <h2 className="mb-2 font-bold">{t("cancelEvent")}</h2>
              <p className="mb-3 text-sm text-slate-600">{t("cancelHint")}</p>
              <ActionForm action={adminCancelEventAction}>
                <input type="hidden" name="id" value={e.id} />
                <SubmitButton className="btn-danger btn-sm" confirm={t("confirmCancel")}>
                  {t("cancelEvent")}
                </SubmitButton>
              </ActionForm>
            </div>
          )}
          <Link href={`/admin/orders?eventId=${e.id}`} className="btn-secondary w-full">
            {t("viewOrders")}
          </Link>
        </div>
      </div>
    </>
  );
}
