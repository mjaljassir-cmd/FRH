import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/client";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const c = await getTranslations("common");
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="text-xl font-bold text-brand-700">{c("appName")}</span>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <Link href="/login" className="btn-secondary btn-sm">
            {c("login")}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{t("subtitle")}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn-primary">
            {t("registerCta")}
          </Link>
          <Link href="/login" className="btn-secondary">
            {c("login")}
          </Link>
        </div>
        <div className="mt-16 grid gap-4 text-start sm:grid-cols-3">
          {(["f1", "f2", "f3"] as const).map((k) => (
            <div key={k} className="card">
              <h3 className="font-bold">{t(`${k}Title`)}</h3>
              <p className="mt-2 text-sm text-slate-600">{t(`${k}Body`)}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
