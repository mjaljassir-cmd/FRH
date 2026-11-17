"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, type Prisma } from "@events/db";
import { sarToHalalas } from "@events/shared";
import { HttpError, requireUser } from "@/lib/auth";
import { safeAction, type ActionState } from "@/lib/action-state";
import { cancelEvent, organizerBalance, retryRefund } from "@/lib/orders";
import { sendPushToUsers } from "@/lib/push";
import { fromRiyadhInput } from "@/lib/i18n-helpers";

const admin = () => requireUser("ADMIN");
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ---------- Organizers ----------

export async function setOrganizerStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await admin();
    const id = str(fd, "id");
    const status = z.enum(["APPROVED", "REJECTED", "SUSPENDED"]).parse(str(fd, "status"));
    const reason = str(fd, "reason");
    if (status === "REJECTED" && !reason) throw new HttpError(400, "REASON_REQUIRED");
    await prisma.organizer.update({
      where: { id },
      data: { status, rejectionReason: status === "REJECTED" ? reason : null },
    });
    revalidatePath("/[locale]/admin/organizers", "layout");
  });
}

export async function setCommissionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await admin();
    const rate = z.coerce.number().min(0).max(100).parse(fd.get("commissionRate"));
    await prisma.organizer.update({ where: { id: str(fd, "id") }, data: { commissionRate: rate } });
    revalidatePath("/[locale]/admin/organizers", "layout");
  });
}

export async function recordPayoutAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const user = await admin();
    const organizerId = str(fd, "organizerId");
    const amount = sarToHalalas(z.coerce.number().positive().parse(fd.get("amount")));
    const reference = z.string().min(1).max(100).parse(str(fd, "reference"));
    const transferredAt = fromRiyadhInput(str(fd, "transferredAt")) ?? new Date();
    const bal = await organizerBalance(organizerId);
    if (amount > bal.due) throw new HttpError(400, "PAYOUT_EXCEEDS_BALANCE");
    await prisma.payout.create({
      data: { organizerId, amount, reference, transferredAt, note: str(fd, "note") || null, createdById: user.id },
    });
    revalidatePath("/[locale]/admin", "layout");
  });
}

// ---------- Events ----------

export async function reviewEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await admin();
    const id = str(fd, "id");
    const decision = z.enum(["approve", "reject"]).parse(str(fd, "decision"));
    const ev = await prisma.event.findUnique({ where: { id }, include: { ticketTypes: true, organizer: true } });
    if (!ev || ev.status !== "PENDING_REVIEW") throw new HttpError(400, "INVALID_STATE");
    if (decision === "approve") {
      if (ev.organizer.status !== "APPROVED") throw new HttpError(400, "ORGANIZER_NOT_APPROVED");
      await prisma.event.update({ where: { id }, data: { status: "PUBLISHED", rejectionReason: null } });
    } else {
      const reason = str(fd, "reason");
      if (!reason) throw new HttpError(400, "REASON_REQUIRED");
      await prisma.event.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason } });
    }
    revalidatePath("/[locale]/admin/events", "layout");
  });
}

export async function setFeaturedAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await admin();
    const id = str(fd, "id");
    const featured = str(fd, "featured") === "1";
    const until = fromRiyadhInput(str(fd, "featuredUntil"));
    const ev = await prisma.event.findUnique({ where: { id } });
    if (!ev) throw new HttpError(404, "NOT_FOUND");
    if (featured && ev.status !== "PUBLISHED") throw new HttpError(400, "ONLY_PUBLISHED_CAN_BE_FEATURED");
    await prisma.event.update({
      where: { id },
      data: { isFeatured: featured, featuredUntil: featured ? until : null },
    });
    revalidatePath("/[locale]/admin/events", "layout");
  });
}

export async function adminCancelEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await admin();
    const id = str(fd, "id");
    const ev = await prisma.event.findUnique({ where: { id } });
    if (!ev || ev.status === "CANCELLED" || ev.status === "ENDED") throw new HttpError(400, "INVALID_STATE");
    const r = await cancelEvent(id);
    revalidatePath("/[locale]/admin", "layout");
    if (r.failed) return { ok: true, error: "SOME_REFUNDS_FAILED", detail: String(r.failed) };
  });
}

// ---------- Refunds ----------

export async function retryRefundAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await admin();
    await retryRefund(str(fd, "id"));
    revalidatePath("/[locale]/admin/refunds", "page");
  });
}

// ---------- Categories & cities ----------

const nameSchema = z.object({
  nameAr: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
  sortOrder: z.coerce.number().int().default(0),
});

