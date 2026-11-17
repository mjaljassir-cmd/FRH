import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { useI18n } from "@/i18n";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/lib/use-fetch";
import type { City } from "@/lib/types";
import { CityPicker } from "@/components/city-picker";
import { Button, ErrorText, Input } from "@/components/ui";
import { colors } from "@/components/theme";

export default function Profile() {
  const { t } = useI18n();
  const { user, updateProfile } = useAuth();
  const cities = useFetch<{ items: City[] }>("/api/v1/cities");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [cityId, setCityId] = useState<string | null>(user?.cityId ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile({ name, phone, cityId });
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "SERVER_ERROR");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16 }}>
      <ErrorText code={error} />
      <Input label={t("auth.name")} value={name} onChangeText={setName} />
      <Input label={t("auth.email")} value={user?.email} editable={false} />
      <Input label={t("auth.phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <CityPicker label={t("auth.city")} cities={cities.data?.items ?? []} value={cityId} onChange={setCityId} />
      {saved && <Text style={{ color: colors.success, marginBottom: 10, textAlign: "left" }}>{t("common.saved")}</Text>}
      <Button title={t("common.save")} onPress={save} loading={saving} />
    </ScrollView>
  );
}
