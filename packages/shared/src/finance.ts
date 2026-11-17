/**
 * All money values are integers in halalas (1 SAR = 100 halalas).
 * Ticket prices entered by organizers are VAT-inclusive.
 * Commission is a percentage of the pre-VAT amount.
 */
export interface OrderBreakdown {
  totalAmount: number; // what the customer pays (VAT inclusive)
  vatAmount: number; // VAT portion of the total
  subtotalAmount: number; // total - VAT
  commissionAmount: number; // platform commission (on subtotal)
  organizerNet: number; // total - commission
}

export function computeOrderBreakdown(
  items: { unitPrice: number; quantity: number }[],
  vatRatePercent: number,
  commissionRatePercent: number,
): OrderBreakdown {
  if (vatRatePercent < 0 || commissionRatePercent < 0 || commissionRatePercent > 100) {
    throw new Error("Invalid rate");
  }
  const totalAmount = items.reduce((sum, i) => {
    if (!Number.isInteger(i.unitPrice) || i.unitPrice < 0) throw new Error("Invalid price");
    if (!Number.isInteger(i.quantity) || i.quantity <= 0) throw new Error("Invalid quantity");
    return sum + i.unitPrice * i.quantity;
  }, 0);
  const vatAmount = Math.round((totalAmount * vatRatePercent) / (100 + vatRatePercent));
  const subtotalAmount = totalAmount - vatAmount;
  const commissionAmount = Math.round((subtotalAmount * commissionRatePercent) / 100);
  const organizerNet = totalAmount - commissionAmount;
  return { totalAmount, vatAmount, subtotalAmount, commissionAmount, organizerNet };
}

/** Convert a SAR amount (e.g. "149.50") to halalas. */
export function sarToHalalas(sar: number | string): number {
  const n = typeof sar === "string" ? Number(sar) : sar;
  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid amount");
  return Math.round(n * 100);
}

export function halalasToSar(halalas: number): number {
  return halalas / 100;
}

export function formatSar(halalas: number, locale: "ar" | "en"): string {
  const value = halalasToSar(halalas);
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}
