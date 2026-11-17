import { describe, expect, it } from "vitest";
import { computeOrderBreakdown, sarToHalalas } from "./finance";
import { checkRefundEligibility } from "./refund";
import { distanceKm } from "./geo";

describe("computeOrderBreakdown", () => {
  it("extracts VAT from inclusive price and takes commission on pre-VAT amount", () => {
    // 2 x 115 SAR = 230 SAR total, VAT = 30, subtotal = 200, 10% commission = 20
    const b = computeOrderBreakdown([{ unitPrice: 11500, quantity: 2 }], 15, 10);
    expect(b).toEqual({
      totalAmount: 23000,
      vatAmount: 3000,
      subtotalAmount: 20000,
      commissionAmount: 2000,
      organizerNet: 21000,
    });
  });

  it("sums multiple ticket types", () => {
    const b = computeOrderBreakdown(
      [
        { unitPrice: 5000, quantity: 1 },
        { unitPrice: 20000, quantity: 3 },
      ],
      15,
      12.5,
    );
    expect(b.totalAmount).toBe(65000);
    expect(b.vatAmount + b.subtotalAmount).toBe(65000);
    expect(b.commissionAmount + b.organizerNet).toBe(65000);
    expect(b.commissionAmount).toBe(Math.round(b.subtotalAmount * 0.125));
  });

  it("handles free tickets", () => {
    const b = computeOrderBreakdown([{ unitPrice: 0, quantity: 4 }], 15, 10);
    expect(b.totalAmount).toBe(0);
    expect(b.commissionAmount).toBe(0);
  });

  it("rejects bad input", () => {
    expect(() => computeOrderBreakdown([{ unitPrice: -1, quantity: 1 }], 15, 10)).toThrow();
    expect(() => computeOrderBreakdown([{ unitPrice: 100, quantity: 0 }], 15, 10)).toThrow();
    expect(() => computeOrderBreakdown([{ unitPrice: 100, quantity: 1 }], 15, 101)).toThrow();
  });

  it("converts SAR to halalas", () => {
    expect(sarToHalalas("149.50")).toBe(14950);
    expect(sarToHalalas(0.1 + 0.2)).toBe(30);
  });
});

describe("checkRefundEligibility", () => {
  const start = new Date("2026-12-10T18:00:00Z");
  const base = { eventStartAt: start, orderStatus: "PAID", anyTicketUsed: false } as const;

  it("denies when policy is no-refund", () => {
    expect(checkRefundEligibility({ ...base, policyType: "NO_REFUND", hoursBefore: null })).toEqual({
      eligible: false,
      reason: "NO_REFUND_POLICY",
    });
  });

  it("allows before the deadline and denies after", () => {
    const p = { ...base, policyType: "REFUNDABLE_UNTIL" as const, hoursBefore: 48 };
    expect(checkRefundEligibility({ ...p, now: new Date("2026-12-08T17:59:00Z") }).eligible).toBe(true);
    expect(checkRefundEligibility({ ...p, now: new Date("2026-12-08T18:01:00Z") })).toEqual({
      eligible: false,
      reason: "DEADLINE_PASSED",
    });
  });

  it("denies unpaid orders and used tickets", () => {
    const p = { policyType: "REFUNDABLE_UNTIL" as const, hoursBefore: 1, now: new Date("2026-12-01T00:00:00Z") };
    expect(checkRefundEligibility({ ...base, ...p, orderStatus: "PENDING" }).eligible).toBe(false);
    expect(checkRefundEligibility({ ...base, ...p, anyTicketUsed: true })).toEqual({
      eligible: false,
      reason: "TICKET_USED",
    });
  });
});

describe("distanceKm", () => {
  it("Riyadh to Jeddah is about 850 km", () => {
    const d = distanceKm(24.7136, 46.6753, 21.4858, 39.1925);
    expect(d).toBeGreaterThan(830);
    expect(d).toBeLessThan(870);
  });
});
