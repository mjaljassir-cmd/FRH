import type { Event, EventImage, TicketType } from "@events/db";
import type { EventFormValues } from "@/components/event-form";
import { toRiyadhInput } from "./i18n-helpers";

export function toFormValues(e: Event & { ticketTypes: TicketType[]; images: EventImage[] }): EventFormValues {
  return {
    id: e.id,
    titleAr: e.titleAr,
    titleEn: e.titleEn,
    descriptionAr: e.descriptionAr,
    descriptionEn: e.descriptionEn,
    categoryId: e.categoryId,
    cityId: e.cityId,
    venueName: e.venueName,
    address: e.address,
    lat: String(e.lat),
    lng: String(e.lng),
    startAt: toRiyadhInput(e.startAt),
    endAt: toRiyadhInput(e.endAt),
    refundPolicyType: e.refundPolicyType,
    refundHoursBefore: e.refundHoursBefore != null ? String(e.refundHoursBefore) : "",
    coverImageUrl: e.coverImageUrl,
    images: e.images.map((i) => ({ id: i.id, url: i.url })),
    tickets: e.ticketTypes.map((t) => ({
      id: t.id,
      nameAr: t.nameAr,
      nameEn: t.nameEn,
      price: String(t.price / 100),
      quantity: String(t.quantity),
      salesStartAt: toRiyadhInput(t.salesStartAt),
      salesEndAt: toRiyadhInput(t.salesEndAt),
      sold: t.sold,
    })),
  };
}
