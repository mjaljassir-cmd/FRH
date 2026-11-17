"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ActionForm } from "./action-form";
import { SubmitButton } from "./client";
import { FileUpload } from "./file-upload";
import type { ActionState } from "@/lib/action-state";

interface Option {
  id: string;
  nameAr: string;
  nameEn: string;
  lat?: number | null;
  lng?: number | null;
}

export interface TicketRow {
  id?: string;
  nameAr: string;
  nameEn: string;
  price: string; // SAR
  quantity: string;
  salesStartAt: string;
  salesEndAt: string;
  sold?: number;
}

export interface EventFormValues {
  id?: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  categoryId: string;
  cityId: string;
  venueName: string;
  address: string;
  lat: string;
  lng: string;
  startAt: string;
  endAt: string;
  refundPolicyType: "NO_REFUND" | "REFUNDABLE_UNTIL";
  refundHoursBefore: string;
  coverImageUrl?: string | null;
  images: { id: string; url: string }[];
  tickets: TicketRow[];
}

const emptyTicket = (): TicketRow => ({ nameAr: "", nameEn: "", price: "", quantity: "", salesStartAt: "", salesEndAt: "" });

export function EventForm({
  action,
  categories,
  cities,
  initial,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  categories: Option[];
  cities: Option[];
  initial?: EventFormValues;
}) {
  const t = useTranslations("eventForm");
  const locale = useLocale();
  const name = (o: Option) => (locale === "en" ? o.nameEn : o.nameAr);
  const [tickets, setTickets] = useState<TicketRow[]>(initial?.tickets.length ? initial.tickets : [emptyTicket()]);
  const [policy, setPolicy] = useState(initial?.refundPolicyType ?? "NO_REFUND");
  const [lat, setLat] = useState(initial?.lat ?? "");
  const [lng, setLng] = useState(initial?.lng ?? "");

  const update = (i: number, k: keyof TicketRow, v: string) =>
    setTickets((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  return (
    <ActionForm action={action} className="space-y-6">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <section className="card space-y-4">
        <h2 className="font-bold">{t("basics")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">{t("titleAr")}</label>
            <input name="titleAr" defaultValue={initial?.titleAr} required minLength={3} className="input" dir="rtl" />
          </div>
          <div>
            <label className="label">{t("titleEn")}</label>
            <input name="titleEn" defaultValue={initial?.titleEn} required minLength={3} className="input" dir="ltr" />
          </div>
          <div>
            <label className="label">{t("descriptionAr")}</label>
            <textarea name="descriptionAr" defaultValue={initial?.descriptionAr} required minLength={10} rows={6} className="input" dir="rtl" />
          </div>
          <div>
            <label className="label">{t("descriptionEn")}</label>
            <textarea name="descriptionEn" defaultValue={initial?.descriptionEn} required minLength={10} rows={6} className="input" dir="ltr" />
          </div>
          <div>
            <label className="label">{t("category")}</label>
            <select name="categoryId" defaultValue={initial?.categoryId ?? ""} required className="input">
              <option value="" disabled>
                —
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {name(c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("city")}</label>
            <select
              name="cityId"
              defaultValue={initial?.cityId ?? ""}
              required
              className="input"
              onChange={(e) => {
                const c = cities.find((x) => x.id === e.target.value);
                if (c?.lat != null && c?.lng != null && !lat && !lng) {
                  setLat(String(c.lat));
                  setLng(String(c.lng));
                }
              }}
            >
              <option value="" disabled>
                —
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {name(c)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("startAt")}</label>
            <input type="datetime-local" name="startAt" defaultValue={initial?.startAt} required className="input" dir="ltr" />
          </div>
          <div>
            <label className="label">{t("endAt")}</label>
            <input type="datetime-local" name="endAt" defaultValue={initial?.endAt} required className="input" dir="ltr" />
          </div>
        </div>
        <p className="text-xs text-slate-500">{t("timezoneHint")}</p>
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold">{t("location")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">{t("venueName")}</label>
            <input name="venueName" defaultValue={initial?.venueName} required className="input" />
          </div>
          <div>
            <label className="label">{t("address")}</label>
            <input name="address" defaultValue={initial?.address} required className="input" />
          </div>
          <div>
            <label className="label">{t("lat")}</label>
            <input name="lat" value={lat} onChange={(e) => setLat(e.target.value)} required className="input" dir="ltr" inputMode="decimal" />
          </div>
          <div>
            <label className="label">{t("lng")}</label>
            <input name="lng" value={lng} onChange={(e) => setLng(e.target.value)} required className="input" dir="ltr" inputMode="decimal" />
          </div>
        </div>
        <MapPicker lat={lat} lng={lng} onPick={(a, b) => (setLat(a.toFixed(6)), setLng(b.toFixed(6)))} />
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold">{t("images")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">{t("cover")}</label>
            <FileUpload
              name="coverUrl"
              folder="events"
              accept="image/jpeg,image/png,image/webp"
              initial={initial?.coverImageUrl ? [initial.coverImageUrl] : []}
              testId="upload-cover"
            />
            <p className="mt-1 text-xs text-slate-500">{t("imageHint")}</p>
          </div>
          <div>
            <label className="label">{t("gallery")}</label>
            <FileUpload
              name="galleryUrl"
              folder="events"
              accept="image/jpeg,image/png,image/webp"
              multiple
              max={Math.max(0, 10 - (initial?.images.length ?? 0))}
            />
            {initial?.images.length ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {initial.images.map((img) => (
                  <label key={img.id} className="relative block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-20 w-full rounded object-cover" />
                    <span className="mt-1 flex items-center gap-1 text-xs">
                      <input type="checkbox" name="removeImage" value={img.id} /> {t("remove")}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t("tickets")}</h2>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setTickets((r) => [...r, emptyTicket()])}>
            {t("addTicket")}
          </button>
        </div>
        <p className="text-xs text-slate-500">{t("priceHint")}</p>
        {tickets.map((row, i) => (
          <div key={i} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-6">
            {row.id && <input type="hidden" name={`tickets[${i}][id]`} value={row.id} />}
            <div>
              <label className="label">{t("ticketNameAr")}</label>
              <input name={`tickets[${i}][nameAr]`} value={row.nameAr} onChange={(e) => update(i, "nameAr", e.target.value)} required className="input" dir="rtl" />
            </div>
            <div>
              <label className="label">{t("ticketNameEn")}</label>
              <input name={`tickets[${i}][nameEn]`} value={row.nameEn} onChange={(e) => update(i, "nameEn", e.target.value)} required className="input" dir="ltr" />
            </div>
            <div>
              <label className="label">{t("priceSar")}</label>
              <input name={`tickets[${i}][price]`} type="number" step="0.01" min="0" value={row.price} onChange={(e) => update(i, "price", e.target.value)} required className="input" dir="ltr" />
            </div>
            <div>
              <label className="label">{t("quantity")}</label>
              <input name={`tickets[${i}][quantity]`} type="number" min="1" value={row.quantity} onChange={(e) => update(i, "quantity", e.target.value)} required className="input" dir="ltr" />
            </div>
            <div>
              <label className="label">{t("salesStart")}</label>
              <input name={`tickets[${i}][salesStartAt]`} type="datetime-local" value={row.salesStartAt} onChange={(e) => update(i, "salesStartAt", e.target.value)} className="input" dir="ltr" />
            </div>
            <div>
              <label className="label">{t("salesEnd")}</label>
              <div className="flex gap-2">
                <input name={`tickets[${i}][salesEndAt]`} type="datetime-local" value={row.salesEndAt} onChange={(e) => update(i, "salesEndAt", e.target.value)} className="input" dir="ltr" />
                {tickets.length > 1 && (
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setTickets((r) => r.filter((_, idx) => idx !== i))} aria-label={t("remove")}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="card space-y-4">
        <h2 className="font-bold">{t("refundPolicy")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <select name="refundPolicyType" value={policy} onChange={(e) => setPolicy(e.target.value as typeof policy)} className="input">
              <option value="NO_REFUND">{t("noRefund")}</option>
              <option value="REFUNDABLE_UNTIL">{t("refundable")}</option>
            </select>
          </div>
          {policy === "REFUNDABLE_UNTIL" && (
            <div>
              <label className="label">{t("refundHours")}</label>
              <input name="refundHoursBefore" type="number" min="0" defaultValue={initial?.refundHoursBefore || "48"} required className="input" dir="ltr" />
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <SubmitButton name="intent" value="draft" className="btn-secondary">
          {t("saveDraft")}
        </SubmitButton>
        <SubmitButton name="intent" value="submit" className="btn-primary">
          {t("saveAndSubmit")}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

declare global {
  interface Window {
    google?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

/** Optional Google Map: click to set the event location. Hidden when no API key is configured. */
function MapPicker({ lat, lng, onPick }: { lat: string; lng: string; onPick: (lat: number, lng: number) => void }) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const ref = useRef<HTMLDivElement>(null);
  const marker = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const map = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const t = useTranslations("eventForm");
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (!key || !ref.current) return;
    const init = () => {
      const center = { lat: Number(lat) || 24.7136, lng: Number(lng) || 46.6753 };
      map.current = new window.google.maps.Map(ref.current, { center, zoom: lat ? 14 : 6 });
      marker.current = new window.google.maps.Marker({ map: map.current, position: lat ? center : null });
      map.current.addListener("click", (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        marker.current.setPosition(e.latLng);
        pick.current(e.latLng.lat(), e.latLng.lng());
      });
    };
    if (window.google?.maps) return init();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (marker.current && lat && lng) {
      const p = { lat: Number(lat), lng: Number(lng) };
      if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
        marker.current.setPosition(p);
        map.current?.panTo(p);
      }
    }
  }, [lat, lng]);

  if (!key) return <p className="text-xs text-slate-500">{t("mapHint")}</p>;
  return (
    <div>
      <p className="mb-2 text-xs text-slate-500">{t("mapClickHint")}</p>
      <div ref={ref} className="h-72 w-full rounded-lg border border-slate-200" />
    </div>
  );
}
