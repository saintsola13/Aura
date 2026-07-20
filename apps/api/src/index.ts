import { isEthereumAddress, normalizeWalletAddress, type UserProfile } from "@aura/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

type Bindings = {
  DB: D1Database;
  AVATARS: R2Bucket;
  CORS_ORIGINS: string;
  ENVIRONMENT: string;
};

type UserRow = {
  id: string;
  wallet_address: string;
  display_name: string | null;
  bio: string | null;
  avatar_key: string | null;
  created_at: string;
  updated_at: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const toProfile = (row: UserRow): UserProfile => ({
  id: row.id,
  walletAddress: row.wallet_address,
  displayName: row.display_name,
  bio: row.bio,
  avatarKey: row.avatar_key,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

app.use("*", secureHeaders());
app.use("/v1/*", async (c, next) => {
  const allowed = c.env.CORS_ORIGINS.split(",").map((origin) => origin.trim());
  return cors({
    origin: (origin) => allowed.includes(origin) ? origin : allowed[0] ?? "",
    allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })(c, next);
});

app.get("/", (c) => c.json({ name: "AURA API", version: "v1" }));
app.get("/health", (c) => c.json({ status: "ok", environment: c.env.ENVIRONMENT }));

app.get("/v1/profiles/:wallet", async (c) => {
  const wallet = c.req.param("wallet");
  if (!isEthereumAddress(wallet)) return c.json({ error: { code: "INVALID_WALLET", message: "A valid Ethereum address is required." } }, 400);

  const row = await c.env.DB.prepare("SELECT * FROM users WHERE wallet_address = ?")
    .bind(normalizeWalletAddress(wallet)).first<UserRow>();
  if (!row) return c.json({ error: { code: "NOT_FOUND", message: "Profile not found." } }, 404);
  return c.json({ data: toProfile(row) });
});

app.put("/v1/profiles/:wallet", async (c) => {
  const wallet = c.req.param("wallet");
  if (!isEthereumAddress(wallet)) return c.json({ error: { code: "INVALID_WALLET", message: "A valid Ethereum address is required." } }, 400);

  const body = await c.req.json<{ displayName?: unknown; bio?: unknown }>().catch(() => null);
  if (!body) return c.json({ error: { code: "INVALID_BODY", message: "A JSON body is required." } }, 400);
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : null;
  const bio = typeof body.bio === "string" ? body.bio.trim() : null;
  if ((displayName?.length ?? 0) > 50 || (bio?.length ?? 0) > 280) {
    return c.json({ error: { code: "INVALID_PROFILE", message: "Display name is limited to 50 characters and bio to 280." } }, 422);
  }

  const normalized = normalizeWalletAddress(wallet);
  await c.env.DB.prepare(`
    INSERT INTO users (id, wallet_address, display_name, bio)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(wallet_address) DO UPDATE SET
      display_name = excluded.display_name,
      bio = excluded.bio,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).bind(crypto.randomUUID(), normalized, displayName || null, bio || null).run();

  const row = await c.env.DB.prepare("SELECT * FROM users WHERE wallet_address = ?").bind(normalized).first<UserRow>();
  return c.json({ data: toProfile(row!) });
});

app.put("/v1/profiles/:wallet/avatar", async (c) => {
  const wallet = c.req.param("wallet");
  if (!isEthereumAddress(wallet)) return c.json({ error: { code: "INVALID_WALLET", message: "A valid Ethereum address is required." } }, 400);
  const contentType = c.req.header("content-type") ?? "";
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(contentType)) return c.json({ error: { code: "INVALID_IMAGE", message: "Use a JPEG, PNG, or WebP image." } }, 415);
  const bytes = await c.req.arrayBuffer();
  if (bytes.byteLength > 5_000_000) return c.json({ error: { code: "IMAGE_TOO_LARGE", message: "Images must be smaller than 5 MB." } }, 413);

  const normalized = normalizeWalletAddress(wallet);
  const key = `avatars/${normalized}/${crypto.randomUUID()}`;
  await c.env.AVATARS.put(key, bytes, { httpMetadata: { contentType }, customMetadata: { wallet: normalized } });
  const result = await c.env.DB.prepare("UPDATE users SET avatar_key = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE wallet_address = ?")
    .bind(key, normalized).run();
  if (!result.meta.changes) {
    await c.env.AVATARS.delete(key);
    return c.json({ error: { code: "NOT_FOUND", message: "Create a profile before uploading an avatar." } }, 404);
  }
  return c.json({ data: { key } });
});

app.get("/v1/avatars/:wallet", async (c) => {
  const wallet = c.req.param("wallet");
  if (!isEthereumAddress(wallet)) return c.json({ error: { code: "INVALID_WALLET", message: "A valid Ethereum address is required." } }, 400);
  const row = await c.env.DB.prepare("SELECT avatar_key FROM users WHERE wallet_address = ?")
    .bind(normalizeWalletAddress(wallet)).first<{ avatar_key: string | null }>();
  if (!row?.avatar_key) return c.json({ error: { code: "NOT_FOUND", message: "Avatar not found." } }, 404);
  const object = await c.env.AVATARS.get(row.avatar_key);
  if (!object) return c.json({ error: { code: "NOT_FOUND", message: "Avatar not found." } }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=3600");
  return new Response(object.body, { headers });
});

app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Route not found." } }, 404));
app.onError((error, c) => {
  console.error(error);
  return c.json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } }, 500);
});

export default app;
