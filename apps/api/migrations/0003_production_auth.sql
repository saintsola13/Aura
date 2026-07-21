PRAGMA foreign_keys = ON;

CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  primary_email TEXT UNIQUE COLLATE NOCASE,
  email_verified_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','disabled','pending_deletion')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','moderator','admin')),
  deletion_requested_at TEXT,
  deletion_scheduled_for TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at TEXT
);

ALTER TABLE users ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX idx_users_account_id ON users(account_id) WHERE account_id IS NOT NULL;

INSERT INTO accounts (id, status, role, created_at, updated_at)
SELECT 'acct_' || id, 'active', 'user', created_at, updated_at FROM users;
UPDATE users SET account_id = 'acct_' || id WHERE account_id IS NULL;

CREATE TABLE auth_identities (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('email','x')),
  provider_subject TEXT NOT NULL,
  provider_username TEXT,
  provider_display_name TEXT,
  provider_avatar_url TEXT,
  provider_email TEXT,
  provider_email_verified INTEGER NOT NULL DEFAULT 0 CHECK (provider_email_verified IN (0,1)),
  provider_profile_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE (provider, provider_subject)
);
CREATE UNIQUE INDEX idx_auth_email_normalized ON auth_identities(provider_subject COLLATE NOCASE) WHERE provider='email';
CREATE INDEX idx_auth_identities_account ON auth_identities(account_id);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  idle_expires_at TEXT NOT NULL,
  absolute_expires_at TEXT NOT NULL,
  revoked_at TEXT,
  ip_hash TEXT,
  user_agent_summary TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_account ON sessions(account_id, created_at DESC);
CREATE INDEX idx_sessions_expiration ON sessions(idle_expires_at, absolute_expires_at);
CREATE INDEX idx_sessions_revoked ON sessions(revoked_at) WHERE revoked_at IS NULL;

CREATE TABLE email_login_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT,
  purpose TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login','email_change')),
  email_normalized TEXT NOT NULL COLLATE NOCASE,
  token_hash TEXT NOT NULL UNIQUE,
  requested_ip_hash TEXT,
  requested_user_agent TEXT,
  redirect_path TEXT NOT NULL DEFAULT '/home',
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE INDEX idx_email_tokens_hash ON email_login_tokens(token_hash);
CREATE INDEX idx_email_tokens_expiration ON email_login_tokens(expires_at, consumed_at);

CREATE TABLE oauth_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL CHECK (provider='x'),
  state_hash TEXT NOT NULL UNIQUE,
  code_verifier_protected TEXT NOT NULL,
  linking_account_id TEXT,
  redirect_path TEXT NOT NULL DEFAULT '/home',
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (linking_account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE INDEX idx_oauth_state_hash ON oauth_transactions(state_hash);
CREATE INDEX idx_oauth_expiration ON oauth_transactions(expires_at, consumed_at);

CREATE TABLE security_events (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT,
  event_type TEXT NOT NULL,
  provider TEXT,
  ip_hash TEXT,
  user_agent_summary TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);
CREATE INDEX idx_security_events_account ON security_events(account_id, created_at DESC);
CREATE INDEX idx_security_events_type ON security_events(event_type, created_at DESC);
