CREATE TABLE IF NOT EXISTS dataset_versions (
  dataset_id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('amazon_ads', 'unified_transaction')),
  source_file TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  content_sha256 TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dataset_versions_store_kind_imported
  ON dataset_versions(store_id, kind, imported_at DESC);

CREATE TABLE IF NOT EXISTS dataset_current (
  store_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('amazon_ads', 'unified_transaction')),
  dataset_id TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id, kind),
  FOREIGN KEY (dataset_id) REFERENCES dataset_versions(dataset_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_dataset_current_dataset
  ON dataset_current(dataset_id);

INSERT OR REPLACE INTO deployment_meta(key, value, updated_at)
VALUES ('schema_version', '3', CURRENT_TIMESTAMP);
