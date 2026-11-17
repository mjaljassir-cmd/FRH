import { getTranslations, setRequestLocale } from "next-intl/server";
import { Alert } from "@/components/ui";

/** Final page after payment. The mobile app watches for this URL and closes the in-app browser. */
export default async function PayResult({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { status } = await searchParams;
  const t = await getTranslations("pay");
  const kind = status === "paid" ? "success" : "error";
  const msg = status === "paid" ? t("resultPaid") : status === "refunded" ? t("resultSoldOutRefunded") : t("resultFailed");
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <Alert kind={kind}>{msg}</Alert>
      <p className="mt-4 text-sm text-slate-500">{t("returnToApp")}</p>
    </div>
  );
}
