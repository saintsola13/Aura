import {
  AUTH_TIMING,
  createPkce,
  generateSecureToken,
  hashWithPepper,
  isEmail,
  maskEmail,
  normalizeEmail,
  privateRateLimitKey,
  safeRedirect,
  summarizeUserAgent,
} from "@aura/shared";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import {
  authSafeRedirect,
  clearSessionCookies,
  createSession,
  distributedLimit,
  loginAllowed,
  networkHash,
  protectSecret,
  requireAuth,
  resolveSession,
  securityEvent,
  unprotectSecret,
  CSRF_COOKIE,
  type AccountRow,
  type AuthBindings,
  type AuthIdentityRow,
  type AuthVariables,
  type AuraContext,
} from "./auth";

type EmailTokenRow = {
  id: string;
  account_id: string | null;
  purpose: "login" | "email_change";
  email_normalized: string;
  token_hash: string;
  redirect_path: string;
  expires_at: string;
  consumed_at: string | null;
};
type OAuthRow = {
  id: string;
  state_hash: string;
  code_verifier_protected: string;
  linking_account_id: string | null;
  redirect_path: string;
  expires_at: string;
  consumed_at: string | null;
};
const genericEmailMessage =
  "If that email can receive messages, AURA sent a secure sign-in link.";

const authError = (
  c: AuraContext,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502,
  code: string,
  message: string,
) => c.json({ error: { code, message } }, status);

async function validateTurnstile(
  c: AuraContext,
  token: string,
  action: string,
) {
  if (!token || token.length > 2048) return false;
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: c.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: c.req.header("CF-Connecting-IP"),
        idempotency_key: crypto.randomUUID(),
      }),
    },
  );
  if (!response.ok) return false;
  const result = (await response.json()) as {
    success: boolean;
    hostname?: string;
    action?: string;
  };
  if (!result.success) return false;
  if (
    c.env.TURNSTILE_EXPECTED_HOSTNAME &&
    result.hostname !== c.env.TURNSTILE_EXPECTED_HOSTNAME
  )
    return false;
  return !result.action || result.action === action;
}

function emailMarkup(url: string) {
  return {
    html: `<!doctype html><html><body style="margin:0;background:#070708;color:#f5f5f5;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:48px 24px"><p style="letter-spacing:.2em;font-size:12px;color:#a78bfa">AURA</p><h1 style="font-size:30px">Continue to AURA</h1><p style="color:#a1a1aa;line-height:1.6">Use the secure button below to confirm this sign-in request.</p><p style="margin:32px 0"><a href="${url}" style="display:inline-block;background:#fff;color:#000;text-decoration:none;border-radius:999px;padding:14px 22px">Review sign-in</a></p><p style="color:#71717a;font-size:13px">This link expires in 15 minutes. Ignore this email if you did not request it.</p></div></body></html>`,
    text: `Continue to AURA\n\nReview and confirm this sign-in request: ${url}\n\nThis link expires in 15 minutes. Ignore this email if you did not request it.`,
  };
}

