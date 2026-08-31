import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DatasetPersistenceError,
  buildDatasetObjectKey,
  persistAcceptedDataset,
  readCurrentDatasetObject,
  validateDatasetDescriptor,
} from '../src/dataset-persistence.js';

const SHA256 = 'a'.repeat(64);
const DATASET_ID = '123e4567-e89b-42d3-a456-426614174000';

function shaBytes(hex = SHA256) {
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes.buffer;
}

function bodySize(body) {
  if (typeof body === 'string') return new TextEncoder().encode(body).byteLength;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  return Number.NaN;
}

function fakeEnv() {
  const objects = new Map();
  const batches = [];
  return {
    objects,
    batches,
    DATA: {
      async put(key, body, options) {
        if (objects.has(key) && options?.onlyIf?.get?.('if-none-match') === '*') return null;
        const object = {
          key,
          body,
          options,
          size: bodySize(body),
          checksums: { sha256: options.sha256 },
        };
        objects.set(key, object);
        return object;
      },
    },
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return { sql, args };
          },
        };
      },
      async batch(statements) {
        batches.push(statements);
        return statements.map(() => ({ success: true }));
      },
    },
  };
}

function restoreEnv(metadata, object) {
  const gets = [];
  return {
    gets,
    DATA: {
      async get(key) {
        gets.push(key);
        return object;
      },
    },
    DB: {
      prepare() {
        return {
          bind() {
            return {
              async first() {
                return metadata;
              },
            };
          },
        };
      },
    },
  };
}

function currentMetadata() {
  return {
    dataset_id: DATASET_ID,
    store_id: 'store-a',
    kind: 'amazon_ads',
    source_file: 'ads.csv',
    row_count: 10,
    byte_size: 8,
    content_sha256: SHA256,
    r2_key: `imports/store-a/amazon_ads/${DATASET_ID}.csv`,
    imported_at: '2026-08-31 00:00:00',
    current_since: '2026-08-31 00:00:00',
  };
}

function currentObject(overrides = {}) {
  return {
    size: 8,
    body: 'csv-body',
    checksums: { sha256: shaBytes() },
    customMetadata: {
      datasetId: DATASET_ID,
      storeId: 'store-a',
      kind: 'amazon_ads',
      contentSha256: SHA256,
    },
    ...overrides,
  };
}

test('normalizes and validates dataset metadata', () => {
  assert.deepEqual(
    validateDatasetDescriptor({
      storeId: 'STORE-A',
      kind: 'AMAZON_ADS',
      sourceFile: 'ads.csv',
      rowCount: 10,
      byteSize: 200,
      contentSha256: SHA256.toUpperCase(),
    }),
    {
      storeId: 'store-a',
      kind: 'amazon_ads',
      sourceFile: 'ads.csv',
      rowCount: 10,
      byteSize: 200,
      contentSha256: SHA256,
    }
  );
});

test('builds a store- and kind-scoped immutable object key', () => {
  assert.equal(
    buildDatasetObjectKey('store-a', 'unified_transaction', DATASET_ID),
    `imports/store-a/unified_transaction/${DATASET_ID}.csv`
  );
});

test('persists R2 object before atomically recording version and current pointer', async () => {
  const env = fakeEnv();
  const result = await persistAcceptedDataset(env, {
    datasetId: DATASET_ID,
    storeId: 'store-a',
    kind: 'amazon_ads',
    sourceFile: 'ads.csv',
    rowCount: 10,
    byteSize: 8,
    contentSha256: SHA256,
    body: 'csv-body',
  });

  const stored = env.objects.get(result.r2Key);
  assert.equal(result.r2Key, `imports/store-a/amazon_ads/${DATASET_ID}.csv`);
  assert.equal(stored.options.onlyIf.get('if-none-match'), '*');
  assert.equal(stored.options.sha256.byteLength, 32);
  assert.equal(env.batches.length, 1);
  assert.equal(env.batches[0].length, 2);
});

