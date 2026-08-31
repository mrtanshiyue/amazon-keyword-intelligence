import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { readCurrentDataset } from '../src/dataset-persistence.js';

test('current dataset lookup joins version metadata on dataset, Store and kind', async () => {
  let sql = '';
  const env = {
    DB: {
      prepare(value) {
        sql = value;
        return {
          bind() {
            return {
              async first() {
                return null;
              },
            };
          },
        };
      },
    },
  };

  await readCurrentDataset(env, 'store-a', 'amazon_ads');

  assert.match(sql, /v\.dataset_id\s*=\s*c\.dataset_id/);
  assert.match(sql, /v\.store_id\s*=\s*c\.store_id/);
  assert.match(sql, /v\.kind\s*=\s*c\.kind/);
});

test('migration binds current pointers to the same dataset Store and kind', async () => {
  const migration = await readFile(
    new URL('../migrations/0003_dataset_versions.sql', import.meta.url),
    'utf8'
  );

  assert.match(migration, /UNIQUE\s*\(dataset_id, store_id, kind\)/);
  assert.match(
    migration,
    /FOREIGN KEY\s*\(dataset_id, store_id, kind\)[\s\S]*REFERENCES dataset_versions\(dataset_id, store_id, kind\)/
  );
});
