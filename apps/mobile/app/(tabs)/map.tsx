import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useI18n } from "@/i18n";
import { qs } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";
import type { EventSummary } from "@/lib/types";
import { Loading } from "@/components/ui";
import { colors } from "@/components/theme";

const RIYADH = { lat: 24.7136, lng: 46.6753 };
const RADIUS_KM = 100;

export default function MapScreen() {
  const { t, L, locale } = useI18n();
  const router = useRouter();
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setDenied(true);
        setCenter(RIYADH);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      setCenter(pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : RIYADH);
    })();
  }, []);

  const events = useFetch<{ items: EventSummary[] }>(
    center ? `/api/v1/events${qs({ lat: center.lat, lng: center.lng, radiusKm: RADIUS_KM, pageSize: 100 })}` : null,
  );

  if (!center) return <Loading />;
  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        showsUserLocation={!denied}
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.6, longitudeDelta: 0.6 }}
        onRegionChangeComplete={(r) => {
          // Reload when the user pans far away from the last query centre
          if (Math.abs(r.latitude - center.lat) > 0.5 || Math.abs(r.longitude - center.lng) > 0.5) {
            setCenter({ lat: r.latitude, lng: r.longitude });
          }
        }}
      >
        {events.data?.items.map((e) => (
          <Marker key={e.id} coordinate={{ latitude: e.lat, longitude: e.lng }} pinColor={e.isFeatured ? colors.warning : colors.brand}>
            <Callout onPress={() => router.push(`/event/${e.id}`)}>
              <View style={{ maxWidth: 220, padding: 4 }}>
                <Text style={{ fontWeight: "700" }}>{L(e as never, "title")}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{dateTime(e.startAt, locale)}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      <View style={{ position: "absolute", top: 12, start: 12, end: 12, backgroundColor: "#ffffffee", borderRadius: 10, padding: 10 }}>
        <Text style={{ color: colors.text, fontSize: 13, textAlign: "left" }}>
          {denied ? t("map.locationDenied") : t("map.radius", { km: RADIUS_KM })}
        </Text>
      </View>
    </View>
  );
}
