"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { prisma } from "@events/db";
import { emailSchema, passwordSchema, sarToHalalas } from "@events/shared";
import { redirect } from "@/i18n/navigation";
import { HttpError, hashPassword, requireUser } from "@/lib/auth";
import { safeAction, type ActionState } from "@/lib/action-state";
import { fromRiyadhInput } from "@/lib/i18n-helpers";
import { cancelEvent } from "@/lib/orders";
import { saveUpload } from "@/lib/storage";
import { checkInTicket, type CheckInResult } from "@/lib/checkin";

async function owner(approved = true) {
  const user = await requireUser("ORGANIZER");
  const organizer = await prisma.organizer.findUnique({ where: { ownerId: user.id } });
  if (!organizer) throw new HttpError(403, "FORBIDDEN");
  if (approved && organizer.status !== "APPROVED") throw new HttpError(403, "ORGANIZER_NOT_APPROVED");
  return { user, organizer };
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

const ticketSchema = z.object({
  id: z.string().optional(),
  nameAr: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
  price: z.coerce.number().min(0).max(1_000_000),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  salesStartAt: z.string().optional(),
  salesEndAt: z.string().optional(),
});

const eventSchema = z
  .object({
    titleAr: z.string().trim().min(3).max(200),
    titleEn: z.string().trim().min(3).max(200),
    descriptionAr: z.string().trim().min(10).max(10000),
    descriptionEn: z.string().trim().min(10).max(10000),
    categoryId: z.string().min(1),
    cityId: z.string().min(1),
    venueName: z.string().trim().min(2).max(200),
    address: z.string().trim().min(2).max(300),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    startAt: z.string().min(1),
    endAt: z.string().min(1),
    refundPolicyType: z.enum(["NO_REFUND", "REFUNDABLE_UNTIL"]),
    refundHoursBefore: z.coerce.number().int().min(0).max(24 * 90).optional(),
  })
  .refine((v) => v.refundPolicyType === "NO_REFUND" || v.refundHoursBefore != null, { path: ["refundHoursBefore"] });

/** Ticket rows arrive as tickets[0][nameAr], tickets[0][price], ... */
function parseTickets(fd: FormData) {
  const rows = new Map<number, Record<string, string>>();
  for (const [k, v] of fd.entries()) {
    const m = k.match(/^tickets\[(\d+)\]\[(\w+)\]$/);
    if (!m || typeof v !== "string") continue;
    const i = Number(m[1]);
    if (!rows.has(i)) rows.set(i, {});
    rows.get(i)![m[2]] = v;
  }
  return [...rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, r]) => r)
    .filter((r) => r.nameAr || r.nameEn || r.price || r.quantity)
    .map((r) => ticketSchema.parse({ ...r, id: r.id || undefined }));
}

