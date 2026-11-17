import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "./api";

/** Minimal data-fetching hook with reload support. Pass null to skip. */
export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const r = await api<T>(path);
      if (id === seq.current) setData(r);
    } catch (e) {
      if (id === seq.current) setError(e instanceof ApiError ? e.code : "SERVER_ERROR");
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}
