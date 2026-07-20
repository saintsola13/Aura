PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  wallet_address TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT CHECK (display_name IS NULL OR length(display_name) BETWEEN 1 AND 50),
  bio TEXT CHECK (bio IS NULL OR length(bio) <= 280),
  avatar_key TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
