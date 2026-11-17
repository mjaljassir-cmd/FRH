export interface Named {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface City extends Named {
  lat: number | null;
  lng: number | null;
}

export interface EventSummary {
  id: string;
  titleAr: string;
  titleEn: string;
  coverImageUrl: string | null;
  startAt: string;
  endAt: string;
  venueName: string;
  lat: number;
  lng: number;
  city: Named;
  category: Named;
  organizer: { id: string; name: string; logoUrl: string | null };
  minPrice: number | null;
  maxPrice: number | null;
  soldOut: boolean;
  isFeatured: boolean;
  distanceKm: number | null;
  rating: { avg: number; count: number } | null;
}

export interface TicketTypeInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
  remaining: number;
  onSale: boolean;
  salesStartAt: string | null;
  salesEndAt: string | null;
}

export interface EventDetail {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  coverImageUrl: string | null;
  images: string[];
  startAt: string;
  endAt: string;
  venueName: string;
  address: string;
  lat: number;
  lng: number;
  city: Named;
  category: Named;
  organizer: {
    id: string;
    name: string;
    logoUrl: string | null;
    description: string | null;
    rating: { avg: number; count: number } | null;
  };
  refundPolicy: { type: "NO_REFUND" | "REFUNDABLE_UNTIL"; hoursBefore: number | null };
  ticketTypes: TicketTypeInfo[];
  isOnSale: boolean;
  rating: { avg: number; count: number } | null;
  isFavorite: boolean;
  canReview: boolean;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userName: string;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cityId: string | null;
  locale: "ar" | "en";
}

export interface TicketListItem {
  orderId: string;
  status: "PAID" | "REFUNDED";
  ticketCount: number;
  event: { id: string; titleAr: string; titleEn: string; startAt: string; endAt: string; coverImageUrl: string | null; venueName: string; status: string };
}

export interface OrderDetail {
  id: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED";
  receiptNumber: number;
  createdAt: string;
  paidAt: string | null;
  paymentMethod: string | null;
  totalAmount: number;
  vatAmount: number;
  subtotalAmount: number;
  vatRate: number;
  items: { nameAr: string; nameEn: string; quantity: number; unitPrice: number }[];
  event: {
    id: string;
    titleAr: string;
    titleEn: string;
    startAt: string;
    endAt: string;
    venueName: string;
    address: string;
    lat: number;
    lng: number;
    coverImageUrl: string | null;
    status: string;
    cityAr: string;
    cityEn: string;
    organizerName: string;
    refundPolicy: { type: "NO_REFUND" | "REFUNDABLE_UNTIL"; hoursBefore: number | null };
  };
  tickets: { id: string; status: "VALID" | "USED" | "REFUNDED"; checkedInAt: string | null; typeAr: string; typeEn: string; qr: string | null }[];
  refund: { eligible: true } | { eligible: false; reason: string };
  seller: { nameAr: string; nameEn: string; vatNumber: string; addressAr: string; addressEn: string };
}
