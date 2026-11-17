import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { useI18n } from "@/i18n";
import { ApiError, api } from "@/lib/api";
import { Button, ErrorText, Input } from "@/components/ui";
import { colors } from "@/components/theme";

export default function Forgot() {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await api("/api/v1/auth/forgot", { method: "POST", body: { email: email.trim(), locale } });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "SERVER_ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ color: colors.muted, marginBottom: 16, textAlign: "left" }}>{t("auth.forgotHint")}</Text>
      <ErrorText code={error} />
      {sent ? (
        <Text style={{ color: colors.success, textAlign: "left" }}>{t("auth.forgotSent")}</Text>
      ) : (
        <>
          <Input label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Button title={t("auth.sendLink")} onPress={submit} loading={loading} disabled={!email} />
        </>
      )}
    </ScrollView>
  );
}
