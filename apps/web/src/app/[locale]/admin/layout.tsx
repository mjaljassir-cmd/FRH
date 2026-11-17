import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DashboardShell } from "@/components/shell";
import { requireAdminPage } from "@/lib/session";

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireAdminPage(locale);
  const t = await getTranslations("admin.nav");
  const nav = [
    { href: "/admin", label: t("dashboard") },
    { href: "/admin/organizers", label: t("organizers") },
    { href: "/admin/events", label: t("events") },
    { href: "/admin/orders", label: t("orders") },
    { href: "/admin/refunds", label: t("refunds") },
    { href: "/admin/payouts", label: t("payouts") },
    { href: "/admin/notifications", label: t("notifications") },
    { href: "/admin/customers", label: t("customers") },
    { href: "/admin/categories", label: t("categories") },
    { href: "/admin/cities", label: t("cities") },
    { href: "/admin/settings", label: t("settings") },
  ];
  return (
    <DashboardShell nav={nav} userName={user.name} roleLabel={t("role")}>
      {children}
    </DashboardShell>
  );
}
