import {
  canFollow,
  isEthereumAddress,
  isImageMimeType,
  isPaginationCursor,
  normalizeWalletAddress,
  parseMentions,
  validatePost,
  validateProfile,
  LIMITS,
  AUTH_TIMING,
  createPkce,
  generateSecureToken,
  hashWithPepper,
  isEmail,
  matchesImageSignature,
  normalizeEmail,
  privateRateLimitKey,
  safeRedirect,
  type CreatePostInput,
  type FeedPost,
  type ImageMimeType,
  type Notification,
  type PaginatedResponse,
  type PublicUserProfile,
  type UpdateProfileInput,
} from "@aura/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import {
  distributedLimit,
  networkHash,
  requireAuth,
  resolveSession,
  type AuraContext,
  type AuthBindings,
  type AuthVariables,
} from "./auth";
import { registerAuthRoutes } from "./auth-routes";

type Bindings = AuthBindings;
type Variables = AuthVariables;
type AppContext = AuraContext;

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_key: string | null;
  banner_key: string | null;
  location: string | null;
  website_url: string | null;
  manually_entered_wallet_address: string | null;
  is_verified: number;
  created_at: string;
  updated_at: string;
};

type FeedRow = {
  id: string;
  user_id: string;
  body: string | null;
  media_key: string | null;
  media_type: ImageMimeType | null;
  repost_of_post_id: string | null;
  reply_to_post_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author_id: string;
  author_username: string;
  author_display_name: string;
  author_avatar_key: string | null;
  author_verified: number;
  like_count: number;
  comment_count: number;
  repost_count: number;
  current_user_liked: number;
  current_user_follows: number;
  original_id: string | null;
  original_body: string | null;
  original_created_at: string | null;
  original_author_id: string | null;
  original_author_username: string | null;
  original_author_display_name: string | null;
  original_author_avatar_key: string | null;
  original_author_verified: number | null;
  parent_id: string | null;
  parent_body: string | null;
  parent_created_at: string | null;
  parent_author_id: string | null;
  parent_author_username: string | null;
  parent_author_display_name: string | null;
  parent_author_avatar_key: string | null;
  parent_author_verified: number | null;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const error = (
  c: AppContext,
  status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 500,
  code: string,
  message: string,
  fields?: Record<string, string>,
) =>
  c.json({ error: { code, message, ...(fields ? { fields } : {}) } }, status);

const mediaUrl = (key: string | null) => (key ? `/v1/media/${key}` : null);
const toProfile = (row: UserRow): PublicUserProfile => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name,
  bio: row.bio,
  avatarUrl: mediaUrl(row.avatar_key),
  bannerUrl: mediaUrl(row.banner_key),
  location: row.location,
  websiteUrl: row.website_url,
  manuallyEnteredWalletAddress: row.manually_entered_wallet_address,
  isVerified: Boolean(row.is_verified),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const authorFrom = (
  id: string,
  username: string,
  displayName: string,
  avatarKey: string | null,
  verified: number | null,
) => ({
  id,
  username,
  displayName,
  avatarUrl: mediaUrl(avatarKey),
  isVerified: Boolean(verified),
});

const toFeedPost = (row: FeedRow): FeedPost => ({
  id: row.id,
  userId: row.user_id,
  body: row.body,
  mediaUrl: mediaUrl(row.media_key),
  mediaType: row.media_type,
  repostOfPostId: row.repost_of_post_id,
  replyToPostId: row.reply_to_post_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
  author: authorFrom(
    row.author_id,
    row.author_username,
    row.author_display_name,
    row.author_avatar_key,
    row.author_verified,
  ),
  likeCount: Number(row.like_count),
  commentCount: Number(row.comment_count),
  repostCount: Number(row.repost_count),
  currentUserLiked: Boolean(row.current_user_liked),
  currentUserFollowsAuthor: Boolean(row.current_user_follows),
  originalPost:
    row.original_id &&
    row.original_author_id &&
    row.original_author_username &&
    row.original_author_display_name &&
    row.original_created_at
      ? {
          id: row.original_id,
          body: row.original_body,
          author: authorFrom(
            row.original_author_id,
            row.original_author_username,
            row.original_author_display_name,
            row.original_author_avatar_key,
            row.original_author_verified,
          ),
          createdAt: row.original_created_at,
        }
      : null,
  parentPost:
    row.parent_id &&
    row.parent_author_id &&
    row.parent_author_username &&
    row.parent_author_display_name &&
    row.parent_created_at
      ? {
          id: row.parent_id,
          body: row.parent_body,
          author: authorFrom(
            row.parent_author_id,
            row.parent_author_username,
            row.parent_author_display_name,
            row.parent_author_avatar_key,
            row.parent_author_verified,
          ),
          createdAt: row.parent_created_at,
        }
      : null,
});

const FEED_SELECT = `
  SELECT p.*,
    a.id author_id, a.username author_username, a.display_name author_display_name, a.avatar_key author_avatar_key, a.is_verified author_verified,
    (SELECT count(*) FROM likes l WHERE l.post_id = p.id) like_count,
    (SELECT count(*) FROM posts c WHERE c.reply_to_post_id = p.id AND c.deleted_at IS NULL) comment_count,
    (SELECT count(*) FROM posts r WHERE r.repost_of_post_id = p.id AND r.deleted_at IS NULL) repost_count,
    EXISTS(SELECT 1 FROM likes ml WHERE ml.post_id = p.id AND ml.user_id = ?) current_user_liked,
    EXISTS(SELECT 1 FROM follows mf WHERE mf.followed_user_id = p.user_id AND mf.follower_user_id = ?) current_user_follows,
    op.id original_id, op.body original_body, op.created_at original_created_at,
    oa.id original_author_id, oa.username original_author_username, oa.display_name original_author_display_name, oa.avatar_key original_author_avatar_key, oa.is_verified original_author_verified,
    pp.id parent_id, pp.body parent_body, pp.created_at parent_created_at,
    pa.id parent_author_id, pa.username parent_author_username, pa.display_name parent_author_display_name, pa.avatar_key parent_author_avatar_key, pa.is_verified parent_author_verified
  FROM posts p JOIN users a ON a.id = p.user_id
  LEFT JOIN posts op ON op.id = p.repost_of_post_id AND op.deleted_at IS NULL LEFT JOIN users oa ON oa.id = op.user_id
  LEFT JOIN posts pp ON pp.id = p.reply_to_post_id AND pp.deleted_at IS NULL LEFT JOIN users pa ON pa.id = pp.user_id`;

function encodeCursor(createdAt: string, id: string): string {
  return btoa(`${createdAt}|${id}`)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
function decodeCursor(value?: string): [string, string] | null {
  if (!value || !isPaginationCursor(value)) return null;
  try {
    const decoded = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
    const split = decoded.lastIndexOf("|");
    return split > 0
      ? [decoded.slice(0, split), decoded.slice(split + 1)]
      : null;
  } catch {
    return null;
  }
}
const pageLimit = (raw?: string) =>
  Math.min(Math.max(Number(raw) || 20, 1), 50);

async function requireUser(
  c: AppContext,
  mutation = true,
): Promise<string | Response> {
  const auth = await requireAuth(c, { mutation });
  if (auth instanceof Response) return auth;
  if (!auth.profileId)
    return error(
      c,
      403,
      "PROFILE_REQUIRED",
      "Complete your profile before continuing.",
    );
  return auth.profileId;
}

async function optionalUser(c: AppContext): Promise<string> {
  return (await resolveSession(c))?.profileId ?? "";
}

async function enforceRate(
  c: AppContext,
  accountOrProfileId: string,
  action: string,
  _limit: number,
): Promise<Response | null> {
  return distributedLimit(
    c,
    c.env.MUTATION_RATE_LIMITER,
    `${action}:${accountOrProfileId}`,
  );
}

async function storeApprovedImage(
  c: AppContext,
  key: string,
  bytes: ArrayBuffer,
  type: ImageMimeType,
): Promise<boolean> {
  if (!matchesImageSignature(new Uint8Array(bytes), type)) return false;
  const pendingKey = `pending/${key}`;
  await c.env.AVATARS.put(pendingKey, bytes, {
    httpMetadata: { contentType: type, cacheControl: "private, no-store" },
  });
  if (c.env.ENVIRONMENT === "production" && !c.env.MEDIA_SCANNER) {
    await c.env.AVATARS.delete(pendingKey);
    return false;
  }
  if (c.env.MEDIA_SCANNER) {
    const scan = await c.env.MEDIA_SCANNER.fetch(
      "https://media-scanner.internal/scan",
      {
        method: "POST",
        headers: { "content-type": type, "x-aura-object-key": pendingKey },
        body: bytes,
      },
    );
    if (!scan.ok) {
      await c.env.AVATARS.delete(pendingKey);
      return false;
    }
  }
  await c.env.AVATARS.put(key, bytes, {
    httpMetadata: {
      contentType: type,
      cacheControl: "public, max-age=31536000, immutable",
      contentDisposition: "inline",
    },
  });
  await c.env.AVATARS.delete(pendingKey);
  return true;
}

async function notify(
  c: AppContext,
  recipient: string,
  actor: string,
  type: string,
  postId: string | null,
) {
  if (recipient === actor) return;
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO notifications (id,recipient_user_id,actor_user_id,type,post_id) VALUES (?,?,?,?,?)`,
  )
    .bind(crypto.randomUUID(), recipient, actor, type, postId)
    .run();
}

async function notifyMentions(
  c: AppContext,
  actorId: string,
  postId: string,
  body: string,
) {
  const names = parseMentions(body);
  if (!names.length) return;
  const marks = names.map(() => "?").join(",");
  const users = await c.env.DB.prepare(
    `SELECT id FROM users WHERE username IN (${marks}) COLLATE NOCASE`,
  )
    .bind(...names)
    .all<{ id: string }>();
  await Promise.all(
    users.results.map((user) => notify(c, user.id, actorId, "mention", postId)),
  );
}

async function getPost(
  c: AppContext,
  postId: string,
  viewer = "",
): Promise<FeedPost | null> {
  const row = await c.env.DB.prepare(
    `${FEED_SELECT} WHERE p.id = ? AND p.deleted_at IS NULL`,
  )
    .bind(viewer, viewer, postId)
    .first<FeedRow>();
  return row ? toFeedPost(row) : null;
}

async function feedPage(
  c: AppContext,
  where: string,
  binds: unknown[],
  viewer: string,
): Promise<PaginatedResponse<FeedPost>> {
  const cursor = decodeCursor(c.req.query("cursor"));
  const limit = pageLimit(c.req.query("limit"));
  const cursorSql = cursor
    ? " AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))"
    : "";
  const cursorBinds = cursor ? [cursor[0], cursor[0], cursor[1]] : [];
  const result = await c.env.DB.prepare(
    `${FEED_SELECT} WHERE p.deleted_at IS NULL AND ${where}${cursorSql} ORDER BY p.created_at DESC, p.id DESC LIMIT ?`,
  )
    .bind(viewer, viewer, ...binds, ...cursorBinds, limit + 1)
    .all<FeedRow>();
  const rows = result.results;
  const more = rows.length > limit;
  const page = rows.slice(0, limit).map(toFeedPost);
  const last = page.at(-1);
  return {
    data: page,
    nextCursor: more && last ? encodeCursor(last.createdAt, last.id) : null,
  };
}

app.use("*", secureHeaders());
app.use("*", async (c, next) => {
  const started = Date.now();
  const requestId = c.req.header("CF-Ray") ?? crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("X-Request-ID", requestId);
  await next();
  console.log(
    JSON.stringify({
      requestId,
      route: c.req.path,
      method: c.req.method,
      status: c.res.status,
      latencyMs: Date.now() - started,
      accountId: c.get("auth")?.account.id ?? null,
    }),
  );
});
app.use("/v1/*", async (c, next) => {
  const allowed = c.env.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : ""),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Aura-CSRF"],
    credentials: true,
    maxAge: 86400,
  })(c, next);
});

app.get("/", (c) => c.json({ name: "AURA API", version: "v1" }));
app.get("/health", (c) =>
  c.json({ status: "ok", environment: c.env.ENVIRONMENT }),
);
app.get("/ready", async (c) => {
  const database = await c.env.DB.prepare("SELECT 1 ok")
    .first<{ ok: number }>()
    .catch(() => null);
  return c.json(
    {
      status: database?.ok === 1 ? "ready" : "unavailable",
      version: c.env.APP_VERSION ?? "development",
      providers: {
        email: Boolean(c.env.RESEND_API_KEY && c.env.AUTH_EMAIL_FROM),
        x: Boolean(c.env.X_CLIENT_ID && c.env.X_REDIRECT_URI),
        turnstile: Boolean(c.env.TURNSTILE_SECRET_KEY),
      },
    },
    database?.ok === 1 ? 200 : 503,
  );
});

registerAuthRoutes(app);

app.get("/v1/dev/users", async (c) => {
  if (c.env.ENVIRONMENT === "production" || c.env.ENABLE_DEV_AUTH !== "1")
    return error(c, 404, "NOT_FOUND", "Route not found.");
  const users = await c.env.DB.prepare(
    "SELECT * FROM users ORDER BY created_at ASC LIMIT 50",
  ).all<UserRow>();
  return c.json({ data: users.results.map(toProfile) });
});

app.get("/v1/profiles/:username", async (c) => {
  const viewer = await optionalUser(c);
  const username = c.req.param("username").toLowerCase();
  const row = await c.env.DB.prepare(
    `SELECT u.*,
    (SELECT count(*) FROM follows WHERE followed_user_id=u.id) follower_count,
    (SELECT count(*) FROM follows WHERE follower_user_id=u.id) following_count,
    (SELECT count(*) FROM posts WHERE user_id=u.id AND deleted_at IS NULL AND reply_to_post_id IS NULL) post_count,
    EXISTS(SELECT 1 FROM follows WHERE follower_user_id=? AND followed_user_id=u.id) current_user_follows
    FROM users u WHERE username=? COLLATE NOCASE`,
  )
    .bind(viewer, username)
    .first<
      UserRow & {
        follower_count: number;
        following_count: number;
        post_count: number;
        current_user_follows: number;
      }
    >();
  if (!row) return error(c, 404, "NOT_FOUND", "Profile not found.");
  return c.json({
    data: {
      profile: toProfile(row),
      followerCount: Number(row.follower_count),
      followingCount: Number(row.following_count),
      postCount: Number(row.post_count),
      currentUserFollows: Boolean(row.current_user_follows),
      isCurrentUser: viewer === row.id,
    },
  });
});

app.put("/v1/me/profile", async (c) => {
  const userId = await requireUser(c);
  if (userId instanceof Response) return userId;
  const limited = await enforceRate(c, userId, "profile", 12);
  if (limited) return limited;
  const raw = await c.req.json<UpdateProfileInput>().catch(() => null);
  if (!raw) return error(c, 400, "INVALID_BODY", "A JSON body is required.");
  const input: UpdateProfileInput = {
    username: raw.username?.trim().toLowerCase(),
    displayName: raw.displayName?.trim(),
    bio: raw.bio?.trim() || null,
    location: raw.location?.trim() || null,
    websiteUrl: raw.websiteUrl?.trim() || null,
    manuallyEnteredWalletAddress:
      raw.manuallyEnteredWalletAddress?.trim() || null,
  };
  const fields = validateProfile(input);
  if (Object.keys(fields).length)
    return error(
      c,
      422,
      "INVALID_PROFILE",
      "Review the highlighted fields.",
      fields,
    );
  const wallet = input.manuallyEnteredWalletAddress
    ? normalizeWalletAddress(input.manuallyEnteredWalletAddress)
    : null;
  try {
    await c.env.DB.prepare(
      `UPDATE users SET username=?,display_name=?,bio=?,location=?,website_url=?,manually_entered_wallet_address=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`,
    )
      .bind(
        input.username,
        input.displayName,
        input.bio,
        input.location,
        input.websiteUrl,
        wallet,
        userId,
      )
      .run();
  } catch {
    return error(c, 409, "USERNAME_TAKEN", "That username is unavailable.", {
      username: "Choose another username.",
    });
  }
  const row = await c.env.DB.prepare("SELECT * FROM users WHERE id=?")
    .bind(userId)
    .first<UserRow>();
  return c.json({ data: toProfile(row!) });
});

async function uploadProfileAsset(c: AppContext, kind: "avatar" | "banner") {
  const userId = await requireUser(c);
  if (userId instanceof Response) return userId;
  const limited = await enforceRate(c, userId, "upload", 10);
  if (limited) return limited;
  const type = c.req.header("content-type")?.split(";")[0] ?? "";
  if (!isImageMimeType(type))
    return error(c, 415, "INVALID_IMAGE", "Use a JPEG, PNG, or WebP image.");
  const bytes = await c.req.arrayBuffer();
  const max = kind === "avatar" ? LIMITS.avatarMaxBytes : LIMITS.imageMaxBytes;
  if (!bytes.byteLength || bytes.byteLength > max)
    return error(
      c,
      413,
      "IMAGE_TOO_LARGE",
      `${kind === "avatar" ? "Avatar" : "Banner"} images must be ${max / 1_000_000} MB or smaller.`,
    );
  const ext = type === "image/jpeg" ? "jpg" : type.split("/")[1];
  const key = `${kind}s/${userId}/${crypto.randomUUID()}.${ext}`;
  const column = kind === "avatar" ? "avatar_key" : "banner_key";
  const old = await c.env.DB.prepare(
    `SELECT ${column} old_key FROM users WHERE id=?`,
  )
    .bind(userId)
    .first<{ old_key: string | null }>();
  if (!(await storeApprovedImage(c, key, bytes, type)))
    return error(
      c,
      415,
      "IMAGE_REJECTED",
      c.env.ENVIRONMENT === "production"
        ? "Media scanning is unavailable. Try again later."
        : "The file contents do not match the selected image type.",
    );
  try {
    await c.env.DB.prepare(
      `UPDATE users SET ${column}=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`,
    )
      .bind(key, userId)
      .run();
  } catch (e) {
    await c.env.AVATARS.delete(key);
    throw e;
  }
  if (old?.old_key) await c.env.AVATARS.delete(old.old_key);
  return c.json({ data: { url: mediaUrl(key) } });
}
async function deleteProfileAsset(c: AppContext, kind: "avatar" | "banner") {
  const userId = await requireUser(c);
  if (userId instanceof Response) return userId;
  const column = kind === "avatar" ? "avatar_key" : "banner_key";
  const old = await c.env.DB.prepare(
    `SELECT ${column} old_key FROM users WHERE id=?`,
  )
    .bind(userId)
    .first<{ old_key: string | null }>();
  await c.env.DB.prepare(
    `UPDATE users SET ${column}=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`,
  )
    .bind(userId)
    .run();
  if (old?.old_key) await c.env.AVATARS.delete(old.old_key);
  return c.json({ data: { removed: true } });
}
app.post("/v1/me/avatar", (c) => uploadProfileAsset(c, "avatar"));
app.post("/v1/me/banner", (c) => uploadProfileAsset(c, "banner"));
app.delete("/v1/me/avatar", (c) => deleteProfileAsset(c, "avatar"));
app.delete("/v1/me/banner", (c) => deleteProfileAsset(c, "banner"));

app.get("/v1/users/search", async (c) => {
  const q = c.req.query("q")?.trim().slice(0, 50) ?? "";
  if (!q) return c.json({ data: [] });
  const limited = await distributedLimit(
    c,
    c.env.SEARCH_RATE_LIMITER,
    await privateRateLimitKey(
      "search",
      await networkHash(c),
      c.env.SESSION_TOKEN_PEPPER,
    ),
  );
  if (limited) return limited;
  const rows = await c.env.DB.prepare(
    "SELECT * FROM users WHERE username LIKE ? ESCAPE '\\' COLLATE NOCASE OR display_name LIKE ? ESCAPE '\\' COLLATE NOCASE ORDER BY username LIMIT 20",
  )
    .bind(
      `${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`,
      `%${q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`,
    )
    .all<UserRow>();
  return c.json({ data: rows.results.map(toProfile) });
});

async function followList(c: AppContext, direction: "followers" | "following") {
  const username = c.req.param("username");
  const cursor = decodeCursor(c.req.query("cursor"));
  const limit = pageLimit(c.req.query("limit"));
  const user = await c.env.DB.prepare(
    "SELECT id FROM users WHERE username=? COLLATE NOCASE",
  )
    .bind(username)
    .first<{ id: string }>();
  if (!user) return error(c, 404, "NOT_FOUND", "Profile not found.");
  const join =
    direction === "followers"
      ? "f.follower_user_id=u.id"
      : "f.followed_user_id=u.id";
  const filter =
    direction === "followers" ? "f.followed_user_id=?" : "f.follower_user_id=?";
  const extra = cursor
    ? " AND (f.created_at < ? OR (f.created_at=? AND u.id<?))"
    : "";
  const cb = cursor ? [cursor[0], cursor[0], cursor[1]] : [];
  const rows = await c.env.DB.prepare(
    `SELECT u.*,f.created_at relation_created_at FROM follows f JOIN users u ON ${join} WHERE ${filter}${extra} ORDER BY f.created_at DESC,u.id DESC LIMIT ?`,
  )
    .bind(user.id, ...cb, limit + 1)
    .all<UserRow & { relation_created_at: string }>();
  const more = rows.results.length > limit;
  const page = rows.results.slice(0, limit);
  const last = page.at(-1);
  return c.json({
    data: page.map(toProfile),
    nextCursor:
      more && last ? encodeCursor(last.relation_created_at, last.id) : null,
  });
}
app.get("/v1/profiles/:username/followers", (c) => followList(c, "followers"));
app.get("/v1/profiles/:username/following", (c) => followList(c, "following"));

app.post("/v1/profiles/:username/follow", async (c) => {
  const actor = await requireUser(c);
  if (actor instanceof Response) return actor;
  const limited = await enforceRate(c, actor, "follow", 40);
  if (limited) return limited;
  const target = await c.env.DB.prepare(
    "SELECT id FROM users WHERE username=? COLLATE NOCASE",
  )
    .bind(c.req.param("username"))
    .first<{ id: string }>();
  if (!target) return error(c, 404, "NOT_FOUND", "Profile not found.");
  if (!canFollow(actor, target.id))
    return error(c, 422, "SELF_FOLLOW", "You cannot follow yourself.");
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO follows (follower_user_id,followed_user_id) VALUES (?,?)",
  )
    .bind(actor, target.id)
    .run();
  await notify(c, target.id, actor, "follow", null);
  return c.json({ data: { following: true } });
});
app.delete("/v1/profiles/:username/follow", async (c) => {
  const actor = await requireUser(c);
  if (actor instanceof Response) return actor;
  const target = await c.env.DB.prepare(
    "SELECT id FROM users WHERE username=? COLLATE NOCASE",
  )
    .bind(c.req.param("username"))
    .first<{ id: string }>();
  if (!target) return error(c, 404, "NOT_FOUND", "Profile not found.");
  await c.env.DB.prepare(
    "DELETE FROM follows WHERE follower_user_id=? AND followed_user_id=?",
  )
    .bind(actor, target.id)
    .run();
  return c.json({ data: { following: false } });
});

app.post("/v1/posts", async (c) => {
  const userId = await requireUser(c);
  if (userId instanceof Response) return userId;
  let input: CreatePostInput = {};
  let media: ArrayBuffer | null = null;
  let mediaType: ImageMimeType | null = null;
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.startsWith("multipart/form-data")) {
    const form = await c.req.formData();
    input = {
      body: String(form.get("body") ?? ""),
      replyToPostId: String(form.get("replyToPostId") ?? "") || null,
      repostOfPostId: String(form.get("repostOfPostId") ?? "") || null,
    };
    const file = form.get("image");
    if (file instanceof File && file.size) {
      if (!isImageMimeType(file.type))
        return error(
          c,
          415,
          "INVALID_IMAGE",
          "Use a JPEG, PNG, or WebP image.",
        );
      if (file.size > LIMITS.imageMaxBytes)
        return error(
          c,
          413,
          "IMAGE_TOO_LARGE",
          "Post images must be 8 MB or smaller.",
        );
      media = await file.arrayBuffer();
      mediaType = file.type;
      if (!matchesImageSignature(new Uint8Array(media), mediaType))
        return error(
          c,
          415,
          "INVALID_IMAGE_SIGNATURE",
          "The file contents do not match the selected image type.",
        );
    }
  } else {
    input = await c.req.json<CreatePostInput>().catch(() => ({}));
  }
  const limited = await enforceRate(
    c,
    userId,
    input.replyToPostId ? "comment" : "post",
    input.replyToPostId ? 30 : 12,
  );
  if (limited) return limited;
  input.body = input.body?.trim() || null;
  const fields = validatePost(input, Boolean(media));
  if (Object.keys(fields).length)
    return error(c, 422, "INVALID_POST", "Review the post.", fields);
  if (input.repostOfPostId) {
    const original = await c.env.DB.prepare(
      "SELECT id FROM posts WHERE id=? AND deleted_at IS NULL",
    )
      .bind(input.repostOfPostId)
      .first();
    if (!original)
      return error(
        c,
        404,
        "ORIGINAL_NOT_FOUND",
        "The reposted post is unavailable.",
      );
  }
  if (input.replyToPostId) {
    const parent = await c.env.DB.prepare(
      "SELECT id FROM posts WHERE id=? AND deleted_at IS NULL",
    )
      .bind(input.replyToPostId)
      .first();
    if (!parent)
      return error(
        c,
        404,
        "PARENT_NOT_FOUND",
        "The parent post is unavailable.",
      );
  }
  const id = crypto.randomUUID();
  let key: string | null = null;
  if (media && mediaType) {
    const ext = mediaType === "image/jpeg" ? "jpg" : mediaType.split("/")[1];
    key = `posts/${userId}/${id}.${ext}`;
    if (!(await storeApprovedImage(c, key, media, mediaType)))
      return error(
        c,
        415,
        "IMAGE_REJECTED",
        c.env.ENVIRONMENT === "production"
          ? "Media scanning is unavailable. Try again later."
          : "The image was rejected.",
      );
  }
  try {
    await c.env.DB.prepare(
      "INSERT INTO posts (id,user_id,body,media_key,media_type,repost_of_post_id,reply_to_post_id) VALUES (?,?,?,?,?,?,?)",
    )
      .bind(
        id,
        userId,
        input.body,
        key,
        mediaType,
        input.repostOfPostId ?? null,
        input.replyToPostId ?? null,
      )
      .run();
  } catch (e) {
    if (key) await c.env.AVATARS.delete(key);
    return error(c, 409, "POST_CONFLICT", "This repost already exists.");
  }
  if (input.replyToPostId) {
    const owner = await c.env.DB.prepare("SELECT user_id FROM posts WHERE id=?")
      .bind(input.replyToPostId)
      .first<{ user_id: string }>();
    if (owner) await notify(c, owner.user_id, userId, "comment", id);
  }
  if (input.repostOfPostId) {
    const owner = await c.env.DB.prepare("SELECT user_id FROM posts WHERE id=?")
      .bind(input.repostOfPostId)
      .first<{ user_id: string }>();
    if (owner) await notify(c, owner.user_id, userId, "repost", id);
  }
  if (input.body) await notifyMentions(c, userId, id, input.body);
  return c.json({ data: await getPost(c, id, userId) }, 201);
});

app.get("/v1/posts/:id", async (c) => {
  const post = await getPost(c, c.req.param("id"), await optionalUser(c));
  return post
    ? c.json({ data: post })
    : error(c, 404, "NOT_FOUND", "Post not found.");
});
app.delete("/v1/posts/:id", async (c) => {
  const userId = await requireUser(c);
  if (userId instanceof Response) return userId;
  const post = await c.env.DB.prepare(
    "SELECT user_id,media_key FROM posts WHERE id=? AND deleted_at IS NULL",
  )
    .bind(c.req.param("id"))
    .first<{ user_id: string; media_key: string | null }>();
  if (!post) return error(c, 404, "NOT_FOUND", "Post not found.");
  if (post.user_id !== userId)
    return error(c, 403, "FORBIDDEN", "You can only delete your own posts.");
  await c.env.DB.prepare(
    "UPDATE posts SET body=NULL,media_key=NULL,media_type=NULL,deleted_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
  )
    .bind(c.req.param("id"))
    .run();
  if (post.media_key) await c.env.AVATARS.delete(post.media_key);
  return c.json({ data: { deleted: true } });
});
app.get("/v1/profiles/:username/posts", async (c) => {
  const user = await c.env.DB.prepare(
    "SELECT id FROM users WHERE username=? COLLATE NOCASE",
  )
    .bind(c.req.param("username"))
    .first<{ id: string }>();
  if (!user) return error(c, 404, "NOT_FOUND", "Profile not found.");
  const tab = c.req.query("tab");
  const clause =
    tab === "replies"
      ? "p.user_id=? AND p.reply_to_post_id IS NOT NULL"
      : tab === "media"
        ? "p.user_id=? AND p.media_key IS NOT NULL"
        : "p.user_id=? AND p.reply_to_post_id IS NULL";
  return c.json(await feedPage(c, clause, [user.id], await optionalUser(c)));
});
app.get("/v1/feed", async (c) => {
  const viewer = await requireUser(c, false);
  if (viewer instanceof Response) return viewer;
  return c.json(
    await feedPage(
      c,
      "(p.user_id=? OR p.user_id IN (SELECT followed_user_id FROM follows WHERE follower_user_id=?))",
      [viewer, viewer],
      viewer,
    ),
  );
});
app.get("/v1/explore", async (c) =>
  c.json(await feedPage(c, "1=1", [], await optionalUser(c))),
);

app.post("/v1/posts/:id/like", async (c) => {
  const userId = await requireUser(c);
  if (userId instanceof Response) return userId;
  const limited = await enforceRate(c, userId, "like", 120);
  if (limited) return limited;
  const post = await c.env.DB.prepare(
    "SELECT user_id FROM posts WHERE id=? AND deleted_at IS NULL",
  )
    .bind(c.req.param("id"))
    .first<{ user_id: string }>();
  if (!post) return error(c, 404, "NOT_FOUND", "Post not found.");
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO likes (user_id,post_id) VALUES (?,?)",
  )
    .bind(userId, c.req.param("id"))
    .run();
  await notify(c, post.user_id, userId, "like", c.req.param("id"));
  return c.json({ data: { liked: true } });
});
app.delete("/v1/posts/:id/like", async (c) => {
  const userId = await requireUser(c);
  if (userId instanceof Response) return userId;
  await c.env.DB.prepare("DELETE FROM likes WHERE user_id=? AND post_id=?")
    .bind(userId, c.req.param("id"))
    .run();
  return c.json({ data: { liked: false } });
});
app.post("/v1/posts/:id/comments", async (c) => {
  const body = await c.req.json<{ body: string }>().catch(() => ({ body: "" }));
  const original = c.req.raw;
  const headers = new Headers(original.headers);
  headers.set("content-type", "application/json");
  const request = new Request(new URL("/v1/posts", original.url), {
    method: "POST",
    headers,
    body: JSON.stringify({ body: body.body, replyToPostId: c.req.param("id") }),
  });
  return app.fetch(request, c.env, c.executionCtx);
});
app.get("/v1/posts/:id/comments", async (c) =>
  c.json(
    await feedPage(
      c,
      "p.reply_to_post_id=?",
      [c.req.param("id")],
      await optionalUser(c),
    ),
  ),
);
app.post("/v1/posts/:id/repost", async (c) => {
  const body = await c.req
    .json<{ body?: string }>()
    .catch(() => ({ body: undefined }));
  const original = c.req.raw;
  const headers = new Headers(original.headers);
  headers.set("content-type", "application/json");
  const request = new Request(new URL("/v1/posts", original.url), {
    method: "POST",
    headers,
    body: JSON.stringify({
      body: body.body ?? null,
      repostOfPostId: c.req.param("id"),
    }),
  });
  return app.fetch(request, c.env, c.executionCtx);
});
app.delete("/v1/posts/:id/repost", async (c) => {
  const userId = await requireUser(c);
  if (userId instanceof Response) return userId;
  await c.env.DB.prepare(
    "UPDATE posts SET deleted_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id=? AND repost_of_post_id=? AND coalesce(trim(body),'')='' AND deleted_at IS NULL",
  )
    .bind(userId, c.req.param("id"))
    .run();
  return c.json({ data: { reposted: false } });
});

app.get("/v1/notifications", async (c) => {
  const userId = await requireUser(c, false);
  if (userId instanceof Response) return userId;
  const cursor = decodeCursor(c.req.query("cursor"));
  const limit = pageLimit(c.req.query("limit"));
  const extra = cursor
    ? "AND (n.created_at<? OR (n.created_at=? AND n.id<?))"
    : "";
  const cb = cursor ? [cursor[0], cursor[0], cursor[1]] : [];
  type NRow = {
    id: string;
    type: Notification["type"];
    read_at: string | null;
    created_at: string;
    actor_id: string;
    actor_username: string;
    actor_display_name: string;
    actor_avatar_key: string | null;
    actor_verified: number;
    post_id: string | null;
    post_body: string | null;
    post_created_at: string | null;
    post_author_id: string | null;
    post_author_username: string | null;
    post_author_display_name: string | null;
    post_author_avatar_key: string | null;
    post_author_verified: number | null;
  };
  const rows = await c.env.DB.prepare(
    `SELECT n.*,a.id actor_id,a.username actor_username,a.display_name actor_display_name,a.avatar_key actor_avatar_key,a.is_verified actor_verified,p.id post_id,p.body post_body,p.created_at post_created_at,pa.id post_author_id,pa.username post_author_username,pa.display_name post_author_display_name,pa.avatar_key post_author_avatar_key,pa.is_verified post_author_verified FROM notifications n JOIN users a ON a.id=n.actor_user_id LEFT JOIN posts p ON p.id=n.post_id LEFT JOIN users pa ON pa.id=p.user_id WHERE n.recipient_user_id=? ${extra} ORDER BY n.created_at DESC,n.id DESC LIMIT ?`,
  )
    .bind(userId, ...cb, limit + 1)
    .all<NRow>();
  const more = rows.results.length > limit;
  const page = rows.results.slice(0, limit);
  const data: Notification[] = page.map((n) => ({
    id: n.id,
    type: n.type,
    actor: authorFrom(
      n.actor_id,
      n.actor_username,
      n.actor_display_name,
      n.actor_avatar_key,
      n.actor_verified,
    ),
    post:
      n.post_id &&
      n.post_author_id &&
      n.post_author_username &&
      n.post_author_display_name &&
      n.post_created_at
        ? {
            id: n.post_id,
            body: n.post_body,
            createdAt: n.post_created_at,
            author: authorFrom(
              n.post_author_id,
              n.post_author_username,
              n.post_author_display_name,
              n.post_author_avatar_key,
              n.post_author_verified,
            ),
          }
        : null,
    readAt: n.read_at,
    createdAt: n.created_at,
    groupCount: 1,
  }));
  const last = page.at(-1);
  const unread = await c.env.DB.prepare(
    "SELECT count(*) count FROM notifications WHERE recipient_user_id=? AND read_at IS NULL",
  )
    .bind(userId)
    .first<{ count: number }>();
  return c.json({
    data,
    nextCursor: more && last ? encodeCursor(last.created_at, last.id) : null,
    unreadCount: Number(unread?.count ?? 0),
  });
});
app.post("/v1/notifications/read-all", async (c) => {
  const userId = await requireUser(c);
  if (userId instanceof Response) return userId;
  await c.env.DB.prepare(
    "UPDATE notifications SET read_at=coalesce(read_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE recipient_user_id=?",
  )
    .bind(userId)
    .run();
  return c.json({ data: { read: true } });
});
app.post("/v1/notifications/:id/read", async (c) => {
  const userId = await requireUser(c);
  if (userId instanceof Response) return userId;
  await c.env.DB.prepare(
    "UPDATE notifications SET read_at=coalesce(read_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id=? AND recipient_user_id=?",
  )
    .bind(c.req.param("id"), userId)
    .run();
  return c.json({ data: { read: true } });
});

app.get("/v1/media/*", async (c) => {
  const key = c.req.path.replace("/v1/media/", "");
  if (!key || key.includes(".."))
    return error(c, 404, "NOT_FOUND", "Media not found.");
  const object = await c.env.AVATARS.get(key);
  if (!object) return error(c, 404, "NOT_FOUND", "Media not found.");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set(
    "cache-control",
    headers.get("cache-control") ?? "public, max-age=3600",
  );
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
});

app.notFound((c) => error(c, 404, "NOT_FOUND", "Route not found."));
app.onError((cause, c) => {
  console.error(
    JSON.stringify({
      requestId: c.get("requestId") ?? "unknown",
      route: c.req.path,
      event: "unhandled_error",
      message: cause instanceof Error ? cause.message : "unknown",
    }),
  );
  return error(c, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
});

async function scheduled(
  _controller: ScheduledController,
  env: Bindings,
  ctx: ExecutionContext,
) {
  ctx.waitUntil(
    (async () => {
      const due = await env.DB.prepare(
        "SELECT a.id,u.id user_id FROM accounts a LEFT JOIN users u ON u.account_id=a.id WHERE a.status='pending_deletion' AND a.deletion_scheduled_for<=strftime('%Y-%m-%dT%H:%M:%fZ','now') LIMIT 100",
      ).all<{ id: string; user_id: string | null }>();
      for (const account of due.results) {
        if (account.user_id) {
          const media = await env.DB.prepare(
            "SELECT media_key FROM posts WHERE user_id=? AND media_key IS NOT NULL UNION ALL SELECT avatar_key FROM users WHERE id=? AND avatar_key IS NOT NULL UNION ALL SELECT banner_key FROM users WHERE id=? AND banner_key IS NOT NULL",
          )
            .bind(account.user_id, account.user_id, account.user_id)
            .all<{ media_key: string }>();
          await Promise.all(
            media.results.map((row) => env.AVATARS.delete(row.media_key)),
          );
          await env.DB.batch([
            env.DB.prepare(
              "UPDATE posts SET body=NULL,media_key=NULL,media_type=NULL,deleted_at=coalesce(deleted_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE user_id=?",
            ).bind(account.user_id),
            env.DB.prepare(
              "UPDATE users SET account_id=NULL,username='deleted_'||substr(id,1,8),display_name='Deleted account',bio=NULL,avatar_key=NULL,banner_key=NULL,location=NULL,website_url=NULL,manually_entered_wallet_address=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
            ).bind(account.user_id),
            env.DB.prepare("DELETE FROM accounts WHERE id=?").bind(account.id),
          ]);
        } else
          await env.DB.prepare("DELETE FROM accounts WHERE id=?")
            .bind(account.id)
            .run();
      }
    })(),
  );
}

export { app };
export default { fetch: app.fetch, scheduled };
