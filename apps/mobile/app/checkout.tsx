import { useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useI18n } from "@/i18n";
import { API_URL } from "@/lib/config";
import { Button } from "@/components/ui";
import { colors } from "@/components/theme";

/**
 * Hosts the Moyasar payment page (served by our web app) and watches for the
 * final /pay/result redirect to know the outcome.
 */
export default function Checkout() {
  const { url, orderId } = useLocalSearchParams<{ url: string; orderId: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const [result, setResult] = useState<"paid" | "failed" | "refunded" | null>(null);
  const handled = useRef(false);

  const onNav = (nav: WebViewNavigation) => {
    if (handled.current) return;
    if (nav.url.startsWith(API_URL) && nav.url.includes("/pay/result")) {
      handled.current = true;
      const status = new URL(nav.url).searchParams.get("status");
      setResult(status === "paid" ? "paid" : status === "refunded" ? "refunded" : "failed");
    }
  };

  if (result) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.bg }}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>{result === "paid" ? "✅" : "⚠️"}</Text>
        <Text style={{ fontSize: 17, textAlign: "center", marginBottom: 20, color: colors.text }}>
          {result === "paid" ? t("checkout.paid") : result === "refunded" ? t("checkout.soldOutRefunded") : t("checkout.failed")}
        </Text>
        {result === "paid" ? (
          <Button title={t("checkout.viewTickets")} onPress={() => router.replace(`/order/${orderId}`)} style={{ alignSelf: "stretch" }} />
        ) : (
          <Button title={t("common.close")} variant="secondary" onPress={() => router.back()} style={{ alignSelf: "stretch" }} />
        )}
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: url }}
      onNavigationStateChange={onNav}
      onShouldStartLoadWithRequest={(req) => {
        onNav(req as unknown as WebViewNavigation);
        return true;
      }}
      startInLoadingState
      renderLoading={() => (
        <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      )}
    />
  );
}
