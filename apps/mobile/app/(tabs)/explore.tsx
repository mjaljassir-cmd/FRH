import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useI18n } from "@/i18n";
import { qs } from "@/lib/api";
import { useFetch } from "@/lib/use-fetch";
import type { City, EventSummary, Named } from "@/lib/types";
import { EventCard } from "@/components/event-card";
import { Button, Chip, Empty, ErrorView, Input, Loading, styles as ui } from "@/components/ui";
import { colors } from "@/components/theme";

type DatePreset = "any" | "today" | "week" | "month";

function dateRange(p: DatePreset): { from?: string; to?: string } {
  if (p === "any") return {};
  const now = new Date();
  // Riyadh is UTC+3 all year
  const riyadhMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 3 * 3600e3);
  const days = p === "today" ? 1 : p === "week" ? 7 : 30;
  return { from: now.toISOString(), to: new Date(riyadhMidnight.getTime() + days * 86400e3).toISOString() };
}

export default function Explore() {
  const { t, L } = useI18n();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [cityId, setCityId] = useState<string>();
  const [categoryId, setCategoryId] = useState<string>();
  const [datePreset, setDatePreset] = useState<DatePreset>("any");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceApplied, setPriceApplied] = useState<{ min?: string; max?: string }>({});
  const [showFilters, setShowFilters] = useState(false);

  const cities = useFetch<{ items: City[] }>("/api/v1/cities");
  const categories = useFetch<{ items: Named[] }>("/api/v1/categories");

  const path = useMemo(
    () =>
      `/api/v1/events${qs({
        q: search,
        cityId,
        categoryId,
        ...dateRange(datePreset),
        minPrice: priceApplied.min,
        maxPrice: priceApplied.max,
        pageSize: 50,
      })}`,
    [search, cityId, categoryId, datePreset, priceApplied],
  );
  const events = useFetch<{ items: EventSummary[]; total: number }>(path);

  const reset = () => {
    setCityId(undefined);
    setCategoryId(undefined);
    setDatePreset("any");
    setMinPrice("");
    setMaxPrice("");
    setPriceApplied({});
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <Input
          value={q}
          onChangeText={setQ}
          placeholder={t("explore.searchPlaceholder")}
          returnKeyType="search"
          onSubmitEditing={() => setSearch(q.trim())}
          onBlur={() => setSearch(q.trim())}
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Pressable onPress={() => setShowFilters((v) => !v)}>
            <Text style={{ color: colors.brand, fontWeight: "700" }}>
              {t("explore.filters")} {showFilters ? "▴" : "▾"}
            </Text>
          </Pressable>
          <Pressable onPress={reset}>
            <Text style={{ color: colors.muted }}>{t("explore.reset")}</Text>
          </Pressable>
        </View>
        {showFilters && (
          <View>
            <Text style={ui.label}>{t("explore.city")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <Chip label={t("common.all")} active={!cityId} onPress={() => setCityId(undefined)} />
              {cities.data?.items.map((c) => (
                <Chip key={c.id} label={L(c as never, "name")} active={cityId === c.id} onPress={() => setCityId(c.id)} />
              ))}
            </ScrollView>
            <Text style={ui.label}>{t("explore.category")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <Chip label={t("common.all")} active={!categoryId} onPress={() => setCategoryId(undefined)} />
              {categories.data?.items.map((c) => (
                <Chip key={c.id} label={L(c as never, "name")} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
              ))}
            </ScrollView>
            <Text style={ui.label}>{t("explore.date")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {(
                [
                  ["any", "explore.anyDate"],
                  ["today", "explore.today"],
                  ["week", "explore.thisWeek"],
                  ["month", "explore.thisMonth"],
                ] as const
              ).map(([k, label]) => (
                <Chip key={k} label={t(label)} active={datePreset === k} onPress={() => setDatePreset(k)} />
              ))}
            </ScrollView>
            <Text style={ui.label}>{t("explore.price")}</Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Input value={minPrice} onChangeText={setMinPrice} placeholder={t("explore.minPrice")} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Input value={maxPrice} onChangeText={setMaxPrice} placeholder={t("explore.maxPrice")} keyboardType="numeric" />
              </View>
              <Button
                title={t("explore.apply")}
                variant="secondary"
                onPress={() => setPriceApplied({ min: minPrice || undefined, max: maxPrice || undefined })}
                style={{ paddingVertical: 12 }}
              />
            </View>
          </View>
        )}
      </View>
      {events.loading && !events.data ? (
        <Loading />
      ) : events.error ? (
        <ErrorView code={events.error} onRetry={events.reload} />
      ) : (
        <FlatList
          data={events.data?.items ?? []}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <EventCard e={item} />}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          refreshing={events.loading}
          onRefresh={events.reload}
          ListEmptyComponent={<Empty text={t("common.noResults")} />}
        />
      )}
    </View>
  );
}
