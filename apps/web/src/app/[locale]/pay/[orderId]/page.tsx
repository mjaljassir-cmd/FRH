import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@events/db";
import { env } from "@/lib/env";
import { fmtMoney, loc } from "@/lib/i18n-helpers";
import { verifyPaymentToken } from "@/lib/payment-link";
import { Alert } from "@/components/ui";
import { MoyasarForm } from "./moyasar-form";

export const dynamic = "force-dynamic";

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; orderId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { locale, orderId } = await params;
  setRequestLocale(locale);
  const { t: token } = await searchParams;
  const t = await getTranslations("pay");

  const userId = token ? await verifyPaymentToken(token, orderId) : null;
  const order = userId
    ? await prisma.order.findFirst({
        where: { id: orderId, userId },
        include: { event: true, items: { include: { ticketType: true } } },
      })
    : null;

  const shell = (body: React.ReactNode) => (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-8">{body}</div>
  );

  if (!order) return shell(<Alert kind="error">{t("invalidLink")}</Alert>);
  if (order.status === "PAID") return shell(<Alert kind="success">{t("alreadyPaid")}</Alert>);
  if (order.status !== "PENDING" || order.expiresAt < new Date()) {
    return shell(<Alert kind="error">{t("expired")}</Alert>);
  }

  const callbackUrl = `${env.appUrl}/api/payments/moyasar/callback?order=${order.id}&locale=${locale}`;

  return shell(
    <>
      <h1 className="mb-1 text-xl font-bold">{t("title")}</h1>
      <p className="mb-4 text-slate-600">{loc(order.event, "title", locale)}</p>
      <div className="card mb-5 space-y-2 text-sm">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between">
            <span>
              {loc(i.ticketType, "name", locale)} × {i.quantity}
            </span>
            <span>{fmtMoney(i.unitPrice * i.quantity, locale)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 text-slate-500">
          <span>{t("vatIncluded", { rate: Number(order.vatRate) })}</span>
          <span>{fmtMoney(order.vatAmount, locale)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>{t("total")}</span>
          <span>{fmtMoney(order.totalAmount, locale)}</span>
        </div>
      </div>
      <p className="mb-4 text-xs text-slate-500">{t("holdNotice")}</p>
      {env.moyasar.mock ? (
        <div className="space-y-3">
          <Alert kind="warning">{t("mockNotice")}</Alert>
          <a
            className="btn-success w-full"
            href={`${callbackUrl}&id=mock_${order.id}_paid&status=paid`}
            data-testid="mock-pay-success"
          >
            {t("mockSuccess")}
          </a>
          <a className="btn-danger w-full" href={`${callbackUrl}&id=mock_${order.id}_failed&status=failed`}>
            {t("mockFail")}
          </a>
        </div>
      ) : !env.moyasar.publishableKey ? (
        <Alert kind="error">{t("notConfigured")}</Alert>
      ) : (
        <MoyasarForm
          amount={order.totalAmount}
          description={`${loc(order.event, "title", "en")} #${order.receiptNumber}`}
          publishableKey={env.moyasar.publishableKey}
          callbackUrl={callbackUrl}
          orderId={order.id}
          locale={locale}
          applePayLabel={process.env.MOYASAR_APPLE_PAY_LABEL || "Events"}
        />
      )}
    </>,
  );
}
