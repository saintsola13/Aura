import type { ApiError } from "@aura/shared";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

const csrfCookie = () =>
  typeof document === "undefined"
    ? ""
    : decodeURIComponent(
        document.cookie
          .split("; ")
          .find((item) => item.startsWith("aura_csrf="))
          ?.split("=")
          .slice(1)
          .join("=") ?? "",
      );
export const mediaSrc = (url: string | null) =>
  url?.startsWith("/") ? `${API_URL}${url}` : url;
export const loginDestination = (path: string) =>
  `/login?redirect=${encodeURIComponent(path.startsWith("/") ? path : "/home")}`;

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const csrf = csrfCookie();
    if (csrf) headers.set("X-Aura-CSRF", csrf);
  }
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("content-type")
  )
    headers.set("content-type", "application/json");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & ApiError)
    | null;
  if (!response.ok)
    throw new ApiRequestError(
      payload?.error?.message ?? `Request failed (${response.status})`,
      response.status,
      payload?.error?.code,
    );
  return payload as T;
}

export const relativeTime = (date: string) => {
  const seconds = Math.max(
    1,
    Math.floor((Date.now() - new Date(date).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};
