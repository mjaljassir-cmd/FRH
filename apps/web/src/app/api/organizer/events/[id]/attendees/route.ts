import { prisma } from "@events/db";
import { HttpError, requireUser } from "@/lib/auth";
import { route } from "@/lib/api";

const esc = (v: unknown) => {
  const s = String(v ?? "");
  // Prevent spreadsheet formula injection
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const GET = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { id } = await params;
  const ar = new URL(req.url).searchParams.get("locale") !== "en";
  const user = await requireUser("ORGANIZER");
  const organizer = await prisma.organizer.findUnique({ where: { ownerId: user.id } });
  const event = organizer ? await prisma.event.findFirst({ where: { id, organizerId: organizer.id } }) : null;
  if (!event) throw new HttpError(404, "NOT_FOUND");
  const tickets = await prisma.ticket.findMany({
    where: { order: { eventId: id, status: { in: ["PAID", "REFUNDED"] } } },
    include: { order: { include: { user: true } }, orderItem: { include: { ticketType: true } } },
    orderBy: { createdAt: "asc" },
  });
  const header = ar
    ? ["رقم الطلب", "الاسم", "البريد", "الجوال", "نوع التذكرة", "السعر", "حالة التذكرة", "وقت الدخول"]
    : ["Order #", "Name", "Email", "Phone", "Ticket type", "Price (SAR)", "Ticket status", "Checked in at"];
  const lines = tickets.map((t) =>
    [
      t.order.receiptNumber,
      t.order.user.name,
      t.order.user.email,
      t.order.user.phone,
      ar ? t.orderItem.ticketType.nameAr : t.orderItem.ticketType.nameEn,
      (t.orderItem.unitPrice / 100).toFixed(2),
      t.status,
      t.checkedInAt?.toISOString() ?? "",
    ]
      .map(esc)
      .join(","),
  );
  const csv = "﻿" + [header.map(esc).join(","), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendees-${id}.csv"`,
    },
  });
});
