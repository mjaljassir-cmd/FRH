import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DashboardShell } from "@/components/shell";
import { redirect } from "@/i18n/navigation";
import { pageUser } from "@/lib/session";

export default async function OrganizerLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await pageUser(locale);
  if (user.role === "ADMIN") redirect({ href: "/admin", locale });
  const t = await getTranslations("organizer.nav");
  const nav =
    user.role === "STAFF"
      ? [{ href: "/organizer/scan", label: t("scan") }]
      : [
          { href: "/organizer", label: t("dashboard") },
          { href: "/organizer/events", label: t("events") },
          { href: "/organizer/scan", label: t("scan") },
          { href: "/organizer/balance", label: t("balance") },
          { href: "/organizer/staff", label: t("staff") },
          { href: "/organizer/profile", label: t("profile") },
        ];
  return (
    <DashboardShell nav={nav} userName={user.name} roleLabel={user.role === "STAFF" ? t("staffRole") : t("role")}>
      {children}
    </DashboardShell>
  );
}
