import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { redirect } from "@/i18n/navigation";
import { EventForm } from "@/components/event-form";
import { PageHeader } from "@/components/ui";
import { requireOrganizerPage } from "@/lib/session";
import { toFormValues } from "@/lib/event-form-values";
import { saveEventAction } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditEvent({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { organizer } = await requireOrganizerPage(locale, { approved: true });
  const t = await getTranslations("organizer.events");
  const e = await prisma.event.findFirst({
    where: { id, organizerId: organizer.id },
    include: { ticketTypes: { orderBy: { sortOrder: "asc" } }, images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!e) notFound();
  if (!["DRAFT", "REJECTED", "PENDING_REVIEW"].includes(e.status)) redirect({ href: `/organizer/events/${id}`, locale });
  const [categories, cities] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title={t("edit")} subtitle={t("reviewNotice")} />
      <EventForm action={saveEventAction} categories={categories} cities={cities} initial={toFormValues(e)} />
    </>
  );
}
