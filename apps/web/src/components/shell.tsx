import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./client";
import { logoutAction } from "@/app/[locale]/auth-actions";

export async function DashboardShell({
  nav,
  userName,
  roleLabel,
  children,
}: {
  nav: { href: string; label: string }[];
  userName: string;
  roleLabel: string;
  children: ReactNode;
}) {
  const t = await getTranslations("common");
  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-e">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/" className="text-lg font-bold text-brand-700">
            {t("appName")}
          </Link>
          <span className="text-xs text-slate-500">{roleLabel}</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <span className="text-sm text-slate-600">{userName}</span>
          <LocaleSwitcher />
          <form action={logoutAction}>
            <button className="btn-secondary btn-sm">{t("logout")}</button>
          </form>
        </header>
        <main className="mx-auto max-w-6xl p-5">{children}</main>
      </div>
    </div>
  );
}
