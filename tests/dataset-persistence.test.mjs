import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DatasetPersistenceError,
  buildDatasetObjectKey,
  persistAcceptedDataset,
  validateDatasetDescriptor,
} from '../src/dataset-persistence.js';

const SHA256 = 'a'.repeat(64);
const DATASET_ID = '123e4567-e89b-42d3-a456-426614174000';

function fakeEnv({ failBatch = false } = {}) {
  const objects = new Map();
  const batches = [];
  return {
    objects,
    batches,
    DATA: {
      async put(key, body, options) {
        if (objects.has(key) && options?.onlyIf?.etagDoesNotMatch === '*') return null;
        const object = { key, body, options };
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
        if (failBatch) throw new Error('batch failed');
        batches.push(statements);
        return statements.map(() => ({ success: true }));
      },
    },
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
    byteSize: 200,
    contentSha256: SHA256,
    body: 'csv-body',
  });

  assert.equal(result.r2Key, `imports/store-a/amazon_ads/${DATASET_ID}.csv`);
  assert.equal(env.objects.size, 1);
  assert.equal(env.batches.length, 1);
  assert.equal(env.batches[0].length, 2);
});

test('refuses to overwrite an existing immutable R2 key', async () => {
  const env = fakeEnv();
  const input = {
    datasetId: DATASET_ID,
    storeId: 'store-a',
    kind: 'amazon_ads',
    sourceFile: 'ads.csv',
    rowCount: 10,
    byteSize: 200,
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
