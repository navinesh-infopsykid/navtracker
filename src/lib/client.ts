"use client";
// Tiny client-side helpers for talking to our API routes.
import { useCallback, useEffect, useRef, useState } from "react";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? "GET",
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError("Can't reach the NavTracker server. Is `npm run dev` still running?", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiClientError(data.error ?? `Request failed (${res.status})`, res.status, data.fields ?? {});
  return data as T;
}

/** Fetch JSON on mount / when the url changes. Returns loading, error, data and reload(). */
export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      if (!url) return;
      const id = ++latest.current;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const result = await api<T>(url);
        if (id === latest.current) setData(result);
      } catch (e) {
        if (id === latest.current) setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (id === latest.current) setLoading(false);
      }
    },
    [url],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { data, setData, error, loading, reload: () => load(true), hardReload: () => load(false) };
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