export async function saveCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await admin();
    const data = nameSchema.parse(Object.fromEntries(fd));
    const id = str(fd, "id");
    const isActive = fd.get("isActive") === "on";
    if (id) await prisma.category.update({ where: { id }, data: { ...data, isActive } });
    else await prisma.category.create({ data: { ...data, isActive: true } });
    revalidatePath("/[locale]/admin/categories", "page");
  });
}

export async function saveCityAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await admin();
    const data = nameSchema
      .extend({
        lat: z.coerce.number().min(-90).max(90).optional().or(z.literal("").transform(() => undefined)),
        lng: z.coerce.number().min(-180).max(180).optional().or(z.literal("").transform(() => undefined)),
      })
      .parse(Object.fromEntries(fd));
    const id = str(fd, "id");
    const isActive = fd.get("isActive") === "on";
    const payload = { ...data, lat: data.lat ?? null, lng: data.lng ?? null };
    if (id) await prisma.city.update({ where: { id }, data: { ...payload, isActive } });
    else await prisma.city.create({ data: { ...payload, isActive: true } });
    revalidatePath("/[locale]/admin/cities", "page");
  });
}

// ---------- Customers ----------

export async function setUserActiveAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await admin();
    const id = str(fd, "id");
    const active = str(fd, "active") === "1";
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== "CUSTOMER") throw new HttpError(400, "INVALID_STATE");
    await prisma.user.update({ where: { id }, data: { isActive: active } });
    if (!active) await prisma.pushToken.deleteMany({ where: { userId: id } });
    revalidatePath("/[locale]/admin/customers", "page");
  });
}

// ---------- Notifications ----------

const notificationSchema = z.object({
  titleAr: z.string().trim().min(1).max(100),
  titleEn: z.string().trim().min(1).max(100),
  bodyAr: z.string().trim().min(1).max(500),
  bodyEn: z.string().trim().min(1).max(500),
  target: z.enum(["ALL", "CITY", "CATEGORY"]),
  cityId: z.string().optional(),
  categoryId: z.string().optional(),
  eventId: z.string().optional(),
});

export async function sendNotificationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const user = await admin();
    const n = notificationSchema.parse(Object.fromEntries(fd));
    if (n.target === "CITY" && !n.cityId) throw new HttpError(400, "CITY_REQUIRED");
    if (n.target === "CATEGORY" && !n.categoryId) throw new HttpError(400, "CATEGORY_REQUIRED");
    if (n.eventId) {
      const ev = await prisma.event.findFirst({ where: { id: n.eventId, status: "PUBLISHED" } });
      if (!ev) throw new HttpError(400, "INVALID_EVENT");
    }

    let where: Prisma.UserWhereInput = {
      role: "CUSTOMER",
      isActive: true,
    };
    if (n.target === "CITY") where = { ...where, cityId: n.cityId };
    if (n.target === "CATEGORY") {
      // Customers interested in a category: bought tickets for, or saved, an event in it
      where = {
        ...where,
        OR: [
          { orders: { some: { status: "PAID", event: { categoryId: n.categoryId } } } },
          { favorites: { some: { event: { categoryId: n.categoryId } } } },
        ],
      };
    }
    const users = await prisma.user.findMany({ where, select: { id: true } });
    const recipients = await sendPushToUsers(
      users.map((u) => u.id),
      {
        titleAr: n.titleAr,
        titleEn: n.titleEn,
        bodyAr: n.bodyAr,
        bodyEn: n.bodyEn,
        data: n.eventId ? { type: "event", eventId: n.eventId } : { type: "general" },
      },
    );
    await prisma.notification.create({
      data: {
        titleAr: n.titleAr,
        titleEn: n.titleEn,
        bodyAr: n.bodyAr,
        bodyEn: n.bodyEn,
        target: n.target,
        cityId: n.target === "CITY" ? n.cityId : null,
        categoryId: n.target === "CATEGORY" ? n.categoryId : null,
        eventId: n.eventId || null,
        recipients,
        sentById: user.id,
      },
    });
    revalidatePath("/[locale]/admin/notifications", "page");
    return { ok: true, detail: String(recipients) };
  });
}

// ---------- Settings ----------

export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    await admin();
    const s = z
      .object({
        nameAr: z.string().trim().min(1).max(100),
        nameEn: z.string().trim().min(1).max(100),
        vatNumber: z.string().trim().max(20),
        addressAr: z.string().trim().max(300),
        addressEn: z.string().trim().max(300),
        vatRate: z.coerce.number().min(0).max(100),
      })
      .parse(Object.fromEntries(fd));
    await prisma.platformSettings.upsert({ where: { id: 1 }, update: s, create: { id: 1, ...s } });
    revalidatePath("/[locale]/admin/settings", "page");
  });
}
