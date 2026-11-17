import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { Link } from "@/i18n/navigation";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import { Alert, Badge, Field, PageHeader, Stat, statusColor } from "@/components/ui";
import { fmtDate, fmtMoney, loc, toRiyadhInput } from "@/lib/i18n-helpers";
import { organizerBalance } from "@/lib/orders";
import { recordPayoutAction, setCommissionAction, setOrganizerStatusAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function OrganizerDetail({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.organizers");
  const ts = await getTranslations("status");
  const c = await getTranslations("common");
  const o = await prisma.organizer.findUnique({
    where: { id },
    include: {
      owner: true,
      events: { orderBy: { startAt: "desc" }, take: 50 },
      payouts: { orderBy: { transferredAt: "desc" }, include: { createdBy: { select: { name: true } } } },
      staff: { include: { user: true } },
    },
  });
  if (!o) notFound();
  const bal = await organizerBalance(o.id);
  const m = (v: number) => fmtMoney(v, locale);

  return (
    <>
      <PageHeader
        title={o.name}
        subtitle={`${t("registered")}: ${fmtDate(o.createdAt, locale)}`}
        actions={<Badge color={statusColor[o.status]}>{ts(o.status)}</Badge>}
      />
      {o.status === "REJECTED" && o.rejectionReason && (
        <div className="mb-4">
          <Alert kind="error">
            {t("rejectionReason")}: {o.rejectionReason}
          </Alert>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card space-y-2 text-sm lg:col-span-2">
          <h2 className="mb-2 font-bold">{t("details")}</h2>
          <Row k={t("owner")} v={`${o.owner.name} — ${o.owner.email}`} />
          <Row k={t("phone")} v={o.owner.phone ?? "-"} ltr />
          <Row k={t("crNumber")} v={o.commercialRegNumber} ltr />
          <div className="flex gap-2">
            <span className="w-40 shrink-0 text-slate-500">{t("crFile")}</span>
            <a href={o.commercialRegFileUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
              {t("viewFile")}
            </a>
          </div>
          <Row k={t("bankName")} v={o.bankName} />
          <Row k={t("accountHolder")} v={o.accountHolderName} />
          <Row k={t("iban")} v={o.iban} ltr />
          {o.description && <Row k={t("description")} v={o.description} />}
        </div>
        <div className="space-y-5">
          <div className="card">
            <h2 className="mb-3 font-bold">{t("decision")}</h2>
            <ActionForm action={setOrganizerStatusAction} className="space-y-3">
              <input type="hidden" name="id" value={o.id} />
              <Field label={t("reasonIfReject")}>
                <textarea name="reason" rows={2} className="input" />
              </Field>
              <div className="flex flex-wrap gap-2">
                {o.status !== "APPROVED" && (
                  <SubmitButton name="status" value="APPROVED" className="btn-success btn-sm">
                    {t("approve")}
                  </SubmitButton>
                )}
                {o.status === "PENDING" && (
                  <SubmitButton name="status" value="REJECTED" className="btn-danger btn-sm">
                    {t("reject")}
                  </SubmitButton>
                )}
                {o.status === "APPROVED" && (
                  <SubmitButton name="status" value="SUSPENDED" className="btn-danger btn-sm" confirm={t("confirmSuspend")}>
                    {t("suspend")}
                  </SubmitButton>
                )}
              </div>
            </ActionForm>
          </div>
          <div className="card">
            <h2 className="mb-3 font-bold">{t("commission")}</h2>
            <ActionForm action={setCommissionAction} className="flex items-end gap-2" successMessage={c("saved")}>
              <input type="hidden" name="id" value={o.id} />
              <div className="flex-1">
                <Field label={t("commissionRate")} hint={t("commissionHint")}>
                  <input
                    name="commissionRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    defaultValue={Number(o.commissionRate)}
                    className="input"
                    dir="ltr"
                  />
                </Field>
              </div>
              <SubmitButton className="btn-primary">{c("save")}</SubmitButton>
            </ActionForm>
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">{t("balance")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("gross")} value={m(bal.gross)} sub={t("ordersCount", { count: bal.orders })} />
        <Stat label={t("commissionTotal")} value={m(bal.commission)} />
        <Stat label={t("paidOut")} value={m(bal.paidOut)} />
        <Stat label={t("due")} value={m(bal.due)} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h3 className="mb-3 font-bold">{t("recordPayout")}</h3>
          <ActionForm action={recordPayoutAction} className="space-y-3" successMessage={c("saved")} resetOnSuccess>
            <input type="hidden" name="organizerId" value={o.id} />
            <Field label={t("amountSar")}>
              <input name="amount" type="number" step="0.01" min="0.01" required className="input" dir="ltr" />
            </Field>
            <Field label={t("reference")}>
              <input name="reference" required className="input" dir="ltr" />
            </Field>
            <Field label={t("transferredAt")}>
              <input name="transferredAt" type="datetime-local" defaultValue={toRiyadhInput(new Date())} className="input" dir="ltr" />
            </Field>
            <Field label={t("note")}>
              <input name="note" className="input" />
            </Field>
            <SubmitButton className="btn-primary w-full">{t("recordPayout")}</SubmitButton>
          </ActionForm>
        </div>
        <div className="card overflow-x-auto p-0 lg:col-span-2">
          <table className="table">
            <thead>
              <tr>
                <th>{t("transferredAt")}</th>
                <th>{t("amount")}</th>
                <th>{t("reference")}</th>
                <th>{t("note")}</th>
                <th>{t("by")}</th>
              </tr>
            </thead>
            <tbody>
              {o.payouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-500">
                    {c("noResults")}
                  </td>
                </tr>
              )}
              {o.payouts.map((p) => (
                <tr key={p.id}>
                  <td>{fmtDate(p.transferredAt, locale)}</td>
                  <td>{m(p.amount)}</td>
                  <td dir="ltr">{p.reference}</td>
                  <td>{p.note}</td>
                  <td>{p.createdBy.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">{t("events")}</h2>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <tbody>
            {o.events.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link href={`/admin/events/${e.id}`} className="text-brand-600 hover:underline">
                    {loc(e, "title", locale)}
                  </Link>
                </td>
                <td>{fmtDate(e.startAt, locale)}</td>
                <td>
                  <Badge color={statusColor[e.status]}>{ts(e.status)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Row({ k, v, ltr }: { k: string; v: string; ltr?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-40 shrink-0 text-slate-500">{k}</span>
      <span dir={ltr ? "ltr" : undefined}>{v}</span>
    </div>
  );
}
