export const AUTH_TIMING = {
  sessionIdleMs: 14 * 24 * 60 * 60 * 1000,
  sessionAbsoluteMs: 30 * 24 * 60 * 60 * 1000,
  sessionRollAfterMs: 24 * 60 * 60 * 1000,
  magicLinkMs: 15 * 60 * 1000,
  oauthTransactionMs: 10 * 60 * 1000,
  recentAuthenticationMs: 15 * 60 * 1000,
  deletionGraceMs: 30 * 24 * 60 * 60 * 1000,
} as const;

export type AccountStatus =
  | "active"
  | "suspended"
  | "disabled"
  | "pending_deletion";
export type AccountRole = "user" | "moderator" | "admin";
export type AuthProvider = "email" | "x";

const encoder = new TextEncoder();
export const base64Url = (bytes: Uint8Array): string => {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};

export function generateSecureToken(byteLength = 32): string {
  if (byteLength < 32)
    throw new Error(
      "Authentication tokens require at least 256 bits of entropy.",
    );
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function sha256(value: string): Promise<string> {
  return base64Url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
  );
}

export async function hashWithPepper(
  value: string,
  pepper: string,
): Promise<string> {
  if (!pepper) throw new Error("A token pepper is required.");
  return sha256(`${pepper}:${value}`);
}

export function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1)
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return mismatch === 0;
}

export const normalizeEmail = (value: string): string =>
  value.trim().normalize("NFKC").toLowerCase();
export const isEmail = (value: string): boolean =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const maskEmail = (email: string): string => {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 2)}${"•".repeat(Math.max(2, Math.min(local.length - 2, 6)))}@${domain}`;
};

export function safeRedirect(value: unknown, fallback = "/home"): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\r\n]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, "https://aura.invalid");
    return url.origin === "https://aura.invalid"
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}

export function sessionExpiration(now = new Date()) {
  return {
    idleExpiresAt: new Date(now.getTime() + AUTH_TIMING.sessionIdleMs),
    absoluteExpiresAt: new Date(now.getTime() + AUTH_TIMING.sessionAbsoluteMs),
  };
}

export const isSessionExpired = (
  idle: string | Date,
  absolute: string | Date,
  now = new Date(),
): boolean =>
  new Date(idle).getTime() <= now.getTime() ||
  new Date(absolute).getTime() <= now.getTime();
export const shouldRollSession = (
  lastSeen: string | Date,
  now = new Date(),
): boolean =>
  now.getTime() - new Date(lastSeen).getTime() >=
  AUTH_TIMING.sessionRollAfterMs;
export const isOneTimeTokenUsable = (
  expiresAt: string | Date,
  consumedAt: string | null,
  now = new Date(),
): boolean => !consumedAt && new Date(expiresAt).getTime() > now.getTime();
export const canMutateForStatus = (status: AccountStatus): boolean =>
  status === "active";
export const canLoginForStatus = (status: AccountStatus): boolean =>
  status === "active" ||
  status === "suspended" ||
  status === "pending_deletion";
export const canUnlinkIdentity = (verifiedMethodCount: number): boolean =>
  verifiedMethodCount > 1;
export const ownsResource = (
  accountProfileId: string | null,
  resourceUserId: string,
): boolean => Boolean(accountProfileId && accountProfileId === resourceUserId);

export async function createPkce() {
  const verifier = generateSecureToken(64);
  return { verifier, challenge: await sha256(verifier) };
}

export async function privateRateLimitKey(
  category: string,
  identifier: string,
  pepper: string,
): Promise<string> {
  return `${category}:${await hashWithPepper(identifier.trim().toLowerCase(), pepper)}`;
}

export function validateMutationOrigin(
  origin: string | null,
  expectedOrigin: string,
): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
}

export function summarizeUserAgent(value: string | null): string {
  if (!value) return "Unknown device";
  const browser = /Firefox/i.test(value)
    ? "Firefox"
    : /Edg/i.test(value)
      ? "Edge"
      : /Chrome/i.test(value)
        ? "Chrome"
        : /Safari/i.test(value)
          ? "Safari"
          : "Browser";
  const os = /Android/i.test(value)
    ? "Android"
    : /iPhone|iPad/i.test(value)
      ? "iOS"
      : /Windows/i.test(value)
        ? "Windows"
        : /Mac OS/i.test(value)
          ? "macOS"
          : /Linux/i.test(value)
            ? "Linux"
            : "device";
  return `${browser} on ${os}`.slice(0, 120);
}

export function matchesImageSignature(
  bytes: Uint8Array,
  mime: string,
): boolean {
  if (mime === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png")
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    );
  if (mime === "image/webp")
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  return false;
}
