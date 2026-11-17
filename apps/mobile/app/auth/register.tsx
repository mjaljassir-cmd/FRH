import { useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { useRouter } from "expo-router";
import { useI18n } from "@/i18n";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/lib/use-fetch";
import type { City } from "@/lib/types";
import { CityPicker } from "@/components/city-picker";
import { Button, ErrorText, Input } from "@/components/ui";
import { colors } from "@/components/theme";

export default function Register() {
  const { t, locale } = useI18n();
  const { register } = useAuth();
  const router = useRouter();
  const cities = useFetch<{ items: City[] }>("/api/v1/cities");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [cityId, setCityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await register({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined, cityId: cityId ?? undefined, locale });
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "SERVER_ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <ErrorText code={error} />
      <Input label={t("auth.name")} value={name} onChangeText={setName} autoComplete="name" />
      <Input label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Input label={t("auth.password")} hint={t("auth.passwordHint")} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <Input label={t("auth.phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <CityPicker label={t("auth.city")} cities={cities.data?.items ?? []} value={cityId} onChange={setCityId} />
      <Button title={t("auth.registerButton")} onPress={submit} loading={loading} disabled={!name || !email || password.length < 8} />
      <Pressable onPress={() => router.replace("/auth/login")} style={{ marginTop: 16 }}>
        <Text style={{ color: colors.brand, textAlign: "center", fontWeight: "700" }}>{t("auth.haveAccount")}</Text>
      </Pressable>
    </ScrollView>
  );
}
