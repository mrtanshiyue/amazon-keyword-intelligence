const DATASET_KINDS = new Set(['amazon_ads', 'unified_transaction']);
const STORE_ID_PATTERN = /^store-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATASET_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;

export class DatasetPersistenceError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = 'DatasetPersistenceError';
    this.code = code;
    this.status = status;
  }
}

function requiredText(value, code, maxLength = 255) {
  const text = String(value || '').trim();
  if (!text || text.length > maxLength || text.includes('\0')) {
    throw new DatasetPersistenceError(code);
  }
  return text;
}

export function validateDatasetDescriptor(input = {}) {
  const storeId = requiredText(input.storeId, 'invalid_store_id', 64).toLowerCase();
  if (!STORE_ID_PATTERN.test(storeId)) {
    throw new DatasetPersistenceError('invalid_store_id');
  }

  const kind = requiredText(input.kind, 'invalid_dataset_kind', 64).toLowerCase();
  if (!DATASET_KINDS.has(kind)) {
    throw new DatasetPersistenceError('invalid_dataset_kind');
  }

  const sourceFile = requiredText(input.sourceFile, 'invalid_source_file');
  const rowCount = Number(input.rowCount);
  const byteSize = Number(input.byteSize);
  if (!Number.isSafeInteger(rowCount) || rowCount < 0) {
    throw new DatasetPersistenceError('invalid_row_count');
  }
  if (!Number.isSafeInteger(byteSize) || byteSize <= 0) {
    throw new DatasetPersistenceError('invalid_byte_size');
  }

  const contentSha256 = requiredText(input.contentSha256, 'invalid_content_sha256', 64).toLowerCase();
  if (!SHA256_PATTERN.test(contentSha256)) {
    throw new DatasetPersistenceError('invalid_content_sha256');
  }

  return { storeId, kind, sourceFile, rowCount, byteSize, contentSha256 };
}

export function buildDatasetObjectKey(storeId, kind, datasetId) {
  const descriptor = validateDatasetDescriptor({
    storeId,
    kind,
    sourceFile: 'dataset.csv',
    rowCount: 0,
    byteSize: 1,
    contentSha256: '0'.repeat(64),
  });
  if (!DATASET_ID_PATTERN.test(String(datasetId || ''))) {
    throw new DatasetPersistenceError('invalid_dataset_id');
  }
  return `imports/${descriptor.storeId}/${descriptor.kind}/${datasetId}.csv`;
}

function requireBindings(env) {
  if (!env?.DATA?.put || !env?.DB?.prepare || !env?.DB?.batch) {
    throw new DatasetPersistenceError('persistence_not_configured', 503);
  }
}

export async function persistAcceptedDataset(env, input = {}) {
  requireBindings(env);
  const descriptor = validateDatasetDescriptor(input);
  if (input.body == null) {
    throw new DatasetPersistenceError('dataset_body_required');
  }

  const datasetId = input.datasetId || crypto.randomUUID();
  const r2Key = buildDatasetObjectKey(descriptor.storeId, descriptor.kind, datasetId);
  const stored = await env.DATA.put(r2Key, input.body, {
    onlyIf: { etagDoesNotMatch: '*' },
    sha256: descriptor.contentSha256,
    httpMetadata: { contentType: 'text/csv; charset=utf-8' },
    customMetadata: {
      datasetId,
      storeId: descriptor.storeId,
      kind: descriptor.kind,
      sourceFile: descriptor.sourceFile,
      rowCount: String(descriptor.rowCount),
      contentSha256: descriptor.contentSha256,
    },
  });

  if (!stored) {
    throw new DatasetPersistenceError('dataset_object_already_exists', 409);
  }

  try {
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO dataset_versions(
          dataset_id, store_id, kind, source_file, row_count, byte_size,
          content_sha256, r2_key, imported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        datasetId,
        descriptor.storeId,
        descriptor.kind,
        descriptor.sourceFile,
        descriptor.rowCount,
        descriptor.byteSize,
        descriptor.contentSha256,
        r2Key
      ),
      env.DB.prepare(`
        INSERT INTO dataset_current(store_id, kind, dataset_id, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(store_id, kind) DO UPDATE SET
          dataset_id = excluded.dataset_id,
          updated_at = CURRENT_TIMESTAMP
      `).bind(descriptor.storeId, descriptor.kind, datasetId),
    ]);
  } catch (error) {
    console.error('dataset metadata promotion failed', error);
    throw new DatasetPersistenceError('dataset_metadata_write_failed', 503);
  }

  return { datasetId, r2Key, ...descriptor };
}

export async function readCurrentDataset(env, storeId, kind) {
  requireBindings(env);
  const descriptor = validateDatasetDescriptor({
    storeId,
    kind,
    sourceFile: 'dataset.csv',
    rowCount: 0,
    byteSize: 1,
    contentSha256: '0'.repeat(64),
  });

  return env.DB.prepare(`
    SELECT v.dataset_id, v.store_id, v.kind, v.source_file, v.row_count,
           v.byte_size, v.content_sha256, v.r2_key, v.imported_at,
           c.updated_at AS current_since
    FROM dataset_current c
    JOIN dataset_versions v ON v.dataset_id = c.dataset_id
    WHERE c.store_id = ? AND c.kind = ?
  `).bind(descriptor.storeId, descriptor.kind).first();
}
