import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors } from "./theme";
import { useI18n } from "@/i18n";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === "primary" ? colors.brand : variant === "danger" ? colors.danger : colors.card;
  const fg = variant === "secondary" ? colors.text : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "secondary" && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Input({ label, hint, ...props }: TextInputProps & { label?: string; hint?: string }) {
  const { isRTL } = useI18n();
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.input, { textAlign: isRTL ? "right" : "left" }, props.style]}
      />
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && { backgroundColor: colors.brand, borderColor: colors.brand }]}>
      <Text style={[styles.chipText, active && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

export function ErrorView({ code, onRetry }: { code: string; onRetry?: () => void }) {
  const { t } = useI18n();
  const msg = t(`errors.${code}` as never);
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{msg.startsWith("errors.") ? t("errors.SERVER_ERROR") : msg}</Text>
      {onRetry && <Button title={t("common.retry")} onPress={onRetry} variant="secondary" style={{ marginTop: 12 }} />}
    </View>
  );
}

export function ErrorText({ code }: { code: string | null }) {
  const { t } = useI18n();
  if (!code) return null;
  const msg = t(`errors.${code}` as never);
  return <Text style={[styles.errorText, { marginBottom: 12 }]}>{msg.startsWith("errors.") ? t("errors.SERVER_ERROR") : msg}</Text>;
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <Text style={{ color: colors.muted, fontSize: 15 }}>{text}</Text>
    </View>
  );
}

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} onPress={onChange ? () => onChange(i) : undefined} style={{ fontSize: size, color: i <= Math.round(value) ? colors.star : colors.border }}>
          ★
        </Text>
      ))}
    </View>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ marginTop: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  button: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 16, fontWeight: "700" },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 6, textAlign: "left" },
  hint: { fontSize: 12, color: colors.muted, marginTop: 4, textAlign: "left" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fff",
    color: colors.text,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#fff",
    marginEnd: 8,
  },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: colors.danger, textAlign: "center", fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "left" },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
});
