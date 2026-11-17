import { Text, type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { useI18n } from "@/i18n";
import { colors } from "@/components/theme";

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.brand, headerTitleAlign: "center" }}>
      <Tabs.Screen name="index" options={{ title: t("tabs.home"), headerTitle: t("appName"), tabBarIcon: icon("⌂") }} />
      <Tabs.Screen name="explore" options={{ title: t("tabs.explore"), tabBarIcon: icon("⌕") }} />
      <Tabs.Screen name="map" options={{ title: t("tabs.map"), tabBarIcon: icon("◎") }} />
      <Tabs.Screen name="tickets" options={{ title: t("tabs.tickets"), tabBarIcon: icon("🎟") }} />
      <Tabs.Screen name="account" options={{ title: t("tabs.account"), tabBarIcon: icon("☺") }} />
    </Tabs>
  );
}
