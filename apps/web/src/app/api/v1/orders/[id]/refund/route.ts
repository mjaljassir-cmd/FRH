import { prisma } from "@events/db";
import { HttpError, requireUser } from "@/lib/auth";
import { json, route } from "@/lib/api";
import { refundOrder } from "@/lib/orders";

export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const { id } = await params;
  const user = await requireUser("CUSTOMER");
  const order = await prisma.order.findFirst({ where: { id, userId: user.id } });
  if (!order) throw new HttpError(404, "NOT_FOUND");
  await refundOrder(order.id, "CUSTOMER_REQUEST");
  return json({ ok: true });
});
