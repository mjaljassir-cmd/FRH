import { NextResponse } from "next/server";
import { prisma } from "@events/db";
import { env } from "@/lib/env";
import { fetchPayment } from "@/lib/moyasar";
import { failOrder, markOrderPaid } from "@/lib/orders";

/** Moyasar redirects the customer here after payment: ?order=..&locale=..&id=..&status=..&message=.. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("order") ?? "";
  const locale = url.searchParams.get("locale") === "en" ? "en" : "ar";
  const paymentId = url.searchParams.get("id") ?? "";
  const result = (status: string) =>
    NextResponse.redirect(`${env.appUrl}/${locale}/pay/result?order=${encodeURIComponent(orderId)}&status=${status}`);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !paymentId) return result("failed");
  if (order.status === "PAID") return result("paid");

  try {
    const p = await fetchPayment(paymentId);
    const metaOrder = p.metadata?.order_id;
    const amountOk = env.moyasar.mock || (p.amount === order.totalAmount && p.currency === "SAR");
    const orderOk = env.moyasar.mock ? paymentId.startsWith(`mock_${order.id}_`) : metaOrder === order.id;
    if (p.status === "paid" && amountOk && orderOk) {
      const r = await markOrderPaid(order.id, p.id, p.source?.type ?? "unknown");
      return result(r.ok ? "paid" : "refunded");
    }
    if (p.status === "failed") await failOrder(order.id);
    return result("failed");
  } catch (err) {
    console.error("[moyasar callback]", err);
    return result("failed");
  }
}
