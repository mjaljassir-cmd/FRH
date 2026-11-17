import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { Link } from "@/i18n/navigation";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { EventDetails } from "@/components/event-details";
import { Alert, Badge, PageHeader, Stat, statusColor } from "@/components/ui";
import { fmtMoney, loc, toRiyadhInput } from "@/lib/i18n-helpers";
import { requireOrganizerPage } from "@/lib/session";
import { deleteDraftAction, organizerCancelEventAction, submitEventAction, updatePublishedTicketsAction } from "../../actions";
import { PublishedTickets } from "./published-tickets";

export const dynamic = "force-dynamic";

export default async function OrganizerEventPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { organizer } = await requireOrganizerPage(locale, { approved: true });
  const t = await getTranslations("organizer.events");
  const ts = await getTranslations("status");
  const e = await prisma.event.findFirst({
    where: { id, organizerId: organizer.id },
    include: { city: true, category: true, ticketTypes: { orderBy: { sortOrder: "asc" } }, images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!e) notFound();
  const [sales, checkedIn, tickets] = await Promise.all([
    prisma.order.aggregate({ where: { eventId: id, status: "PAID" }, _sum: { totalAmount: true, organizerNet: true }, _count: true }),
    prisma.ticket.count({ where: { status: "USED", order: { eventId: id } } }),
    prisma.ticket.count({ where: { status: { in: ["VALID", "USED"] }, order: { eventId: id, status: "PAID" } } }),
  ]);
  const editable = ["DRAFT", "REJECTED", "PENDING_REVIEW"].includes(e.status);

  return (
    <>
      <PageHeader
        title={loc(e, "title", locale)}
        actions={
          <>
            <Badge color={statusColor[e.status]}>{ts(e.status)}</Badge>
            {editable && (
              <Link href={`/organizer/events/${e.id}/edit`} className="btn-secondary btn-sm">
                {t("edit")}
              </Link>
            )}
            <Link href={`/organizer/events/${e.id}/attendees`} className="btn-secondary btn-sm">
              {t("attendees")}
            </Link>
            {e.status === "PUBLISHED" && (
              <Link href={`/organizer/scan?event=${e.id}`} className="btn-primary btn-sm">
                {t("scanForEvent")}
              </Link>
            )}
          </>
        }
      />
      {e.status === "REJECTED" && (
        <div className="mb-4">
          <Alert kind="error">
            {t("rejected")}: {e.rejectionReason}
          </Alert>
        </div>
      )}
      {e.status === "PENDING_REVIEW" && (
        <div className="mb-4">
          <Alert kind="info">{t("underReview")}</Alert>
        </div>
      )}
      {(e.status === "DRAFT" || e.status === "REJECTED") && (
        <div className="mb-4 flex flex-wrap gap-2">
          <ActionForm action={submitEventAction} className="">
            <input type="hidden" name="id" value={e.id} />
            <SubmitButton>{t("submitForReview")}</SubmitButton>
          </ActionForm>
          <ActionForm action={deleteDraftAction} className="">
            <input type="hidden" name="id" value={e.id} />
            <SubmitButton className="btn-danger" confirm={t("confirmDelete")}>
              {t("delete")}
            </SubmitButton>
          </ActionForm>
        </div>
      )}
      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        <Stat label={t("sales")} value={fmtMoney(sales._sum.totalAmount ?? 0, locale)} sub={t("ordersCount", { count: sales._count })} />
        <Stat label={t("net")} value={fmtMoney(sales._sum.organizerNet ?? 0, locale)} />
        <Stat label={t("ticketsIssued")} value={tickets} />
        <Stat label={t("checkedIn")} value={`${checkedIn} / ${tickets}`} />
      </div>
      {e.status === "PUBLISHED" && (
        <div className="mb-5">
          <PublishedTickets
            action={updatePublishedTicketsAction}
            eventId={e.id}
            rows={e.ticketTypes.map((tt) => ({
              id: tt.id,
              nameAr: tt.nameAr,
              nameEn: tt.nameEn,
              price: String(tt.price / 100),
              quantity: String(tt.quantity),
              sold: tt.sold,
              salesStartAt: toRiyadhInput(tt.salesStartAt),
              salesEndAt: toRiyadhInput(tt.salesEndAt),
            }))}
          />
        </div>
      )}
      <EventDetails e={e} locale={locale} />
      {(e.status === "PUBLISHED" || e.status === "PENDING_REVIEW") && (
        <div className="card mt-6 border-red-200">
          <h2 className="mb-2 font-bold text-red-700">{t("cancelEvent")}</h2>
          <p className="mb-3 text-sm text-slate-600">{t("cancelHint")}</p>
          <ActionForm action={organizerCancelEventAction} className="">
            <input type="hidden" name="id" value={e.id} />
            <SubmitButton className="btn-danger" confirm={t("confirmCancel")}>
              {t("cancelEvent")}
            </SubmitButton>
          </ActionForm>
        </div>
      )}
    </>
  );
}