export async function saveEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = await getLocale();
  let redirectTo = "";
  const res = await safeAction(async () => {
    const { organizer } = await owner();
    const id = str(fd, "id");
    const submit = str(fd, "intent") === "submit";
    const data = eventSchema.parse(Object.fromEntries(fd));
    const tickets = parseTickets(fd);
    if (tickets.length === 0) throw new HttpError(400, "TICKETS_REQUIRED");

    const startAt = fromRiyadhInput(data.startAt);
    const endAt = fromRiyadhInput(data.endAt);
    if (!startAt || !endAt || endAt <= startAt) throw new HttpError(400, "INVALID_DATES");
    if (startAt < new Date()) throw new HttpError(400, "START_IN_PAST");

    const [cat, city] = await Promise.all([
      prisma.category.findFirst({ where: { id: data.categoryId, isActive: true } }),
      prisma.city.findFirst({ where: { id: data.cityId, isActive: true } }),
    ]);
    if (!cat || !city) throw new HttpError(400, "VALIDATION_ERROR");

    let existing = null;
    if (id) {
      existing = await prisma.event.findFirst({ where: { id, organizerId: organizer.id }, include: { ticketTypes: true } });
      if (!existing) throw new HttpError(404, "NOT_FOUND");
      if (!["DRAFT", "REJECTED", "PENDING_REVIEW"].includes(existing.status)) throw new HttpError(400, "EVENT_LOCKED");
    }

    // Images
    const cover = fd.get("cover");
    const coverImageUrl = cover instanceof File && cover.size > 0 ? await saveUpload(cover, "events") : existing?.coverImageUrl ?? null;
    if (!coverImageUrl) throw new HttpError(400, "COVER_REQUIRED");
    const gallery = fd.getAll("gallery").filter((f): f is File => f instanceof File && f.size > 0);
    if (gallery.length > 10) throw new HttpError(400, "TOO_MANY_IMAGES");
    const galleryUrls = await Promise.all(gallery.map((f) => saveUpload(f, "events")));
    const removeImages = fd.getAll("removeImage").map(String);

    const ticketRows = tickets.map((tk, i) => {
      const salesStartAt = tk.salesStartAt ? fromRiyadhInput(tk.salesStartAt) : null;
      const salesEndAt = tk.salesEndAt ? fromRiyadhInput(tk.salesEndAt) : null;
      if (salesStartAt && salesEndAt && salesEndAt <= salesStartAt) throw new HttpError(400, "INVALID_SALES_WINDOW");
      return {
        id: tk.id,
        nameAr: tk.nameAr,
        nameEn: tk.nameEn,
        price: sarToHalalas(tk.price),
        quantity: tk.quantity,
        salesStartAt,
        salesEndAt,
        sortOrder: i,
      };
    });

    const eventData = {
      titleAr: data.titleAr,
      titleEn: data.titleEn,
      descriptionAr: data.descriptionAr,
      descriptionEn: data.descriptionEn,
      categoryId: data.categoryId,
      cityId: data.cityId,
      venueName: data.venueName,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      startAt,
      endAt,
      refundPolicyType: data.refundPolicyType,
      refundHoursBefore: data.refundPolicyType === "REFUNDABLE_UNTIL" ? data.refundHoursBefore ?? 0 : null,
      coverImageUrl,
      status: submit ? ("PENDING_REVIEW" as const) : existing?.status === "PENDING_REVIEW" ? ("PENDING_REVIEW" as const) : ("DRAFT" as const),
    };

    const saved = await prisma.$transaction(async (tx) => {
      const ev = existing
        ? await tx.event.update({ where: { id: existing.id }, data: eventData })
        : await tx.event.create({ data: { ...eventData, organizerId: organizer.id } });

      // Sync ticket types (events are not on sale yet, so no sold tickets exist)
      const keepIds = ticketRows.filter((r) => r.id).map((r) => r.id!);
      await tx.ticketType.deleteMany({ where: { eventId: ev.id, id: { notIn: keepIds } } });
      for (const r of ticketRows) {
        const { id: ticketId, ...rest } = r;
        if (ticketId && existing?.ticketTypes.some((t) => t.id === ticketId)) {
          await tx.ticketType.update({ where: { id: ticketId }, data: rest });
        } else {
          await tx.ticketType.create({ data: { ...rest, eventId: ev.id } });
        }
      }
      if (removeImages.length) await tx.eventImage.deleteMany({ where: { eventId: ev.id, id: { in: removeImages } } });
      if (galleryUrls.length) {
        const count = await tx.eventImage.count({ where: { eventId: ev.id } });
        await tx.eventImage.createMany({ data: galleryUrls.map((url, i) => ({ eventId: ev.id, url, sortOrder: count + i })) });
      }
      return ev;
    });
    revalidatePath("/[locale]/organizer", "layout");
    redirectTo = `/organizer/events/${saved.id}`;
  });
  if (redirectTo) redirect({ href: redirectTo, locale });
  return res;
}

export async function submitEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const { organizer } = await owner();
    const ev = await prisma.event.findFirst({
      where: { id: str(fd, "id"), organizerId: organizer.id },
      include: { _count: { select: { ticketTypes: true } } },
    });
    if (!ev || !["DRAFT", "REJECTED"].includes(ev.status)) throw new HttpError(400, "INVALID_STATE");
    if (ev._count.ticketTypes === 0) throw new HttpError(400, "TICKETS_REQUIRED");
    if (ev.startAt < new Date()) throw new HttpError(400, "START_IN_PAST");
    await prisma.event.update({ where: { id: ev.id }, data: { status: "PENDING_REVIEW" } });
    revalidatePath("/[locale]/organizer", "layout");
  });
}

/** Published events: organizer may add capacity or new ticket types, but not lower below sold. */
export async function updatePublishedTicketsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const { organizer } = await owner();
    const ev = await prisma.event.findFirst({
      where: { id: str(fd, "id"), organizerId: organizer.id, status: "PUBLISHED" },
      include: { ticketTypes: true },
    });
    if (!ev) throw new HttpError(400, "INVALID_STATE");
    const rows = parseTickets(fd);
    await prisma.$transaction(async (tx) => {
      for (const [i, r] of rows.entries()) {
        const existing = r.id ? ev.ticketTypes.find((t) => t.id === r.id) : undefined;
        const salesStartAt = r.salesStartAt ? fromRiyadhInput(r.salesStartAt) : null;
        const salesEndAt = r.salesEndAt ? fromRiyadhInput(r.salesEndAt) : null;
        if (existing) {
          if (r.quantity < existing.sold) throw new HttpError(400, "QUANTITY_BELOW_SOLD");
          // Prices of tickets already on sale are fixed
          await tx.ticketType.update({
            where: { id: existing.id },
            data: { quantity: r.quantity, salesStartAt, salesEndAt },
          });
        } else {
          await tx.ticketType.create({
            data: {
              eventId: ev.id,
              nameAr: r.nameAr,
              nameEn: r.nameEn,
              price: sarToHalalas(r.price),
              quantity: r.quantity,
              salesStartAt,
              salesEndAt,
              sortOrder: ev.ticketTypes.length + i,
            },
          });
        }
      }
    });
    revalidatePath("/[locale]/organizer", "layout");
  });
}

