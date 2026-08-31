import assert from 'node:assert/strict';
import test from 'node:test';

import { ImportValidationError } from '../src/import-validation.js';
import { acceptImportedDataset } from '../src/import-pipeline.js';

const ADS_CSV = [
  'Advertiser Account Name,Campaign Name,Ad Group Name,Customer Search Term,Date,Targeting,Match Type,Impressions,Clicks,Spend,Orders,Sales',
  'Account A,Campaign A,Group A,reading glasses,2026-06-01,reading glasses,EXACT,100,10,5.00,2,20.00',
].join('\n');

function bodySize(body) {
  if (typeof body === 'string') return new TextEncoder().encode(body).byteLength;
  if (body instanceof ArrayBuffer) return body.byteLength;
  if (ArrayBuffer.isView(body)) return body.byteLength;
  return Number.NaN;
}

function fakeEnv() {
  const writes = [];
  const batches = [];
  return {
    writes,
    batches,
    DATA: {
      async put(key, body, options) {
        writes.push({ key, body, options });
        return {
          key,
          size: bodySize(body),
          checksums: { sha256: options.sha256 },
        };
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

test('validates before persisting an accepted import', async () => {
  const env = fakeEnv();
  const result = await acceptImportedDataset(env, {
    datasetId: '123e4567-e89b-42d3-a456-426614174000',
    storeId: 'store-a',
    kind: 'amazon_ads',
    sourceFile: 'ads.csv',
    body: ADS_CSV,
  });

  assert.equal(result.kind, 'amazon_ads');
  assert.equal(result.reportType, 'Amazon Ads Search Term Performance');
  assert.equal(result.rowCount, 1);
  assert.equal(result.fieldCount, 12);
  assert.equal(env.writes.length, 1);
  assert.equal(env.batches.length, 1);
  assert.equal(env.writes[0].key, 'imports/store-a/amazon_ads/123e4567-e89b-42d3-a456-426614174000.csv');
});

test('invalid import never reaches R2 or D1 writes', async () => {
  const env = fakeEnv();

  await assert.rejects(
    acceptImportedDataset(env, {
      datasetId: '123e4567-e89b-42d3-a456-426614174000',
      storeId: 'store-a',
      kind: 'amazon_ads',
      sourceFile: 'invalid.csv',
      body: 'Date,Campaign Name\n2026-06-01,Campaign A\n',
    }),
    (error) => error instanceof ImportValidationError && error.code === 'missing_required_fields'
  );

  assert.equal(env.writes.length, 0);
  assert.equal(env.batches.length, 0);
});
