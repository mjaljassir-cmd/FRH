import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { Button, Card } from "@/components/ui";
import { colors } from "@/components/theme";

export default function Account() {
  const { t, locale, setLocale } = useI18n();
  const { user, logout } = useAuth();
  const router = useRouter();

  const switchLanguage = () => {
    const next = locale === "ar" ? "en" : "ar";
    Alert.alert(t("account.language"), t("account.restartNotice"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("account.switchTo"), onPress: () => setLocale(next) },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {user ? (
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "800", textAlign: "left" }}>{user.name}</Text>
          <Text style={{ color: colors.muted, marginTop: 2, textAlign: "left" }}>{user.email}</Text>
        </Card>
      ) : (
        <Card>
          <Text style={{ color: colors.muted, marginBottom: 12, textAlign: "left" }}>{t("account.guest")}</Text>
          <Button title={t("common.login")} onPress={() => router.push("/auth/login")} />
        </Card>
      )}
      {user && (
        <>
          <Item label={t("account.profile")} onPress={() => router.push("/profile")} />
          <Item label={t("account.favorites")} onPress={() => router.push("/favorites")} />
        </>
      )}
      <Item label={`${t("account.language")}: ${t("account.switchTo")}`} onPress={switchLanguage} />
      {user && <Button title={t("account.logout")} variant="secondary" onPress={logout} />}
    </ScrollView>
  );
}

function Item({ label, onPress }: { label: string; onPress: () => void }) {
  const { isRTL } = useI18n();
  return (
    <Pressable onPress={onPress}>
      <Card style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 15, fontWeight: "600" }}>{label}</Text>
        <Text style={{ color: colors.muted, fontSize: 18 }}>{isRTL ? "‹" : "›"}</Text>
      </Card>
    </Pressable>
  );
}
