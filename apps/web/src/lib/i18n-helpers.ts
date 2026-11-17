/** Pick the Arabic or English variant of a bilingual DB field. */
export function loc<T extends Record<string, unknown>>(obj: T, field: string, locale: string): string {
  const key = `${field}${locale === "en" ? "En" : "Ar"}`;
  return String(obj[key] ?? "");
}

export function fmtMoney(halalas: number, locale: string) {
  const v = halalas / 100;
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(v);
}

export function fmtDate(d: Date | string, locale: string, withTime = true) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "Asia/Riyadh",
  }).format(new Date(d));
}

/** Format a Date for <input type="datetime-local"> in Riyadh time. */
export function toRiyadhInput(d: Date | null | undefined) {
  if (!d) return "";
  const shifted = new Date(d.getTime() + 3 * 3600 * 1000);
  return shifted.toISOString().slice(0, 16);
}

/** Parse a datetime-local value entered in Riyadh time (UTC+3, no DST). */
export function fromRiyadhInput(v: string): Date | null {
  if (!v) return null;
  const d = new Date(`${v}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
