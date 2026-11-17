import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/client";

export async function AuthShell({ title, children, wide = false }: { title: string; children: ReactNode; wide?: boolean }) {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-700">
            {t("appName")}
          </Link>
          <LocaleSwitcher />
        </div>
        <div className="card">
          <h1 className="mb-5 text-xl font-bold">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
