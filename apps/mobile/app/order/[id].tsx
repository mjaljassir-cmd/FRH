import { useState } from "react";
import { Alert, Dimensions, FlatList, ScrollView, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useLocalSearchParams } from "expo-router";
import { useI18n } from "@/i18n";
import { ApiError, api } from "@/lib/api";
import { dateOnly, dateTime, money } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";
import type { OrderDetail } from "@/lib/types";
import { Button, Card, ErrorText, ErrorView, Loading, Section } from "@/components/ui";
import { colors } from "@/components/theme";

const W = Dimensions.get("window").width;

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, L, locale } = useI18n();
  const o = useFetch<{ order: OrderDetail }>(`/api/v1/orders/${id}`);
  const [refunding, setRefunding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (o.loading && !o.data) return <Loading />;
  if (o.error || !o.data) return <ErrorView code={o.error ?? "SERVER_ERROR"} onRetry={o.reload} />;
  const order = o.data.order;
  const ev = order.event;

  const requestRefund = () =>
    Alert.alert(t("tickets.requestRefund"), t("tickets.refundConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("tickets.requestRefund"),
        style: "destructive",
        onPress: async () => {
          setRefunding(true);
          setError(null);
          try {
            await api(`/api/v1/orders/${order.id}/refund`, { method: "POST" });
            Alert.alert(t("tickets.refundDone"));
            o.reload();
          } catch (e) {
            setError(e instanceof ApiError ? e.code : "SERVER_ERROR");
          } finally {
            setRefunding(false);
          }
        },
      },
    ]);

  const L2 = (ar: string, en: string) => (locale === "en" ? en : ar);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", textAlign: "left" }}>{L(ev as never, "title")}</Text>
      <Text style={{ color: colors.muted, marginTop: 4, textAlign: "left" }}>
        {dateTime(ev.startAt, locale)} · {ev.venueName}, {L2(ev.cityAr, ev.cityEn)}
      </Text>
      {ev.status === "CANCELLED" && <Text style={{ color: colors.danger, marginTop: 8, textAlign: "left" }}>{t("tickets.eventCancelled")}</Text>}

      {order.status === "PAID" && (
        <>
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 16 }}>{t("tickets.showAtGate")}</Text>
          <FlatList
            horizontal
            pagingEnabled
            data={order.tickets}
            keyExtractor={(tk) => tk.id}
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16 }}
            renderItem={({ item, index }) => (
              <View style={{ width: W, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Card style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Text style={{ color: colors.muted, marginBottom: 6 }}>
                    {t("tickets.ticketOf", { n: index + 1, total: order.tickets.length })}
                  </Text>
                  <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 14 }}>{L2(item.typeAr, item.typeEn)}</Text>
                  <View style={{ opacity: item.status === "VALID" ? 1 : 0.25 }}>
                    {item.qr && <QRCode value={item.qr} size={Math.min(W - 120, 260)} />}
                  </View>
                  <Text
                    style={{
                      marginTop: 14,
                      fontWeight: "700",
                      color: item.status === "VALID" ? colors.success : colors.muted,
                    }}
                  >
                    {item.status === "USED"
                      ? `${t("tickets.used")}${item.checkedInAt ? ` · ${dateTime(item.checkedInAt, locale)}` : ""}`
                      : t("tickets.valid")}
                  </Text>
                </Card>
              </View>
            )}
          />
        </>
      )}
      {order.status === "REFUNDED" && <Text style={{ color: colors.danger, marginTop: 12, fontWeight: "700", textAlign: "left" }}>{t("tickets.refunded")}</Text>}

      <Section title={t("tickets.receipt")}>
        <Card>
          <Row k={t("tickets.receiptNo", { n: order.receiptNumber })} v={order.paidAt ? dateOnly(order.paidAt, locale) : ""} />
          <Row k={t("tickets.seller")} v={L2(order.seller.nameAr, order.seller.nameEn)} />
          {!!order.seller.vatNumber && <Row k={t("tickets.vatNumber")} v={order.seller.vatNumber} />}
          {!!L2(order.seller.addressAr, order.seller.addressEn) && <Row k="" v={L2(order.seller.addressAr, order.seller.addressEn)} />}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          {order.items.map((i, idx) => (
            <Row key={idx} k={`${L2(i.nameAr, i.nameEn)} × ${i.quantity}`} v={money(i.unitPrice * i.quantity, locale)} />
          ))}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          <Row k={t("tickets.subtotal")} v={money(order.subtotalAmount, locale)} />
          <Row k={t("tickets.vat", { rate: order.vatRate })} v={money(order.vatAmount, locale)} />
          <Row k={t("tickets.total")} v={money(order.totalAmount, locale)} bold />
          {order.paymentMethod && <Row k={t("tickets.paymentMethod")} v={order.paymentMethod} />}
        </Card>
      </Section>

      {order.status === "PAID" && ev.status !== "CANCELLED" && (
        <Section title={t("event.refundPolicy")}>
          <Text style={{ color: colors.text, marginBottom: 10, textAlign: "left" }}>
            {ev.refundPolicy.type === "NO_REFUND" ? t("event.noRefund") : t("event.refundUntil", { hours: ev.refundPolicy.hoursBefore ?? 0 })}
          </Text>
          <ErrorText code={error} />
          {order.refund.eligible ? (
            <Button title={t("tickets.requestRefund")} variant="danger" onPress={requestRefund} loading={refunding} />
          ) : (
            <Text style={{ color: colors.muted, textAlign: "left" }}>
              {t("tickets.refundNotAvailable", { reason: t(`errors.${order.refund.reason}` as never) })}
            </Text>
          )}
        </Section>
      )}
    </ScrollView>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 3, gap: 12 }}>
      <Text style={{ color: bold ? colors.text : colors.muted, fontWeight: bold ? "800" : "400", flexShrink: 1, textAlign: "left" }}>{k}</Text>
      <Text style={{ color: colors.text, fontWeight: bold ? "800" : "500" }}>{v}</Text>
    </View>
  );
}
