export type RefundPolicyType = "NO_REFUND" | "REFUNDABLE_UNTIL";

export interface RefundEligibilityInput {
  policyType: RefundPolicyType;
  hoursBefore: number | null;
  eventStartAt: Date;
  now?: Date;
  orderStatus: string;
  anyTicketUsed: boolean;
}

export type RefundEligibility =
  | { eligible: true }
  | { eligible: false; reason: "NO_REFUND_POLICY" | "DEADLINE_PASSED" | "NOT_PAID" | "TICKET_USED" };

/** Deadline after which a customer can no longer request a refund. */
export function refundDeadline(eventStartAt: Date, hoursBefore: number): Date {
  return new Date(eventStartAt.getTime() - hoursBefore * 60 * 60 * 1000);
}

export function checkRefundEligibility(input: RefundEligibilityInput): RefundEligibility {
  const now = input.now ?? new Date();
  if (input.orderStatus !== "PAID") return { eligible: false, reason: "NOT_PAID" };
  if (input.anyTicketUsed) return { eligible: false, reason: "TICKET_USED" };
  if (input.policyType === "NO_REFUND") return { eligible: false, reason: "NO_REFUND_POLICY" };
  const deadline = refundDeadline(input.eventStartAt, input.hoursBefore ?? 0);
  if (now.getTime() > deadline.getTime()) return { eligible: false, reason: "DEADLINE_PASSED" };
  return { eligible: true };
}
