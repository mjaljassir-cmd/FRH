import { useCallback } from "react";
import { FlatList } from "react-native";
import { useFocusEffect } from "expo-router";
import { useI18n } from "@/i18n";
import { useFetch } from "@/lib/use-fetch";
import type { EventSummary } from "@/lib/types";
import { EventCard } from "@/components/event-card";
import { Empty, ErrorView, Loading } from "@/components/ui";
import { colors } from "@/components/theme";

export default function Favorites() {
  const { t } = useI18n();
  const data = useFetch<{ items: EventSummary[] }>("/api/v1/favorites");
  useFocusEffect(
    useCallback(() => {
      data.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
  if (data.loading && !data.data) return <Loading />;
  if (data.error) return <ErrorView code={data.error} onRetry={data.reload} />;
  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={data.data?.items ?? []}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => <EventCard e={item} />}
      contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      ListEmptyComponent={<Empty text={t("account.noFavorites")} />}
    />
  );
}