export async function deleteDraftAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = await getLocale();
  let done = false;
  const res = await safeAction(async () => {
    const { organizer } = await owner();
    const ev = await prisma.event.findFirst({ where: { id: str(fd, "id"), organizerId: organizer.id } });
    if (!ev || !["DRAFT", "REJECTED"].includes(ev.status)) throw new HttpError(400, "INVALID_STATE");
    const orders = await prisma.order.count({ where: { eventId: ev.id } });
    if (orders > 0) throw new HttpError(400, "INVALID_STATE");
    await prisma.event.delete({ where: { id: ev.id } });
    done = true;
  });
  if (done) redirect({ href: "/organizer/events", locale });
  return res;
}

export async function organizerCancelEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const { organizer } = await owner();
    const ev = await prisma.event.findFirst({ where: { id: str(fd, "id"), organizerId: organizer.id } });
    if (!ev || !["PUBLISHED", "PENDING_REVIEW"].includes(ev.status)) throw new HttpError(400, "INVALID_STATE");
    const r = await cancelEvent(ev.id);
    revalidatePath("/[locale]/organizer", "layout");
    if (r.failed) return { ok: true, error: "SOME_REFUNDS_FAILED", detail: String(r.failed) };
  });
}

// ---------- Staff ----------

export async function addStaffAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const { organizer } = await owner();
    const body = z
      .object({ name: z.string().trim().min(2).max(100), email: emailSchema, password: passwordSchema })
      .parse(Object.fromEntries(fd));
    if (await prisma.user.findUnique({ where: { email: body.email } })) throw new HttpError(409, "EMAIL_TAKEN");
    await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        role: "STAFF",
        passwordHash: await hashPassword(body.password),
        staffOf: { create: { organizerId: organizer.id } },
      },
    });
    revalidatePath("/[locale]/organizer/staff", "page");
  });
}

export async function removeStaffAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const { organizer } = await owner();
    const s = await prisma.staffMember.findFirst({ where: { id: str(fd, "id"), organizerId: organizer.id } });
    if (!s) throw new HttpError(404, "NOT_FOUND");
    // Keep the user row (it is referenced by check-in history) but disable it
    await prisma.$transaction([
      prisma.staffMember.delete({ where: { id: s.id } }),
      prisma.user.update({ where: { id: s.userId }, data: { isActive: false } }),
    ]);
    revalidatePath("/[locale]/organizer/staff", "page");
  });
}

// ---------- Profile ----------

export async function updateOrganizerProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return safeAction(async () => {
    const { organizer } = await owner(false);
    const body = z
      .object({
        name: z.string().trim().min(2).max(150),
        description: z.string().trim().max(2000).optional(),
        bankName: z.string().trim().min(2).max(100),
        accountHolderName: z.string().trim().min(2).max(150),
        iban: z
          .string()
          .trim()
          .transform((s) => s.replace(/\s+/g, "").toUpperCase())
          .pipe(z.string().regex(/^SA\d{22}$/)),
      })
      .parse(Object.fromEntries(fd));
    const logo = fd.get("logo");
    const logoUrl = logo instanceof File && logo.size > 0 ? await saveUpload(logo, "organizers") : undefined;
    const doc = fd.get("commercialRegFile");
    const docUrl = doc instanceof File && doc.size > 0 ? await saveUpload(doc, "docs", true) : undefined;
    await prisma.organizer.update({
      where: { id: organizer.id },
      data: {
        ...body,
        description: body.description || null,
        ...(logoUrl ? { logoUrl } : {}),
        ...(docUrl ? { commercialRegFileUrl: docUrl } : {}),
        // A rejected organizer that updates details goes back to review
        ...(organizer.status === "REJECTED" ? { status: "PENDING", rejectionReason: null } : {}),
      },
    });
    revalidatePath("/[locale]/organizer", "layout");
  });
}

// ---------- Scanning ----------

export async function scanTicketAction(payload: string, eventId?: string): Promise<
  | (Exclude<CheckInResult, { status: "ALREADY_USED" }> | { status: "ALREADY_USED"; ticket: unknown; checkedInAt: string })
  | { status: "ERROR" }
> {
  try {
    const user = await requireUser("ORGANIZER", "STAFF");
    const r = await checkInTicket(payload, user, eventId || undefined);
    if (r.status === "ALREADY_USED") return { ...r, checkedInAt: r.checkedInAt.toISOString() };
    return r;
  } catch {
    return { status: "ERROR" };
  }
}
