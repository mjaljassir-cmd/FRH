import { env } from "./env";

const API = "https://api.moyasar.com/v1";

export interface MoyasarPayment {
  id: string;
  status: "initiated" | "paid" | "failed" | "authorized" | "captured" | "refunded" | "voided" | "verified";
  amount: number;
  currency: string;
  refunded: number;
  metadata?: Record<string, string> | null;
  source?: { type?: string; message?: string | null } | null;
}

function authHeader() {
  return "Basic " + Buffer.from(`${env.moyasar.secretKey}:`).toString("base64");
}

export async function fetchPayment(paymentId: string): Promise<MoyasarPayment> {
  if (env.moyasar.mock) {
    // Mock IDs look like "mock_<orderId>_<paid|failed>"
    const [, , outcome] = paymentId.split("_");
    return {
      id: paymentId,
      status: outcome === "paid" ? "paid" : "failed",
      amount: -1,
      currency: "SAR",
      refunded: 0,
      source: { type: "mock" },
    };
  }
  const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Moyasar fetch payment failed: ${res.status}`);
  return res.json();
}

export async function refundPayment(paymentId: string, amount: number): Promise<{ ok: boolean; error?: string }> {
  if (env.moyasar.mock) return { ok: true };
  const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `${res.status} ${text.slice(0, 300)}` };
  }
  return { ok: true };
}
