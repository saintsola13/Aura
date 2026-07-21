import type { ApiError } from "@aura/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
const DEV_USER_KEY = "aura.dev-user-id";

export const getDevUserId = () => typeof window === "undefined" ? "" : localStorage.getItem(DEV_USER_KEY) ?? "";
export const setDevUserId = (id: string) => { localStorage.setItem(DEV_USER_KEY, id); window.dispatchEvent(new Event("aura:dev-user-change")); };
export const mediaSrc = (url: string | null) => url?.startsWith("/") ? `${API_URL}${url}` : url;

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const userId = getDevUserId();
  if (userId) headers.set("X-Aura-Dev-User", userId);
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, cache: "no-store" });
  const payload = await response.json().catch(() => null) as (T & ApiError) | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? `Request failed (${response.status})`);
  return payload as T;
}

export const relativeTime = (date: string) => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
};
