import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@events/db";
import { env } from "@/lib/env";
import { fetchPayment } from "@/lib/moyasar";
import { failOrder, markOrderPaid } from "@/lib/orders";

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Server-to-server notification from Moyasar (backup for when the customer closes the app mid-payment). */
export async function POST(req: Request) {
  const secret = env.moyasar.webhookSecret;
  const body = (await req.json().catch(() => null)) as {
    type?: string;
    secret_token?: string;
    data?: { id?: string; metadata?: { order_id?: string } };
  } | null;
  if (!secret || !body?.secret_token || !safeEqual(body.secret_token, secret)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const paymentId = body.data?.id;
  const orderId = body.data?.metadata?.order_id;
  if (!paymentId || !orderId) return NextResponse.json({ ok: true });

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ ok: true });

  // Never trust the webhook body for amounts – re-fetch from Moyasar
  const p = await fetchPayment(paymentId);
  if (p.status === "paid" && p.amount === order.totalAmount && p.metadata?.order_id === order.id) {
    await markOrderPaid(order.id, p.id, p.source?.type ?? "unknown");
  } else if (p.status === "failed") {
    await failOrder(order.id);
  }
  return NextResponse.json({ ok: true });
}
