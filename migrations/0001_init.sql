CREATE TABLE IF NOT EXISTS deployment_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_sources (
  source_key TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  source_file TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  byte_size INTEGER NOT NULL DEFAULT 0,
  source_commit TEXT NOT NULL,
  r2_key TEXT,
  status TEXT NOT NULL DEFAULT 'registered',
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO deployment_meta(key, value, updated_at) VALUES
  ('schema_version', '1', CURRENT_TIMESTAMP),
  ('architecture', 'workers-static-assets+d1+r2', CURRENT_TIMESTAMP),
  ('source_commit', '382345103b6cad266904530ab3a454990f42adac', CURRENT_TIMESTAMP),
  ('amazon_api_mode', 'disabled', CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO data_sources(
  source_key, store_id, kind, source_file, row_count, byte_size,
  source_commit, r2_key, status, imported_at
) VALUES
  ('ads-202606', 'store-a', 'amazon_ads', '202606.csv', 8753, 3202495,
   '382345103b6cad266904530ab3a454990f42adac', 'seed/seed-data.js', 'registered', CURRENT_TIMESTAMP),
  ('unified-202606', 'store-a', 'unified_transaction', 'UnifiedTransaction-202606.csv', 3643, 1566578,
   '382345103b6cad266904530ab3a454990f42adac', 'seed/unified-seed-data.js', 'registered', CURRENT_TIMESTAMP);
