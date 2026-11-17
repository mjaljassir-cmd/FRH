import { useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/i18n";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateTime, money } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";
import type { EventDetail, Review } from "@/lib/types";
import { Button, Card, ErrorText, ErrorView, Input, Loading, Section, Stars, styles as ui } from "@/components/ui";
import { colors } from "@/components/theme";

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, L, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ev = useFetch<{ event: EventDetail }>(`/api/v1/events/${id}`);
  const reviews = useFetch<{ items: Review[] }>(`/api/v1/events/${id}/reviews`);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewSent, setReviewSent] = useState(false);

  if (ev.loading && !ev.data) return <Loading />;
  if (ev.error || !ev.data) return <ErrorView code={ev.error ?? "SERVER_ERROR"} onRetry={ev.reload} />;
  const e = ev.data.event;

  const total = e.ticketTypes.reduce((s, tt) => s + tt.price * (qty[tt.id] ?? 0), 0);
  const count = Object.values(qty).reduce((a, b) => a + b, 0);
  const requireLogin = () => {
    router.push("/auth/login");
  };

  const toggleFavorite = async () => {
    if (!user) return requireLogin();
    const fav = e.isFavorite;
    ev.setData({ event: { ...e, isFavorite: !fav } });
    try {
      await api(`/api/v1/favorites/${e.id}`, { method: fav ? "DELETE" : "POST" });
    } catch {
      ev.setData({ event: { ...e, isFavorite: fav } });
    }
  };

  const buy = async () => {
    if (!user) return requireLogin();
    if (count === 0) return setError(null), Alert.alert(t("event.selectTickets"));
    setBuying(true);
    setError(null);
    try {
      const r = await api<{ order: { id: string; status: string }; paymentUrl: string | null }>("/api/v1/orders", {
        method: "POST",
        body: {
          eventId: e.id,
          items: Object.entries(qty)
            .filter(([, q]) => q > 0)
            .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })),
        },
      });
      setQty({});
      if (r.paymentUrl) {
        router.push({ pathname: "/checkout", params: { url: r.paymentUrl, orderId: r.order.id } });
      } else {
        Alert.alert(t("checkout.freeConfirmed"));
        router.push(`/order/${r.order.id}`);
      }
      ev.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "SERVER_ERROR");
    } finally {
      setBuying(false);
    }
  };

  const sendReview = async () => {
    try {
      await api(`/api/v1/events/${e.id}/reviews`, { method: "POST", body: { rating, comment: comment || undefined } });
      setReviewSent(true);
      reviews.reload();
      ev.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "SERVER_ERROR");
    }
  };

  const openMaps = () => {
    const label = encodeURIComponent(e.venueName);
    const url = Platform.OS === "ios" ? `maps:0,0?q=${label}@${e.lat},${e.lng}` : `geo:0,0?q=${e.lat},${e.lng}(${label})`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps?q=${e.lat},${e.lng}`));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <Pressable onPress={toggleFavorite} hitSlop={10}>
              <Text style={{ fontSize: 22, color: e.isFavorite ? colors.danger : colors.muted }}>{e.isFavorite ? "♥" : "♡"}</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {e.coverImageUrl && <Image source={{ uri: e.coverImageUrl }} style={{ width: "100%", height: 230 }} contentFit="cover" />}
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.brand, fontWeight: "700", textAlign: "left" }}>
            {L(e.category as never, "name")} · {L(e.city as never, "name")}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 6, textAlign: "left" }}>{L(e as never, "title")}</Text>
          <Text style={{ color: colors.muted, marginTop: 6, textAlign: "left" }}>
            {dateTime(e.startAt, locale)} — {dateTime(e.endAt, locale)}
          </Text>
          {e.rating && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
              <Stars value={e.rating.avg} />
              <Text style={{ color: colors.muted }}>
                {e.rating.avg} ({e.rating.count})
              </Text>
            </View>
          )}

          <Section title={t("event.about")}>
            <Text style={{ color: colors.text, lineHeight: 22, textAlign: "left" }}>{L(e as never, "description")}</Text>
            {e.images.length > 0 && (
              <ScrollView horizontal style={{ marginTop: 12 }} showsHorizontalScrollIndicator={false}>
                {e.images.map((u) => (
                  <Image key={u} source={{ uri: u }} style={{ width: 160, height: 110, borderRadius: 10, marginEnd: 8 }} />
                ))}
              </ScrollView>
            )}
          </Section>

          <Section title={t("event.location")}>
            <Card>
              <Text style={{ fontWeight: "700", textAlign: "left" }}>{e.venueName}</Text>
              <Text style={{ color: colors.muted, marginTop: 2, textAlign: "left" }}>{e.address}</Text>
              <Pressable onPress={openMaps} style={{ marginTop: 8 }}>
                <Text style={{ color: colors.brand, fontWeight: "700", textAlign: "left" }}>{t("event.openInMaps")}</Text>
              </Pressable>
            </Card>
          </Section>

          <Section title={t("event.organizer")}>
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {e.organizer.logoUrl ? (
                <Image source={{ uri: e.organizer.logoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
              ) : (
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandLight }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", textAlign: "left" }}>{e.organizer.name}</Text>
                {e.organizer.rating && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Stars value={e.organizer.rating.avg} size={12} />
                    <Text style={{ color: colors.muted, fontSize: 12 }}>({e.organizer.rating.count})</Text>
                  </View>
                )}
                {e.organizer.description && (
                  <Text style={{ color: colors.muted, fontSize: 13, textAlign: "left" }} numberOfLines={3}>
                    {e.organizer.description}
                  </Text>
                )}
              </View>
            </Card>
          </Section>

          <Section title={t("event.tickets")}>
            {!e.isOnSale && <Text style={{ color: colors.muted, marginBottom: 8, textAlign: "left" }}>{t("event.ended")}</Text>}
            {e.ticketTypes.map((tt) => {
              const q = qty[tt.id] ?? 0;
              const max = Math.min(tt.remaining, 50);
              return (
                <Card key={tt.id} style={{ marginBottom: 10, flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", fontSize: 15, textAlign: "left" }}>{L(tt as never, "name")}</Text>
                    <Text style={{ color: colors.text, marginTop: 2, textAlign: "left" }}>
                      {tt.price === 0 ? t("common.free") : money(tt.price, locale)}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12, textAlign: "left" }}>
                      {tt.remaining === 0
                        ? t("common.soldOut")
                        : !tt.onSale
                          ? tt.salesStartAt && new Date(tt.salesStartAt) > new Date()
                            ? t("event.salesStart", { date: dateTime(tt.salesStartAt, locale) })
                            : t("event.notOnSale")
                          : t("event.remaining", { count: tt.remaining })}
                    </Text>
                  </View>
                  {tt.onSale && tt.remaining > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Stepper label="−" disabled={q === 0} onPress={() => setQty({ ...qty, [tt.id]: q - 1 })} />
                      <Text style={{ fontSize: 16, fontWeight: "700", minWidth: 20, textAlign: "center" }}>{q}</Text>
                      <Stepper label="+" disabled={q >= max} onPress={() => setQty({ ...qty, [tt.id]: q + 1 })} />
                    </View>
                  )}
                </Card>
              );
            })}
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: "left" }}>{t("event.vatIncluded")}</Text>
          </Section>

          <Section title={t("event.refundPolicy")}>
            <Text style={{ color: colors.text, textAlign: "left" }}>
              {e.refundPolicy.type === "NO_REFUND" ? t("event.noRefund") : t("event.refundUntil", { hours: e.refundPolicy.hoursBefore ?? 0 })}
            </Text>
          </Section>

          <Section title={t("event.reviews")}>
            {e.canReview && !reviewSent && (
              <Card style={{ marginBottom: 12 }}>
                <Text style={[ui.label, { marginBottom: 8 }]}>{t("event.writeReview")}</Text>
                <Stars value={rating} size={30} onChange={setRating} />
                <View style={{ height: 10 }} />
                <Input value={comment} onChangeText={setComment} placeholder={t("event.yourComment")} multiline />
                <Button title={t("event.submitReview")} onPress={sendReview} disabled={rating === 0} />
              </Card>
            )}
            {reviewSent && <Text style={{ color: colors.success, marginBottom: 8, textAlign: "left" }}>{t("event.reviewThanks")}</Text>}
            {reviews.data?.items.length ? (
              reviews.data.items.map((r) => (
                <Card key={r.id} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontWeight: "700" }}>{r.userName}</Text>
                    <Stars value={r.rating} size={12} />
                  </View>
                  {r.comment && <Text style={{ marginTop: 4, color: colors.text, textAlign: "left" }}>{r.comment}</Text>}
                </Card>
              ))
            ) : (
              <Text style={{ color: colors.muted, textAlign: "left" }}>{t("event.noReviews")}</Text>
            )}
          </Section>
        </View>
      </ScrollView>

      {e.isOnSale && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            start: 0,
            end: 0,
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderColor: colors.border,
            padding: 16,
            paddingBottom: 16 + insets.bottom,
          }}
        >
          <ErrorText code={error} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: "left" }}>{t("event.total")}</Text>
              <Text style={{ fontSize: 18, fontWeight: "800", textAlign: "left" }}>{money(total, locale)}</Text>
            </View>
            <Button title={t("event.buy")} onPress={buy} loading={buying} disabled={count === 0} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </View>
  );
}

function Stepper({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.brand }}>{label}</Text>
    </Pressable>
  );
}
