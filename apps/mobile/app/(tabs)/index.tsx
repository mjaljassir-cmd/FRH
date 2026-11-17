import { useEffect, useState } from "react";
import { FlatList, RefreshControl, ScrollView, View } from "react-native";
import * as Location from "expo-location";
import { useI18n } from "@/i18n";
import { qs } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import type { EventSummary } from "@/lib/types";
import { EventCard } from "@/components/event-card";
import { Empty, ErrorView, Loading, Section } from "@/components/ui";
import { colors } from "@/components/theme";

type List = { items: EventSummary[] };

export default function Home() {
  const { t } = useI18n();
  const featured = useFetch<List>("/api/v1/events?featured=1&pageSize=10");
  const upcoming = useFetch<List>("/api/v1/events?pageSize=30");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const nearby = useFetch<List>(coords ? `/api/v1/events${qs({ lat: coords.lat, lng: coords.lng, radiusKm: 50, pageSize: 10 })}` : null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getLastKnownPositionAsync().catch(() => null);
      if (pos) setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })();
  }, []);

  if (upcoming.loading && !upcoming.data) return <Loading />;
  if (upcoming.error && !upcoming.data) return <ErrorView code={upcoming.error} onRetry={upcoming.reload} />;

  const refresh = () => {
    featured.reload();
    upcoming.reload();
    nearby.reload();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={upcoming.loading} onRefresh={refresh} />}
    >
      {!!featured.data?.items.length && (
        <Section title={t("home.featured")}>
          <FlatList
            horizontal
            data={featured.data.items}
            keyExtractor={(e) => e.id}
            renderItem={({ item }) => <EventCard e={item} compact />}
            showsHorizontalScrollIndicator={false}
          />
        </Section>
      )}
      {!!nearby.data?.items.length && (
        <Section title={t("home.nearby")}>
          <FlatList
            horizontal
            data={nearby.data.items}
            keyExtractor={(e) => e.id}
            renderItem={({ item }) => <EventCard e={item} compact />}
            showsHorizontalScrollIndicator={false}
          />
        </Section>
      )}
      <Section title={t("home.upcoming")}>
        {upcoming.data?.items.length ? (
          upcoming.data.items.map((e) => <EventCard key={e.id} e={e} />)
        ) : (
          <View style={{ height: 200 }}>
            <Empty text={t("common.noResults")} />
          </View>
        )}
      </Section>
    </ScrollView>
  );
}
