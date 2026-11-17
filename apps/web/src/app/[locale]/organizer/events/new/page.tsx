import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { EventForm } from "@/components/event-form";
import { PageHeader } from "@/components/ui";
import { requireOrganizerPage } from "@/lib/session";
import { saveEventAction } from "../../actions";

export default async function NewEvent({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireOrganizerPage(locale, { approved: true });
  const t = await getTranslations("organizer.events");
  const [categories, cities] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title={t("new")} subtitle={t("reviewNotice")} />
      <EventForm action={saveEventAction} categories={categories} cities={cities} />
    </>
  );
}
