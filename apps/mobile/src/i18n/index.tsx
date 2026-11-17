import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DevSettings, I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import * as Updates from "expo-updates";
import ar from "./ar";
import en, { type Dict } from "./en";

export type Locale = "ar" | "en";
const dicts: Record<Locale, Dict> = { ar, en };
const STORAGE_KEY = "locale";

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type TKey = Leaves<Dict>;

function lookup(d: Dict, key: string): string {
  return key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], d) as string ?? key;
}

export function translate(locale: Locale, key: TKey | string, vars?: Record<string, string | number>) {
  let s = lookup(dicts[locale], key);
  if (typeof s !== "string") s = key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Determine the startup locale: saved choice, else device language. */
export async function loadInitialLocale(): Promise<Locale> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === "ar" || saved === "en") return saved;
  } catch {}
  const device = Localization.getLocales()[0]?.languageCode;
  return device === "en" ? "en" : "ar";
}

/** Make the native layout direction match the locale. Returns true if a reload is needed. */
export function applyDirection(locale: Locale) {
  const rtl = locale === "ar";
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.forceRTL(rtl);
    return true;
  }
  return false;
}

export async function reloadApp() {
  try {
    await Updates.reloadAsync();
  } catch {
    DevSettings.reload();
  }
}

interface I18nCtx {
  locale: Locale;
  isRTL: boolean;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  /** Localized field picker for bilingual API objects, e.g. L(event, "title"). */
  L: (obj: Record<string, unknown>, field: string) => string;
  setLocale: (l: Locale) => Promise<void>;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ initial, children, onChange }: { initial: Locale; children: ReactNode; onChange?: (l: Locale) => Promise<void> }) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  const setLocale = useCallback(
    async (l: Locale) => {
      await AsyncStorage.setItem(STORAGE_KEY, l);
      await onChange?.(l).catch(() => {});
      setLocaleState(l);
      if (applyDirection(l)) await reloadApp();
    },
    [onChange],
  );
  const value = useMemo<I18nCtx>(
    () => ({
      locale,
      isRTL: locale === "ar",
      t: (key, vars) => translate(locale, key, vars),
      L: (obj, field) => String(obj[`${field}${locale === "en" ? "En" : "Ar"}`] ?? ""),
      setLocale,
    }),
    [locale, setLocale],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}