test('does not promote R2 objects with unexpected size or checksum', async () => {
  const base = {
    datasetId: DATASET_ID,
    storeId: 'store-a',
    kind: 'amazon_ads',
    sourceFile: 'ads.csv',
    rowCount: 10,
    byteSize: 8,
    contentSha256: SHA256,
    body: 'csv-body',
  };

  const sizeEnv = fakeEnv();
  sizeEnv.DATA.put = async (key, body, options) => ({
    key,
    size: 9,
    checksums: { sha256: options.sha256 },
  });
  await assert.rejects(
    persistAcceptedDataset(sizeEnv, base),
    (error) => error instanceof DatasetPersistenceError && error.code === 'dataset_object_size_mismatch'
  );
  assert.equal(sizeEnv.batches.length, 0);

  const checksumEnv = fakeEnv();
  checksumEnv.DATA.put = async (key, body) => ({
    key,
    size: 8,
    checksums: { sha256: shaBytes('b'.repeat(64)) },
  });
  await assert.rejects(
    persistAcceptedDataset(checksumEnv, base),
    (error) => error instanceof DatasetPersistenceError && error.code === 'dataset_object_checksum_mismatch'
  );
  assert.equal(checksumEnv.batches.length, 0);
});

test('refuses to overwrite an existing immutable R2 key', async () => {
  const env = fakeEnv();
  const input = {
    datasetId: DATASET_ID,
    storeId: 'store-a',
    kind: 'amazon_ads',
    sourceFile: 'ads.csv',
    rowCount: 10,
    byteSize: 8,
    contentSha256: SHA256,
    body: 'csv-body',
  };

  await persistAcceptedDataset(env, input);
  await assert.rejects(
    persistAcceptedDataset(env, input),
    (error) => error instanceof DatasetPersistenceError && error.code === 'dataset_object_already_exists'
  );
  assert.equal(env.batches.length, 1);
});

test('restores the current R2 object only when metadata and checksum match', async () => {
  const metadata = currentMetadata();
  const object = currentObject();
  const env = restoreEnv(metadata, object);
  const result = await readCurrentDatasetObject(env, 'store-a', 'amazon_ads');

  assert.equal(result.metadata.dataset_id, DATASET_ID);
  assert.equal(result.object, object);
  assert.deepEqual(env.gets, [metadata.r2_key]);
});

test('returns null when no current dataset exists without reading R2', async () => {
  const env = restoreEnv(null, null);
  assert.equal(await readCurrentDatasetObject(env, 'store-a', 'amazon_ads'), null);
  assert.equal(env.gets.length, 0);
});

test('fails closed when the current object is missing or inconsistent', async () => {
  const metadata = currentMetadata();

  await assert.rejects(
    readCurrentDatasetObject(restoreEnv(metadata, null), 'store-a', 'amazon_ads'),
    (error) => error instanceof DatasetPersistenceError && error.code === 'dataset_object_missing'
  );

  await assert.rejects(
    readCurrentDatasetObject(restoreEnv(metadata, currentObject({ size: 9 })), 'store-a', 'amazon_ads'),
    (error) => error instanceof DatasetPersistenceError && error.code === 'dataset_object_size_mismatch'
  );

  await assert.rejects(
    readCurrentDatasetObject(
      restoreEnv(metadata, currentObject({ checksums: { sha256: shaBytes('b'.repeat(64)) } })),
      'store-a',
      'amazon_ads'
    ),
    (error) => error instanceof DatasetPersistenceError && error.code === 'dataset_object_checksum_mismatch'
  );

  await assert.rejects(
    readCurrentDatasetObject(
      restoreEnv(metadata, currentObject({ customMetadata: { ...currentObject().customMetadata, datasetId: 'wrong' } })),
      'store-a',
      'amazon_ads'
    ),
    (error) => error instanceof DatasetPersistenceError && error.code === 'dataset_object_metadata_mismatch'
  );
});
