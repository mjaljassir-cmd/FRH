import { useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "@/i18n";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, ErrorText, Input } from "@/components/ui";
import { colors } from "@/components/theme";

export default function Login() {
  const { t } = useI18n();
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "SERVER_ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 24, fontWeight: "800", marginBottom: 20, textAlign: "left" }}>{t("auth.loginTitle")}</Text>
      <ErrorText code={error} />
      <Input label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Input label={t("auth.password")} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <Button title={t("auth.loginButton")} onPress={submit} loading={loading} disabled={!email || !password} />
      <Pressable onPress={() => router.push("/auth/forgot")} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.brand, textAlign: "center" }}>{t("auth.forgot")}</Text>
      </Pressable>
      <Pressable onPress={() => router.replace("/auth/register")} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.brand, textAlign: "center", fontWeight: "700" }}>{t("auth.noAccount")}</Text>
      </Pressable>
    </ScrollView>
  );
}
