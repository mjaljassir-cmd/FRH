import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { api, setAuthToken, setUnauthorizedHandler } from "./api";
import { registerForPush, unregisterPush } from "./push";
import type { Me } from "./types";

const TOKEN_KEY = "auth_token";

interface AuthCtx {
  user: Me | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string; cityId?: string; locale: "ar" | "en" }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Pick<Me, "name" | "phone" | "cityId" | "locale">>) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const clear = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void clear());
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
      if (token) {
        setAuthToken(token);
        try {
          const r = await api<{ user: Me }>("/api/v1/me");
          setUser(r.user);
          registerForPush().catch(() => {});
        } catch {
          await clear();
        }
      }
      setReady(true);
    })();
  }, [clear]);

  const signedIn = useCallback(async (r: { token: string; user: Me }) => {
    await SecureStore.setItemAsync(TOKEN_KEY, r.token);
    setAuthToken(r.token);
    setUser(r.user);
    registerForPush().catch(() => {});
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      ready,
      login: async (email, password) => signedIn(await api("/api/v1/auth/login", { method: "POST", body: { email, password } })),
      register: async (data) => signedIn(await api("/api/v1/auth/register", { method: "POST", body: data })),
      logout: async () => {
        await unregisterPush().catch(() => {});
        await clear();
      },
      updateProfile: async (data) => {
        const r = await api<{ user: Me }>("/api/v1/me", { method: "PATCH", body: data });
        setUser(r.user);
      },
    }),
    [user, ready, signedIn, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
