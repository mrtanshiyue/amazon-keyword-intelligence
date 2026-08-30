PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS access_users (
  access_sub TEXT PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_access_users_email
  ON access_users(email)
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS store_memberships (
  access_sub TEXT NOT NULL,
  store_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'operator', 'finance', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (access_sub, store_id),
  FOREIGN KEY (access_sub) REFERENCES access_users(access_sub) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_store_memberships_store
  ON store_memberships(store_id, status);
