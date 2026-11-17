import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider, applyDirection, loadInitialLocale, reloadApp, useI18n, type Locale } from "@/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Loading } from "@/components/ui";

export default function RootLayout() {
  const [locale, setLocale] = useState<Locale | null>(null);

  useEffect(() => {
    loadInitialLocale().then(async (l) => {
      // First launch on a device whose direction differs from the chosen language
      if (applyDirection(l)) await reloadApp();
      setLocale(l);
    });
  }, []);

  if (!locale) return <Loading />;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocaleBridge initial={locale} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** Keeps the server-side profile language in sync so push notifications arrive in the right language. */
function LocaleBridge({ initial }: { initial: Locale }) {
  const { user } = useAuth();
  return (
    <I18nProvider
      initial={initial}
      onChange={async (l) => {
        if (user) await api("/api/v1/me", { method: "PATCH", body: { locale: l } });
      }}
    >
      <Navigator />
    </I18nProvider>
  );
}

function Navigator() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.locale !== locale) api("/api/v1/me", { method: "PATCH", body: { locale } }).catch(() => {});
  }, [user, locale]);

  // Open the related screen when a notification is tapped
  useEffect(() => {
    const open = (data: Record<string, unknown> | undefined) => {
      if (data?.type === "event" && typeof data.eventId === "string") router.push(`/event/${data.eventId}`);
      if (data?.type === "order" && typeof data.orderId === "string") router.push(`/order/${data.orderId}`);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) open(last.notification.request.content.data);
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data));
    return () => sub.remove();
  }, [router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal", headerTintColor: "#0f172a" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t("appName") }} />
        <Stack.Screen name="event/[id]" options={{ title: "" }} />
        <Stack.Screen name="order/[id]" options={{ title: t("tabs.tickets") }} />
        <Stack.Screen name="checkout" options={{ title: t("checkout.title"), presentation: "modal" }} />
        <Stack.Screen name="favorites" options={{ title: t("account.favorites") }} />
        <Stack.Screen name="profile" options={{ title: t("account.profile") }} />
        <Stack.Screen name="auth/login" options={{ title: t("common.login"), presentation: "modal" }} />
        <Stack.Screen name="auth/register" options={{ title: t("auth.registerTitle"), presentation: "modal" }} />
        <Stack.Screen name="auth/forgot" options={{ title: t("auth.forgotTitle"), presentation: "modal" }} />
      </Stack>
    </>
  );
}
