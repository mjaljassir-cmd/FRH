import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useI18n } from "@/i18n";
import { dateTime, money } from "@/lib/format";
import type { EventSummary } from "@/lib/types";
import { colors } from "./theme";
import { Stars } from "./ui";

export function EventCard({ e, compact }: { e: EventSummary; compact?: boolean }) {
  const { t, L, locale } = useI18n();
  const router = useRouter();
  const price =
    e.minPrice == null ? null : e.maxPrice === 0 ? t("common.free") : t("common.from", { price: money(e.minPrice, locale) });
  return (
    <Pressable onPress={() => router.push(`/event/${e.id}`)} style={[styles.card, compact && { width: 260, marginEnd: 12 }]}>
      <View>
        {e.coverImageUrl ? (
          <Image source={{ uri: e.coverImageUrl }} style={[styles.image, compact && { height: 130 }]} contentFit="cover" />
        ) : (
          <View style={[styles.image, { backgroundColor: colors.brandLight }, compact && { height: 130 }]} />
        )}
        <View style={styles.badges}>
          {e.isFeatured && <Text style={[styles.badge, { backgroundColor: colors.warning }]}>{t("common.featured")}</Text>}
          {e.soldOut && <Text style={[styles.badge, { backgroundColor: colors.danger }]}>{t("common.soldOut")}</Text>}
        </View>
      </View>
      <View style={{ padding: 12 }}>
        <Text style={styles.date}>{dateTime(e.startAt, locale)}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {L(e as never, "title")}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {e.venueName} · {L(e.city as never, "name")}
          {e.distanceKm != null ? ` · ${t("common.km", { km: e.distanceKm })}` : ""}
        </Text>
        <View style={styles.row}>
          {price && <Text style={styles.price}>{price}</Text>}
          {e.rating && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Stars value={e.rating.avg} size={12} />
              <Text style={styles.meta}>({e.rating.count})</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  image: { width: "100%", height: 170 },
  badges: { position: "absolute", top: 10, start: 10, flexDirection: "row", gap: 6 },
  badge: { color: "#fff", fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: "hidden" },
  date: { color: colors.brand, fontSize: 12, fontWeight: "700", textAlign: "left" },
  title: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: 4, textAlign: "left" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 4, textAlign: "left" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  price: { color: colors.text, fontWeight: "700", fontSize: 14 },
});
