PRAGMA foreign_keys = OFF;

CREATE TABLE users_v2 (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE
    CHECK (length(username) BETWEEN 3 AND 24)
    CHECK (username GLOB '[a-z0-9_]*' AND username NOT GLOB '*[^a-z0-9_]*'),
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 1 AND 50),
  bio TEXT CHECK (bio IS NULL OR length(bio) <= 280),
  avatar_key TEXT,
  banner_key TEXT,
  location TEXT CHECK (location IS NULL OR length(location) <= 80),
  website_url TEXT CHECK (website_url IS NULL OR length(website_url) <= 2048),
  manually_entered_wallet_address TEXT COLLATE NOCASE,
  is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO users_v2 (
  id, username, display_name, bio, avatar_key,
  manually_entered_wallet_address, created_at, updated_at
)
SELECT
  id,
  'user_' || lower(substr(replace(id, '-', ''), 1, 12)),
  coalesce(nullif(trim(display_name), ''), 'AURA member'),
  bio,
  avatar_key,
  wallet_address,
  created_at,
  updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users_v2 RENAME TO users;

CREATE INDEX idx_users_username ON users(username COLLATE NOCASE);
CREATE INDEX idx_users_display_name ON users(display_name COLLATE NOCASE);

CREATE TABLE posts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT CHECK (body IS NULL OR length(body) <= 500),
  media_key TEXT,
  media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image/jpeg', 'image/png', 'image/webp')),
  repost_of_post_id TEXT,
  reply_to_post_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (repost_of_post_id) REFERENCES posts(id) ON DELETE SET NULL,
  FOREIGN KEY (reply_to_post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CHECK (body IS NOT NULL OR media_key IS NOT NULL OR repost_of_post_id IS NOT NULL)
);

CREATE TABLE follows (
  follower_user_id TEXT NOT NULL,
  followed_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (follower_user_id, followed_user_id),
  FOREIGN KEY (follower_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (followed_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (follower_user_id <> followed_user_id)
);

CREATE TABLE likes (
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY NOT NULL,
  recipient_user_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('follow', 'like', 'comment', 'repost', 'mention')),
  post_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CHECK (recipient_user_id <> actor_user_id)
);

CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_user_id ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_reply_to ON posts(reply_to_post_id, created_at ASC);
CREATE INDEX idx_posts_repost_of ON posts(repost_of_post_id, created_at DESC);
CREATE UNIQUE INDEX idx_posts_plain_repost_unique
  ON posts(user_id, repost_of_post_id)
  WHERE repost_of_post_id IS NOT NULL AND coalesce(trim(body), '') = '';
CREATE INDEX idx_follows_follower ON follows(follower_user_id, created_at DESC);
CREATE INDEX idx_follows_followed ON follows(followed_user_id, created_at DESC);
CREATE INDEX idx_likes_post ON likes(post_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_created
  ON notifications(recipient_user_id, created_at DESC);
CREATE UNIQUE INDEX idx_notifications_event_unique
  ON notifications(recipient_user_id, actor_user_id, type, coalesce(post_id, ''));

PRAGMA foreign_keys = ON;
