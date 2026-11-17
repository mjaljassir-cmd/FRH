import { getTranslations } from "next-intl/server";
import type { Category, City, Event, EventImage, TicketType } from "@events/db";
import { fmtDate, fmtMoney, loc } from "@/lib/i18n-helpers";

type FullEvent = Event & { city: City; category: Category; ticketTypes: TicketType[]; images: EventImage[] };

/** Read-only event summary shared by admin review and organizer views. */
export async function EventDetails({ e, locale }: { e: FullEvent; locale: string }) {
  const t = await getTranslations("eventForm");
  return (
    <div className="space-y-5">
      {e.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.coverImageUrl} alt="" className="h-56 w-full rounded-xl object-cover" />
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card space-y-1 text-sm">
          <h3 className="mb-2 font-bold">العربية</h3>
          <p className="font-semibold">{e.titleAr}</p>
          <p className="whitespace-pre-line text-slate-600">{e.descriptionAr}</p>
        </div>
        <div className="card space-y-1 text-sm" dir="ltr">
          <h3 className="mb-2 font-bold">English</h3>
          <p className="font-semibold">{e.titleEn}</p>
          <p className="whitespace-pre-line text-slate-600">{e.descriptionEn}</p>
        </div>
      </div>
      <div className="card grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <span className="text-slate-500">{t("category")}: </span>
          {loc(e.category, "name", locale)}
        </div>
        <div>
          <span className="text-slate-500">{t("city")}: </span>
          {loc(e.city, "name", locale)}
        </div>
        <div>
          <span className="text-slate-500">{t("startAt")}: </span>
          {fmtDate(e.startAt, locale)}
        </div>
        <div>
          <span className="text-slate-500">{t("endAt")}: </span>
          {fmtDate(e.endAt, locale)}
        </div>
        <div>
          <span className="text-slate-500">{t("venueName")}: </span>
          {e.venueName}
        </div>
        <div>
          <span className="text-slate-500">{t("address")}: </span>
          {e.address}{" "}
          <a
            className="text-brand-600 hover:underline"
            href={`https://www.google.com/maps?q=${e.lat},${e.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            ({t("openMap")})
          </a>
        </div>
        <div className="sm:col-span-2">
          <span className="text-slate-500">{t("refundPolicy")}: </span>
          {e.refundPolicyType === "NO_REFUND" ? t("noRefund") : t("refundUntilHours", { hours: e.refundHoursBefore ?? 0 })}
        </div>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>{t("ticketName")}</th>
              <th>{t("price")}</th>
              <th>{t("quantity")}</th>
              <th>{t("sold")}</th>
              <th>{t("salesWindow")}</th>
            </tr>
          </thead>
          <tbody>
            {e.ticketTypes.map((tt) => (
              <tr key={tt.id}>
                <td>{loc(tt, "name", locale)}</td>
                <td>{tt.price === 0 ? t("free") : fmtMoney(tt.price, locale)}</td>
                <td>{tt.quantity}</td>
                <td>{tt.sold}</td>
                <td className="text-xs">
                  {tt.salesStartAt ? fmtDate(tt.salesStartAt, locale) : "—"} → {tt.salesEndAt ? fmtDate(tt.salesEndAt, locale) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {e.images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {e.images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={img.url} alt="" className="h-28 w-full rounded-lg object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}
