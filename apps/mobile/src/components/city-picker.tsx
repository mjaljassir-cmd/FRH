import { ScrollView, Text, View } from "react-native";
import { useI18n } from "@/i18n";
import type { City } from "@/lib/types";
import { Chip, styles } from "./ui";

export function CityPicker({ label, cities, value, onChange }: { label: string; cities: City[]; value: string | null; onChange: (id: string | null) => void }) {
  const { L } = useI18n();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {cities.map((c) => (
          <Chip key={c.id} label={L(c as never, "name")} active={value === c.id} onPress={() => onChange(value === c.id ? null : c.id)} />
        ))}
      </ScrollView>
    </View>
  );
}
