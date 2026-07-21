import {
  AUTH_TIMING,
  canLoginForStatus,
  canMutateForStatus,
  constantTimeEqual,
  generateSecureToken,
  hashWithPepper,
  isOneTimeTokenUsable,
  safeRedirect,
  sessionExpiration,
  shouldRollSession,
  summarizeUserAgent,
  validateMutationOrigin,
  type AccountRole,
  type AccountStatus,
  type AuthProvider,
} from "@aura/shared";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

export type RateLimitBinding = {
  limit(input: { key: string }): Promise<{ success: boolean }>;
};
export type AuthBindings = {
  DB: D1Database;
  AVATARS: R2Bucket;
  ENVIRONMENT: string;
  CORS_ORIGINS: string;
  APP_ORIGIN: string;
  SESSION_TOKEN_PEPPER: string;
  SESSION_COOKIE_DOMAIN?: string;
  RESEND_API_KEY: string;
  AUTH_EMAIL_FROM: string;
  AUTH_EMAIL_REPLY_TO?: string;
  X_CLIENT_ID: string;
  X_CLIENT_SECRET?: string;
  X_REDIRECT_URI: string;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_EXPECTED_HOSTNAME?: string;
  ENABLE_DEV_AUTH?: string;
  MEDIA_SCAN_MODE?: string;
  MEDIA_SCANNER?: Fetcher;
  COMMIT_SHA?: string;
  APP_VERSION?: string;
  AUTH_RATE_LIMITER: RateLimitBinding;
  MUTATION_RATE_LIMITER: RateLimitBinding;
  SEARCH_RATE_LIMITER: RateLimitBinding;
};
export type AccountRow = {
  id: string;
  primary_email: string | null;
  email_verified_at: string | null;
  status: AccountStatus;
  role: AccountRole;
  deletion_requested_at: string | null;
  deletion_scheduled_for: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
export type SessionRow = {
  id: string;
  account_id: string;
  token_hash: string;
  csrf_token_hash: string;
  created_at: string;
  last_seen_at: string;
  idle_expires_at: string;
  absolute_expires_at: string;
  revoked_at: string | null;
  ip_hash: string | null;
  user_agent_summary: string | null;
};
export type AuthIdentityRow = {
  id: string;
  account_id: string;
  provider: AuthProvider;
  provider_subject: string;
  provider_username: string | null;
  provider_display_name: string | null;
  provider_avatar_url: string | null;
  provider_email: string | null;
  provider_email_verified: number;
  provider_profile_synced_at: string | null;
  created_at: string;
  updated_at: string;
};
export type AuthUser = {
  account: AccountRow;
  session: SessionRow;
  profileId: string | null;
  username: string | null;
};
export type AuthVariables = { auth: AuthUser | null; requestId: string };
export type AuraContext = Context<{
  Bindings: AuthBindings;
  Variables: AuthVariables;
}>;

export const SESSION_COOKIE = "aura_session";
export const CSRF_COOKIE = "aura_csrf";
export const rejectsDevelopmentIdentityHeader = (
  environment: string,
  enabled: string | undefined,
  header: string | undefined,
) => Boolean(header && (environment === "production" || enabled !== "1"));

const cookieOptions = (c: AuraContext, httpOnly: boolean) => ({
  httpOnly,
  secure: c.env.ENVIRONMENT === "production",
  sameSite: "Lax" as const,
  path: "/",
  maxAge: Math.floor(AUTH_TIMING.sessionIdleMs / 1000),
  ...(c.env.SESSION_COOKIE_DOMAIN
    ? { domain: c.env.SESSION_COOKIE_DOMAIN }
    : {}),
});

export async function networkHash(c: AuraContext): Promise<string> {
  const network = c.req.header("CF-Connecting-IP") ?? "unknown";
  return hashWithPepper(network, c.env.SESSION_TOKEN_PEPPER);
}
export async function securityEvent(
  c: AuraContext,
  eventType: string,
  accountId: string | null,
  provider?: string,
  metadata?: Record<string, unknown>,
) {
  await c.env.DB.prepare(
    "INSERT INTO security_events (id,account_id,event_type,provider,ip_hash,user_agent_summary,metadata_json) VALUES (?,?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      accountId,
      eventType,
      provider ?? null,
      await networkHash(c),
      summarizeUserAgent(c.req.header("user-agent") ?? null),
      metadata ? JSON.stringify(metadata) : null,
    )
    .run();
}

export async function createSession(
  c: AuraContext,
  accountId: string,
  { revokeCurrent = false }: { revokeCurrent?: boolean } = {},
) {
  if (revokeCurrent) {
    const current = await resolveSession(c);
    if (current)
      await c.env.DB.prepare(
        "UPDATE sessions SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
      )
        .bind(current.session.id)
        .run();
  }
  const raw = generateSecureToken(32);
  const csrf = generateSecureToken(32);
  const now = new Date();
  const expiry = sessionExpiration(now);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO sessions (id,account_id,token_hash,csrf_token_hash,created_at,last_seen_at,idle_expires_at,absolute_expires_at,ip_hash,user_agent_summary) VALUES (?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      accountId,
      await hashWithPepper(raw, c.env.SESSION_TOKEN_PEPPER),
      await hashWithPepper(csrf, c.env.SESSION_TOKEN_PEPPER),
      now.toISOString(),
      now.toISOString(),
      expiry.idleExpiresAt.toISOString(),
      expiry.absoluteExpiresAt.toISOString(),
      await networkHash(c),
      summarizeUserAgent(c.req.header("user-agent") ?? null),
    )
    .run();
  setCookie(c, SESSION_COOKIE, raw, cookieOptions(c, true));
  setCookie(c, CSRF_COOKIE, csrf, cookieOptions(c, false));
  return id;
}

export async function resolveSession(c: AuraContext): Promise<AuthUser | null> {
  const raw = getCookie(c, SESSION_COOKIE);
  if (!raw || !c.env.SESSION_TOKEN_PEPPER) return null;
  const hash = await hashWithPepper(raw, c.env.SESSION_TOKEN_PEPPER);
  const row = await c.env.DB.prepare(
    `SELECT s.*,a.primary_email,a.email_verified_at,a.status,a.role,a.deletion_requested_at,a.deletion_scheduled_for,a.created_at account_created_at,a.updated_at account_updated_at,a.deleted_at account_deleted_at,u.id profile_id,u.username
    FROM sessions s JOIN accounts a ON a.id=s.account_id LEFT JOIN users u ON u.account_id=a.id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.idle_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND s.absolute_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
  )
    .bind(hash)
    .first<
      SessionRow & {
        primary_email: string | null;
        email_verified_at: string | null;
        status: AccountStatus;
        role: AccountRole;
        deletion_requested_at: string | null;
        deletion_scheduled_for: string | null;
        account_created_at: string;
        account_updated_at: string;
        account_deleted_at: string | null;
        profile_id: string | null;
        username: string | null;
      }
    >();
  if (!row) return null;
  if (row.status === "disabled") {
    await c.env.DB.prepare(
      "UPDATE sessions SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
    )
      .bind(row.id)
      .run();
    return null;
  }
  if (shouldRollSession(row.last_seen_at)) {
    const next = Math.min(
      Date.now() + AUTH_TIMING.sessionIdleMs,
      new Date(row.absolute_expires_at).getTime(),
    );
    await c.env.DB.prepare(
      "UPDATE sessions SET last_seen_at=?,idle_expires_at=? WHERE id=?",
    )
      .bind(new Date().toISOString(), new Date(next).toISOString(), row.id)
      .run();
  }
  return {
    session: row,
    profileId: row.profile_id,
    username: row.username,
    account: {
      id: row.account_id,
      primary_email: row.primary_email,
      email_verified_at: row.email_verified_at,
      status: row.status,
      role: row.role,
      deletion_requested_at: row.deletion_requested_at,
      deletion_scheduled_for: row.deletion_scheduled_for,
      created_at: row.account_created_at,
      updated_at: row.account_updated_at,
      deleted_at: row.account_deleted_at,
    },
  };
}

export async function requireAuth(
  c: AuraContext,
  {
    mutation = false,
    recent = false,
    allowPendingDeletion = false,
    allowRestrictedMutation = false,
  }: {
    mutation?: boolean;
    recent?: boolean;
    allowPendingDeletion?: boolean;
    allowRestrictedMutation?: boolean;
  } = {},
): Promise<AuthUser | Response> {
  const devHeader = c.req.header("X-Aura-Dev-User");
  if (
    rejectsDevelopmentIdentityHeader(
      c.env.ENVIRONMENT,
      c.env.ENABLE_DEV_AUTH,
      devHeader,
    )
  )
    return c.json(
      {
        error: {
          code: "DEV_AUTH_DISABLED",
          message: "Development identity headers are disabled.",
        },
      },
      403,
    );
  const auth = await resolveSession(c);
  c.set("auth", auth);
  if (!auth)
    return c.json(
      { error: { code: "AUTH_REQUIRED", message: "Log in to continue." } },
      401,
    );
  if (mutation) {
    if (
      !canMutateForStatus(auth.account.status) &&
      !allowRestrictedMutation &&
      !(allowPendingDeletion && auth.account.status === "pending_deletion")
    )
      return c.json(
        {
          error: {
            code: "ACCOUNT_RESTRICTED",
            message:
              auth.account.status === "suspended"
                ? "This account is suspended. Content changes are unavailable."
                : "Account changes are unavailable in the current state.",
          },
        },
        403,
      );
    const origin = c.req.header("origin") ?? null;
    if (!validateMutationOrigin(origin, c.env.APP_ORIGIN))
      return c.json(
        {
          error: {
            code: "INVALID_ORIGIN",
            message: "The request origin was rejected.",
          },
        },
        403,
      );
    const header = c.req.header("X-Aura-CSRF") ?? "";
    const cookie = getCookie(c, CSRF_COOKIE) ?? "";
    if (
      !header ||
      !cookie ||
      !constantTimeEqual(header, cookie) ||
      !constantTimeEqual(
        await hashWithPepper(header, c.env.SESSION_TOKEN_PEPPER),
        auth.session.csrf_token_hash,
      )
    )
      return c.json(
        {
          error: {
            code: "CSRF_REJECTED",
            message: "Refresh the page and try again.",
          },
        },
        403,
      );
  }
  if (
    recent &&
    Date.now() - new Date(auth.session.created_at).getTime() >
      AUTH_TIMING.recentAuthenticationMs
  )
    return c.json(
      {
        error: {
          code: "RECENT_AUTH_REQUIRED",
          message: "Sign in again before making this security change.",
        },
      },
      403,
    );
  return auth;
}

export function clearSessionCookies(c: AuraContext) {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  deleteCookie(c, CSRF_COOKIE, { path: "/" });
}
export const usableToken = (row: {
  expires_at: string;
  consumed_at: string | null;
}) => isOneTimeTokenUsable(row.expires_at, row.consumed_at);
export const authSafeRedirect = (value: unknown) =>
  safeRedirect(value, "/home");

export async function protectSecret(
  value: string,
  pepper: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pepper)),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value),
  );
  return `${toB64(iv)}.${toB64(new Uint8Array(encrypted))}`;
}
export async function unprotectSecret(
  value: string,
  pepper: string,
): Promise<string> {
  const [ivText, dataText] = value.split(".");
  if (!ivText || !dataText) throw new Error("Invalid protected value");
  const key = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pepper)),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivText) },
    key,
    fromB64(dataText),
  );
  return new TextDecoder().decode(plain);
}
const toB64 = (v: Uint8Array) => {
  let s = "";
  for (const b of v) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const fromB64 = (v: string) => {
  const s = atob(v.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export async function distributedLimit(
  c: AuraContext,
  binding: RateLimitBinding,
  key: string,
  retryAfter = 60,
): Promise<Response | null> {
  const result = await binding.limit({ key });
  if (result.success) return null;
  const response = c.json(
    {
      error: {
        code: "RATE_LIMITED",
        message: "Too many attempts. Please try again shortly.",
      },
    },
    429,
  );
  response.headers.set("Retry-After", String(retryAfter));
  return response;
}
export const loginAllowed = (account: AccountRow) =>
  canLoginForStatus(account.status);
