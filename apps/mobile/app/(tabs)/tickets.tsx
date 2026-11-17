import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";
import type { TicketListItem } from "@/lib/types";
import { Button, Chip, Empty, ErrorView, Loading } from "@/components/ui";
import { colors } from "@/components/theme";

export default function Tickets() {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  if (!ready) return <Loading />;
  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ marginBottom: 16, color: colors.muted }}>{t("common.loginRequired")}</Text>
        <Button title={t("common.login")} onPress={() => router.push("/auth/login")} style={{ alignSelf: "stretch" }} />
      </View>
    );
  }
  return <TicketList />;
}

function TicketList() {
  const { t, L, locale } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const data = useFetch<{ upcoming: TicketListItem[]; past: TicketListItem[] }>("/api/v1/tickets");
  useFocusEffect(
    useCallback(() => {
      data.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
  if (data.loading && !data.data) return <Loading />;
  if (data.error) return <ErrorView code={data.error} onRetry={data.reload} />;
  const items = data.data?.[tab] ?? [];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", padding: 16, paddingBottom: 0 }}>
        <Chip label={t("tickets.upcoming")} active={tab === "upcoming"} onPress={() => setTab("upcoming")} />
        <Chip label={t("tickets.past")} active={tab === "past"} onPress={() => setTab("past")} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.orderId}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshing={data.loading}
        onRefresh={data.reload}
        ListEmptyComponent={<Empty text={t("tickets.empty")} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/order/${item.orderId}`)}
            style={{ flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 12, overflow: "hidden" }}
          >
            {item.event.coverImageUrl ? (
              <Image source={{ uri: item.event.coverImageUrl }} style={{ width: 96, height: 96 }} />
            ) : (
              <View style={{ width: 96, height: 96, backgroundColor: colors.brandLight }} />
            )}
            <View style={{ flex: 1, padding: 12 }}>
              <Text style={{ fontWeight: "800", textAlign: "left" }} numberOfLines={2}>
                {L(item.event as never, "title")}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, textAlign: "left" }}>{dateTime(item.event.startAt, locale)}</Text>
              <Text style={{ color: item.status === "REFUNDED" ? colors.danger : colors.brand, fontSize: 12, marginTop: 4, fontWeight: "700", textAlign: "left" }}>
                {item.status === "REFUNDED"
                  ? t("tickets.refunded")
                  : item.event.status === "CANCELLED"
                    ? t("tickets.eventCancelled")
                    : t("tickets.count", { count: item.ticketCount })}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
