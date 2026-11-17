import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { redirect } from "@/i18n/navigation";
import { PageHeader, Alert } from "@/components/ui";
import { loc } from "@/lib/i18n-helpers";
import { pageUser } from "@/lib/session";
import { scannerOrganizerId } from "@/lib/checkin";
import { Scanner } from "./scanner";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { event } = await searchParams;
  const user = await pageUser(locale);
  if (user.role !== "ORGANIZER" && user.role !== "STAFF") redirect({ href: "/login", locale });
  const t = await getTranslations("organizer.scan");
  const organizerId = await scannerOrganizerId(user);
  if (!organizerId) return <Alert kind="error">{t("notAllowed")}</Alert>;
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const events = await prisma.event.findMany({
    where: { organizerId, status: { in: ["PUBLISHED", "ENDED"] }, endAt: { gt: since } },
    orderBy: { startAt: "asc" },
  });
  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Scanner events={events.map((e) => ({ id: e.id, title: loc(e, "title", locale) }))} initialEvent={event ?? ""} />
    </>
  );
}
