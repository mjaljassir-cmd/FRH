"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/client";
import type { ActionState } from "@/lib/action-state";
import type { TicketRow } from "@/components/event-form";

/** Published events: raise capacity, change sales window, or add new ticket types. */
export function PublishedTickets({
  action,
  eventId,
  rows: initial,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  eventId: string;
  rows: TicketRow[];
}) {
  const t = useTranslations("eventForm");
  const c = useTranslations("common");
  const [rows, setRows] = useState(initial);
  const set = (i: number, k: keyof TicketRow, v: string) => setRows((r) => r.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">{t("manageTickets")}</h2>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => setRows((r) => [...r, { nameAr: "", nameEn: "", price: "", quantity: "", salesStartAt: "", salesEndAt: "" }])}
        >
          {t("addTicket")}
        </button>
      </div>
      <ActionForm action={action} successMessage={c("saved")}>
        <input type="hidden" name="id" value={eventId} />
        {rows.map((r, i) => {
          const locked = !!r.id;
          return (
            <div key={i} className="grid gap-2 border-b border-slate-100 pb-3 md:grid-cols-7">
              {r.id && <input type="hidden" name={`tickets[${i}][id]`} value={r.id} />}
              <input name={`tickets[${i}][nameAr]`} value={r.nameAr} readOnly={locked} onChange={(e) => set(i, "nameAr", e.target.value)} placeholder={t("ticketNameAr")} required className="input" dir="rtl" />
              <input name={`tickets[${i}][nameEn]`} value={r.nameEn} readOnly={locked} onChange={(e) => set(i, "nameEn", e.target.value)} placeholder={t("ticketNameEn")} required className="input" dir="ltr" />
              <input name={`tickets[${i}][price]`} type="number" step="0.01" min="0" value={r.price} readOnly={locked} onChange={(e) => set(i, "price", e.target.value)} placeholder={t("priceSar")} required className="input" dir="ltr" />
              <input name={`tickets[${i}][quantity]`} type="number" min={r.sold || 1} value={r.quantity} onChange={(e) => set(i, "quantity", e.target.value)} placeholder={t("quantity")} required className="input" dir="ltr" />
              <input name={`tickets[${i}][salesStartAt]`} type="datetime-local" value={r.salesStartAt} onChange={(e) => set(i, "salesStartAt", e.target.value)} className="input" dir="ltr" />
              <input name={`tickets[${i}][salesEndAt]`} type="datetime-local" value={r.salesEndAt} onChange={(e) => set(i, "salesEndAt", e.target.value)} className="input" dir="ltr" />
              <div className="self-center text-xs text-slate-500">{r.id ? t("soldCount", { count: r.sold ?? 0 }) : t("new")}</div>
            </div>
          );
        })}
        <p className="text-xs text-slate-500">{t("publishedTicketsHint")}</p>
        <SubmitButton>{c("save")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