async function sendEmail(
  c: AuraContext,
  to: string,
  subject: string,
  content: { html: string; text: string },
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${c.env.RESEND_API_KEY}`,
      "content-type": "application/json",
      "user-agent": "AURA Worker/1.0",
      "idempotency-key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      from: c.env.AUTH_EMAIL_FROM,
      to: [to],
      subject,
      html: content.html,
      text: content.text,
      ...(c.env.AUTH_EMAIL_REPLY_TO
        ? { reply_to: c.env.AUTH_EMAIL_REPLY_TO }
        : {}),
    }),
  });
  if (!response.ok) throw new Error("Email delivery failed");
}

async function uniqueUsername(c: AuraContext, hint: string) {
  const base =
    hint
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 18) || "aura_member";
  for (let i = 0; i < 8; i++) {
    const value = `${base.slice(0, 18)}_${generateSecureToken(4).slice(0, 5).toLowerCase()}`;
    if (
      !(await c.env.DB.prepare(
        "SELECT id FROM users WHERE username=? COLLATE NOCASE",
      )
        .bind(value)
        .first())
    )
      return value;
  }
  throw new Error("Unable to allocate username");
}

async function createAccount(
  c: AuraContext,
  provider: "email" | "x",
  subject: string,
  identity: Partial<AuthIdentityRow> = {},
) {
  const accountId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const username = await uniqueUsername(
    c,
    identity.provider_username ?? subject.split("@")[0] ?? "member",
  );
  const now = new Date().toISOString();
  const email = provider === "email" ? subject : null;
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO accounts (id,primary_email,email_verified_at,status,role) VALUES (?,?,?,'active','user')",
    ).bind(accountId, email, email ? now : null),
    c.env.DB.prepare(
      "INSERT INTO auth_identities (id,account_id,provider,provider_subject,provider_username,provider_display_name,provider_avatar_url,provider_email,provider_email_verified,provider_profile_synced_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      accountId,
      provider,
      subject,
      identity.provider_username ?? null,
      identity.provider_display_name ?? null,
      identity.provider_avatar_url ?? null,
      email,
      provider === "email" ? 1 : 0,
      provider === "x" ? now : null,
    ),
    c.env.DB.prepare(
      "INSERT INTO users (id,account_id,username,display_name) VALUES (?,?,?,?)",
    ).bind(
      userId,
      accountId,
      username,
      identity.provider_display_name ?? username,
    ),
  ]);
  return accountId;
}

async function accountForEmail(c: AuraContext, email: string) {
  return c.env.DB.prepare(
    "SELECT a.* FROM auth_identities i JOIN accounts a ON a.id=i.account_id WHERE i.provider='email' AND i.provider_subject=? COLLATE NOCASE",
  )
    .bind(email)
    .first<AccountRow>();
}

async function consumeEmailToken(
  c: AuraContext,
  raw: string,
  purpose: "login" | "email_change",
) {
  const hash = await hashWithPepper(raw, c.env.SESSION_TOKEN_PEPPER);
  const row = await c.env.DB.prepare(
    "SELECT * FROM email_login_tokens WHERE token_hash=? AND purpose=?",
  )
    .bind(hash, purpose)
    .first<EmailTokenRow>();
  if (
    !row ||
    row.consumed_at ||
    new Date(row.expires_at).getTime() <= Date.now()
  )
    return null;
  const update = await c.env.DB.prepare(
    "UPDATE email_login_tokens SET consumed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND consumed_at IS NULL AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')",
  )
    .bind(row.id)
    .run();
  return update.meta.changes === 1 ? row : null;
}

async function startX(c: AuraContext, linkingAccountId: string | null) {
  const networkKey = await privateRateLimitKey(
    "oauth-start",
    await networkHash(c),
    c.env.SESSION_TOKEN_PEPPER,
  );
  const limited = await distributedLimit(
    c,
    c.env.AUTH_RATE_LIMITER,
    networkKey,
  );
  if (limited) return limited;
  const redirectPath = authSafeRedirect(c.req.query("redirect"));
  const state = generateSecureToken(32);
  const { verifier, challenge } = await createPkce();
  const expires = new Date(
    Date.now() + AUTH_TIMING.oauthTransactionMs,
  ).toISOString();
  await c.env.DB.prepare(
    "INSERT INTO oauth_transactions (id,provider,state_hash,code_verifier_protected,linking_account_id,redirect_path,expires_at) VALUES (?,'x',?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      await hashWithPepper(state, c.env.SESSION_TOKEN_PEPPER),
      await protectSecret(verifier, c.env.SESSION_TOKEN_PEPPER),
      linkingAccountId,
      redirectPath,
      expires,
    )
    .run();
  const url = new URL("https://x.com/i/oauth2/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: c.env.X_CLIENT_ID,
    redirect_uri: c.env.X_REDIRECT_URI,
    scope: "tweet.read users.read",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return c.redirect(url.toString());
}

export function registerAuthRoutes(
  app: Hono<{ Bindings: AuthBindings; Variables: AuthVariables }>,
) {
  app.post("/v1/auth/email/request", async (c) => {
    const body: {
      email?: string;
      turnstileToken?: string;
      redirectPath?: string;
    } = await c.req
      .json<{
        email?: string;
        turnstileToken?: string;
        redirectPath?: string;
      }>()
      .catch(() => ({}));
    const email = normalizeEmail(body.email ?? "");
    if (!isEmail(email))
      return authError(c, 422, "INVALID_EMAIL", "Enter a valid email address.");
    if (!(await validateTurnstile(c, body.turnstileToken ?? "", "email_login")))
      return authError(
        c,
        403,
        "TURNSTILE_FAILED",
        "Complete the security check and try again.",
      );
    const network = await networkHash(c);
    for (const key of [
      await privateRateLimitKey(
        "magic-network",
        network,
        c.env.SESSION_TOKEN_PEPPER,
      ),
      await privateRateLimitKey(
        "magic-email",
        email,
        c.env.SESSION_TOKEN_PEPPER,
      ),
    ]) {
      const limited = await distributedLimit(c, c.env.AUTH_RATE_LIMITER, key);
      if (limited) return limited;
    }
    const raw = generateSecureToken(32);
    const redirect = authSafeRedirect(body.redirectPath);
    await c.env.DB.prepare(
      "INSERT INTO email_login_tokens (id,purpose,email_normalized,token_hash,requested_ip_hash,requested_user_agent,redirect_path,expires_at) VALUES (?,'login',?,?,?,?,?,?)",
    )
      .bind(
        crypto.randomUUID(),
        email,
        await hashWithPepper(raw, c.env.SESSION_TOKEN_PEPPER),
        network,
        summarizeUserAgent(c.req.header("user-agent") ?? null),
        redirect,
        new Date(Date.now() + AUTH_TIMING.magicLinkMs).toISOString(),
      )
      .run();
    const url = `${c.env.APP_ORIGIN}/auth/email/confirm?token=${encodeURIComponent(raw)}`;
    try {
      await sendEmail(
        c,
        email,
        "Your secure AURA sign-in link",
        emailMarkup(url),
      );
    } catch {
      await securityEvent(c, "login_failed", null, "email", {
        stage: "delivery",
      });
    }
    await securityEvent(c, "login_requested", null, "email");
    return c.json({
      data: { message: genericEmailMessage, maskedEmail: maskEmail(email) },
    });
  });

  app.post("/v1/auth/email/consume", async (c) => {
    const body: { token?: string } = await c.req
      .json<{ token?: string }>()
      .catch(() => ({}));
    if (!body.token)
      return authError(
        c,
        400,
        "INVALID_LINK",
        "This sign-in link is invalid or expired.",
      );
    const limited = await distributedLimit(
      c,
      c.env.AUTH_RATE_LIMITER,
      await privateRateLimitKey(
        "consume",
        await networkHash(c),
        c.env.SESSION_TOKEN_PEPPER,
      ),
    );
    if (limited) return limited;
    const token = await consumeEmailToken(c, body.token, "login");
    if (!token) {
      await securityEvent(c, "login_failed", null, "email", {
        reason: "invalid_or_expired",
      });
      return authError(
        c,
        400,
        "INVALID_LINK",
        "This sign-in link is invalid or expired.",
      );
    }
    let account = await accountForEmail(c, token.email_normalized);
    let accountId = account?.id;
    if (!accountId) {
      accountId = await createAccount(c, "email", token.email_normalized);
      account = await c.env.DB.prepare("SELECT * FROM accounts WHERE id=?")
        .bind(accountId)
        .first<AccountRow>();
    }
    if (!account || !loginAllowed(account)) {
      await securityEvent(c, "login_failed", accountId ?? null, "email", {
        reason: "account_disabled",
      });
      return authError(
        c,
        403,
        "LOGIN_UNAVAILABLE",
        "This account cannot sign in.",
      );
    }
    await createSession(c, accountId, { revokeCurrent: true });
    await securityEvent(c, "login_succeeded", accountId, "email");
    return c.json({
      data: { redirectPath: safeRedirect(token.redirect_path) },
    });
  });

  app.get("/v1/auth/session", async (c) => {
    const auth = await resolveSession(c);
    if (!auth) return c.json({ data: null });
    const identities = await c.env.DB.prepare(
      "SELECT * FROM auth_identities WHERE account_id=? ORDER BY created_at",
    )
      .bind(auth.account.id)
      .all<AuthIdentityRow>();
    const profile = auth.profileId
      ? await c.env.DB.prepare(
          "SELECT id,username,display_name,avatar_key FROM users WHERE id=?",
        )
          .bind(auth.profileId)
          .first()
      : null;
    return c.json({
      data: {
        account: {
          id: auth.account.id,
          primaryEmail: auth.account.primary_email,
          status: auth.account.status,
          role: auth.account.role,
          createdAt: auth.account.created_at,
          deletionScheduledFor: auth.account.deletion_scheduled_for,
        },
        identities: identities.results.map((i) => ({
          id: i.id,
          provider: i.provider,
          username: i.provider_username,
          email: i.provider_email,
          verified: Boolean(i.provider_email_verified),
        })),
        profile,
        session: {
          id: auth.session.id,
          idleExpiresAt: auth.session.idle_expires_at,
          absoluteExpiresAt: auth.session.absolute_expires_at,
        },
      },
    });
  });
  app.post("/v1/auth/logout", async (c) => {
    const auth = await requireAuth(c, { mutation: true, allowRestrictedMutation: true });
    if (auth instanceof Response) return auth;
    await c.env.DB.prepare(
      "UPDATE sessions SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
    )
      .bind(auth.session.id)
      .run();
    clearSessionCookies(c);
    await securityEvent(c, "logout", auth.account.id);
    return c.json({ data: { loggedOut: true } });
  });
  app.post("/v1/auth/logout-all", async (c) => {
    const auth = await requireAuth(c, { mutation: true, recent: true, allowRestrictedMutation: true });
    if (auth instanceof Response) return auth;
    await c.env.DB.prepare(
      "UPDATE sessions SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE account_id=? AND revoked_at IS NULL",
    )
      .bind(auth.account.id)
      .run();
    clearSessionCookies(c);
    await securityEvent(c, "all_sessions_revoked", auth.account.id);
    return c.json({ data: { loggedOut: true } });
  });
  app.get("/v1/auth/sessions", async (c) => {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const rows = await c.env.DB.prepare(
      "SELECT id,created_at,last_seen_at,idle_expires_at,absolute_expires_at,revoked_at,user_agent_summary FROM sessions WHERE account_id=? AND revoked_at IS NULL AND absolute_expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') ORDER BY last_seen_at DESC",
    )
      .bind(auth.account.id)
      .all();
    return c.json({
      data: rows.results.map((row) => ({
        ...row,
        current: (row as { id: string }).id === auth.session.id,
      })),
    });
  });
  app.delete("/v1/auth/sessions/:id", async (c) => {
    const auth = await requireAuth(c, { mutation: true, recent: true });
    if (auth instanceof Response) return auth;
    const result = await c.env.DB.prepare(
      "UPDATE sessions SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND account_id=? AND revoked_at IS NULL",
    )
      .bind(c.req.param("id"), auth.account.id)
      .run();
    if (!result.meta.changes)
      return authError(c, 404, "NOT_FOUND", "Session not found.");
    if (c.req.param("id") === auth.session.id) clearSessionCookies(c);
    await securityEvent(c, "session_revoked", auth.account.id, undefined, {
      sessionId: c.req.param("id"),
    });
    return c.json({ data: { revoked: true } });
  });

  app.get("/v1/auth/x/start", (c) => startX(c, null));
  app.get("/v1/auth/x/link/start", async (c) => {
    const auth = await requireAuth(c, { recent: true });
    if (auth instanceof Response) return auth;
    const site = c.req.header("Sec-Fetch-Site");
    if (site && site !== "same-origin")
      return authError(
        c,
        403,
        "INVALID_ORIGIN",
        "The request origin was rejected.",
      );
    return startX(c, auth.account.id);
  });
  app.get("/v1/auth/x/callback", async (c) => {
    const callbackLimit = await distributedLimit(c, c.env.AUTH_RATE_LIMITER, await privateRateLimitKey("oauth-callback", await networkHash(c), c.env.SESSION_TOKEN_PEPPER));
    if (callbackLimit) return callbackLimit;
    const state = c.req.query("state") ?? "";
    const code = c.req.query("code") ?? "";
    if (!state || !code)
      return c.redirect(`${c.env.APP_ORIGIN}/login?error=x_login_failed`);
    const stateHash = await hashWithPepper(state, c.env.SESSION_TOKEN_PEPPER);
    const tx = await c.env.DB.prepare(
      "SELECT * FROM oauth_transactions WHERE state_hash=? AND provider='x'",
    )
      .bind(stateHash)
      .first<OAuthRow>();
    if (
      !tx ||
      tx.consumed_at ||
      new Date(tx.expires_at).getTime() <= Date.now()
    )
      return c.redirect(`${c.env.APP_ORIGIN}/login?error=x_state_invalid`);
    const consumed = await c.env.DB.prepare(
      "UPDATE oauth_transactions SET consumed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND consumed_at IS NULL AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')",
    )
      .bind(tx.id)
      .run();
    if (!consumed.meta.changes)
      return c.redirect(`${c.env.APP_ORIGIN}/login?error=x_state_invalid`);
    try {
      if (tx.linking_account_id) {
        const current = await resolveSession(c);
        if (!current || current.account.id !== tx.linking_account_id) return c.redirect(`${c.env.APP_ORIGIN}/login?error=link_session_expired`);
      }
      const verifier = await unprotectSecret(
        tx.code_verifier_protected,
        c.env.SESSION_TOKEN_PEPPER,
      );
      const headers: Record<string, string> = {
        "content-type": "application/x-www-form-urlencoded",
      };
      if (c.env.X_CLIENT_SECRET)
        headers.authorization = `Basic ${btoa(`${c.env.X_CLIENT_ID}:${c.env.X_CLIENT_SECRET}`)}`;
      const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
        method: "POST",
        headers,
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          client_id: c.env.X_CLIENT_ID,
          redirect_uri: c.env.X_REDIRECT_URI,
          code_verifier: verifier,
        }),
      });
      if (!tokenResponse.ok) throw new Error("provider_exchange_failed");
      const providerToken = (await tokenResponse.json()) as {
        access_token: string;
      };
      const userResponse = await fetch(
        "https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url",
        { headers: { authorization: `Bearer ${providerToken.access_token}` } },
      );
      if (!userResponse.ok) throw new Error("provider_profile_failed");
      const { x } = {
        x: (
          (await userResponse.json()) as {
            data: {
              id: string;
              name: string;
              username: string;
              profile_image_url?: string;
            };
          }
        ).data,
      };
      let identity = await c.env.DB.prepare(
        "SELECT * FROM auth_identities WHERE provider='x' AND provider_subject=?",
      )
        .bind(x.id)
        .first<AuthIdentityRow>();
      let accountId: string;
      if (tx.linking_account_id) {
        if (identity && identity.account_id !== tx.linking_account_id) {
          await securityEvent(c, "login_failed", tx.linking_account_id, "x", {
            reason: "identity_conflict",
          });
          return c.redirect(
            `${c.env.APP_ORIGIN}/settings/account?error=x_identity_in_use`,
          );
        }
        accountId = tx.linking_account_id;
        if (!identity) {
          await c.env.DB.prepare(
            "INSERT INTO auth_identities (id,account_id,provider,provider_subject,provider_username,provider_display_name,provider_avatar_url,provider_profile_synced_at) VALUES (?,?,'x',?,?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
          )
            .bind(
              crypto.randomUUID(),
              accountId,
              x.id,
              x.username,
              x.name,
              x.profile_image_url ?? null,
            )
            .run();
          await securityEvent(c, "identity_linked", accountId, "x");
        }
      } else if (identity) {
        accountId = identity.account_id;
        await c.env.DB.prepare(
          "UPDATE auth_identities SET provider_username=?,provider_display_name=?,provider_avatar_url=?,provider_profile_synced_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
        )
          .bind(x.username, x.name, x.profile_image_url ?? null, identity.id)
          .run();
      } else
        accountId = await createAccount(c, "x", x.id, {
          provider_username: x.username,
          provider_display_name: x.name,
          provider_avatar_url: x.profile_image_url ?? null,
        });
      const account = await c.env.DB.prepare(
        "SELECT * FROM accounts WHERE id=?",
      )
        .bind(accountId)
        .first<AccountRow>();
      if (!account || !loginAllowed(account))
        return c.redirect(
          `${c.env.APP_ORIGIN}/login?error=account_unavailable`,
        );
      await createSession(c, accountId, { revokeCurrent: true });
      await securityEvent(c, "login_succeeded", accountId, "x");
      return c.redirect(`${c.env.APP_ORIGIN}${safeRedirect(tx.redirect_path)}`);
    } catch {
      await securityEvent(c, "login_failed", tx.linking_account_id, "x", {
        reason: "provider_failure",
      });
      return c.redirect(`${c.env.APP_ORIGIN}/login?error=x_login_failed`);
    }
  });
  app.get("/v1/auth/x/link/callback", (c) =>
    c.redirect(
      new URL(c.req.url).toString().replace("/x/link/callback", "/x/callback"),
    ),
  );
  app.delete("/v1/auth/x/link", async (c) => {
    const auth = await requireAuth(c, { mutation: true, recent: true });
    if (auth instanceof Response) return auth;
    const count = await c.env.DB.prepare(
      "SELECT count(*) count FROM auth_identities WHERE account_id=? AND (provider='x' OR provider_email_verified=1)",
    )
      .bind(auth.account.id)
      .first<{ count: number }>();
    if (Number(count?.count ?? 0) <= 1)
      return authError(
        c,
        409,
        "LAST_AUTH_METHOD",
        "Add and verify another sign-in method before disconnecting X.",
      );
    await c.env.DB.prepare(
      "DELETE FROM auth_identities WHERE account_id=? AND provider='x'",
    )
      .bind(auth.account.id)
      .run();
    await securityEvent(c, "identity_unlinked", auth.account.id, "x");
    return c.json({ data: { unlinked: true } });
  });

  app.post("/v1/auth/email/change/request", async (c) => {
    const auth = await requireAuth(c, { mutation: true, recent: true });
    if (auth instanceof Response) return auth;
    const body: { email?: string; turnstileToken?: string } = await c.req
      .json<{ email?: string; turnstileToken?: string }>()
      .catch(() => ({}));
    const email = normalizeEmail(body.email ?? "");
    if (!isEmail(email))
      return authError(c, 422, "INVALID_EMAIL", "Enter a valid email address.");
    if (
      !(await validateTurnstile(c, body.turnstileToken ?? "", "email_change"))
    )
      return authError(
        c,
        403,
        "TURNSTILE_FAILED",
        "Complete the security check and try again.",
      );
    if (await accountForEmail(c, email))
      return authError(
        c,
        409,
        "IDENTITY_IN_USE",
        "That email is already linked to another account.",
      );
    const raw = generateSecureToken();
    await c.env.DB.prepare(
      "INSERT INTO email_login_tokens (id,account_id,purpose,email_normalized,token_hash,requested_ip_hash,requested_user_agent,redirect_path,expires_at) VALUES (?,?,'email_change',?,?,?,?, '/settings/account',?)",
    )
      .bind(
        crypto.randomUUID(),
        auth.account.id,
        email,
        await hashWithPepper(raw, c.env.SESSION_TOKEN_PEPPER),
        await networkHash(c),
        summarizeUserAgent(c.req.header("user-agent") ?? null),
        new Date(Date.now() + AUTH_TIMING.magicLinkMs).toISOString(),
      )
      .run();
    await sendEmail(
      c,
      email,
      "Confirm your AURA email",
      emailMarkup(
        `${c.env.APP_ORIGIN}/auth/email/confirm?purpose=email_change&token=${encodeURIComponent(raw)}`,
      ),
    );
    return c.json({
      data: { message: genericEmailMessage, maskedEmail: maskEmail(email) },
    });
  });
  app.post("/v1/auth/email/change/confirm", async (c) => {
    const auth = await requireAuth(c, { mutation: true, recent: true });
    if (auth instanceof Response) return auth;
    const body: { token?: string } = await c.req
      .json<{ token?: string }>()
      .catch(() => ({}));
    const token = body.token
      ? await consumeEmailToken(c, body.token, "email_change")
      : null;
    if (!token || token.account_id !== auth.account.id)
      return authError(
        c,
        400,
        "INVALID_LINK",
        "This confirmation link is invalid or expired.",
      );
    if (await accountForEmail(c, token.email_normalized))
      return authError(
        c,
        409,
        "IDENTITY_IN_USE",
        "That email is already linked to another account.",
      );
    const old = auth.account.primary_email;
    await c.env.DB.batch([
      c.env.DB.prepare(
        "DELETE FROM auth_identities WHERE account_id=? AND provider='email'",
      ).bind(auth.account.id),
      c.env.DB.prepare(
        "INSERT INTO auth_identities (id,account_id,provider,provider_subject,provider_email,provider_email_verified) VALUES (?,?,'email',?,?,1)",
      ).bind(
        crypto.randomUUID(),
        auth.account.id,
        token.email_normalized,
        token.email_normalized,
      ),
      c.env.DB.prepare(
        "UPDATE accounts SET primary_email=?,email_verified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
      ).bind(token.email_normalized, auth.account.id),
      c.env.DB.prepare(
        "UPDATE sessions SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE account_id=?",
      ).bind(auth.account.id),
    ]);
    await createSession(c, auth.account.id);
    await securityEvent(c, "email_changed", auth.account.id, "email");
    if (old)
      await sendEmail(c, old, "Your AURA email was changed", {
        html: "<p>The verified email on your AURA account was changed. Contact support immediately if this was not you.</p>",
        text: "The verified email on your AURA account was changed. Contact support immediately if this was not you.",
      }).catch(() => undefined);
    return c.json({ data: { changed: true } });
  });

  app.post("/v1/account/delete/request", async (c) => {
    const auth = await requireAuth(c, { mutation: true, recent: true });
    if (auth instanceof Response) return auth;
    const body: { confirmation?: string } = await c.req
      .json<{ confirmation?: string }>()
      .catch(() => ({}));
    if (body.confirmation !== "DELETE AURA ACCOUNT")
      return authError(
        c,
        422,
        "CONFIRMATION_REQUIRED",
        "Type DELETE AURA ACCOUNT to continue.",
      );
    const deadline = new Date(
      Date.now() + AUTH_TIMING.deletionGraceMs,
    ).toISOString();
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE accounts SET status='pending_deletion',deletion_requested_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),deletion_scheduled_for=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
      ).bind(deadline, auth.account.id),
      c.env.DB.prepare(
        "UPDATE sessions SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE account_id=?",
      ).bind(auth.account.id),
    ]);
    clearSessionCookies(c);
    await securityEvent(c, "account_deleted", auth.account.id, undefined, {
      stage: "requested",
      deadline,
    });
    return c.json({
      data: { pendingDeletion: true, deletionScheduledFor: deadline },
    });
  });
  app.post("/v1/account/delete/cancel", async (c) => {
    const auth = await requireAuth(c, {
      mutation: true,
      recent: true,
      allowPendingDeletion: true,
    });
    if (auth instanceof Response) return auth;
    if (auth.account.status !== "pending_deletion")
      return authError(
        c,
        409,
        "NOT_PENDING_DELETION",
        "This account is not pending deletion.",
      );
    await c.env.DB.prepare(
      "UPDATE accounts SET status='active',deletion_requested_at=NULL,deletion_scheduled_for=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
    )
      .bind(auth.account.id)
      .run();
    await securityEvent(c, "account_deletion_cancelled", auth.account.id);
    return c.json({ data: { cancelled: true } });
  });
}
