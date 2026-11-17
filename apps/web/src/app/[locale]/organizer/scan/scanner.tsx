"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { scanTicketAction } from "../actions";

type Result = Awaited<ReturnType<typeof scanTicketAction>>;

export function Scanner({ events, initialEvent }: { events: { id: string; title: string }[]; initialEvent: string }) {
  const t = useTranslations("organizer.scan");
  const locale = useLocale();
  const [eventId, setEventId] = useState(initialEvent);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const busy = useRef(false);
  const lastCode = useRef<{ code: string; at: number } | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const eventRef = useRef(eventId);
  eventRef.current = eventId;

  const check = useCallback(async (code: string) => {
    // Ignore the same code re-read by the camera within 3 seconds
    const now = Date.now();
    if (busy.current || (lastCode.current?.code === code && now - lastCode.current.at < 3000)) return;
    busy.current = true;
    lastCode.current = { code, at: now };
    try {
      const r = await scanTicketAction(code, eventRef.current || undefined);
      setResult(r);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(r.status === "OK" ? 100 : [100, 80, 100]);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (!cameraOn) return;
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const s = new Html5Qrcode("qr-reader");
      scannerRef.current = s;
      try {
        await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (text) => check(text), () => {});
      } catch {
        setCameraError(true);
        setCameraOn(false);
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      s?.stop().then(() => s.clear()).catch(() => {});
    };
  }, [cameraOn, check]);

  const tt = (r: Extract<Result, { ticket: unknown }>) => {
    const tk = r.ticket as { holder: string; ticketTypeAr: string; ticketTypeEn: string; eventTitleAr: string; eventTitleEn: string };
    return (
      <div className="mt-2 text-sm">
        <div className="font-semibold">{tk.holder}</div>
        <div>{locale === "en" ? tk.ticketTypeEn : tk.ticketTypeAr}</div>
        <div className="text-xs opacity-80">{locale === "en" ? tk.eventTitleEn : tk.eventTitleAr}</div>
      </div>
    );
  };

  let box: React.ReactNode = null;
  if (result) {
    const color =
      result.status === "OK" ? "bg-emerald-600" : result.status === "ALREADY_USED" ? "bg-amber-500" : "bg-red-600";
    box = (
      <div className={`rounded-xl p-5 text-white ${color}`} data-testid="scan-result" data-status={result.status}>
        <div className="text-2xl font-bold">{t(`result.${result.status}`)}</div>
        {"ticket" in result && tt(result)}
        {result.status === "ALREADY_USED" && (
          <div className="mt-1 text-xs">
            {t("usedAt")}: {new Date(result.checkedInAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB")}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <label className="label">{t("event")}</label>
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="input">
          <option value="">{t("anyEvent")}</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>
      <div id="qr-reader" className={`overflow-hidden rounded-xl ${cameraOn ? "border border-slate-300" : ""}`} />
      {cameraError && <p className="text-sm text-red-600">{t("cameraError")}</p>}
      <button type="button" className={cameraOn ? "btn-secondary w-full" : "btn-primary w-full"} onClick={() => setCameraOn((v) => !v)}>
        {cameraOn ? t("stopCamera") : t("startCamera")}
      </button>
      {box}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) {
            lastCode.current = null;
            check(manual.trim());
          }
        }}
      >
        <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={t("manualPlaceholder")} className="input" dir="ltr" data-testid="manual-code" />
        <button className="btn-secondary">{t("check")}</button>
      </form>
    </div>
  );
}
