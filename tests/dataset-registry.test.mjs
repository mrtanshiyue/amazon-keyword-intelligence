import test from 'node:test';
import assert from 'node:assert/strict';

await import('../dataset-registry.js');
const registry = globalThis.KeywordOSDatasetRegistryTest;

test('normalizes a growth dataset into a Store-scoped provenance record', () => {
  const record = registry.normalizeRecord({
    kind: 'inventory',
    storeId: 'store-a',
    source: 'inventory-august.csv',
    importedAt: '2026-09-01T08:00:00.000Z',
    rows: [{ date: '2026-08-30', sku: 'SKU-1', available: 10 }],
    validation: { status: 'validated', validator: 'growth CSV parser' }
  });
  assert.equal(record.key, 'store-a::inventory');
  assert.equal(record.schemaVersion, 2);
  assert.equal(record.rowCount, 1);
  assert.deepEqual(record.coverage, { min: '2026-08-30', max: '2026-08-30', datedRows: 1 });
  assert.match(record.checksum, /^fnv1a32:/);
});

test('keeps schema-v1 unscoped records readable during migration', () => {
  const record = registry.normalizeRecord({
    key: 'sqp',
    schemaVersion: 1,
    source: 'legacy.csv',
    rows: [{ date: '2026-08-30', query: 'reading glasses' }]
  });
  assert.equal(record.key, 'store-a::sqp');
  assert.equal(record.migratedFrom, 'schema-v1-unscoped');
});

test('rejects unknown kinds and non-object rows', () => {
  assert.throws(() => registry.normalizeRecord({ kind: 'unknown', rows: [] }), /Unsupported dataset kind/);
  assert.throws(() => registry.normalizeRecord({ kind: 'costs', rows: ['bad'] }), /non-object row/);
});

test('accepts Store-scoped action outcome baseline records', () => {
  const record = registry.normalizeRecord({ kind: 'action-outcomes', storeId: 'store-a', rows: [{ id: 'a-1', windowDays: 14, metrics: { spend: 12 } }], source: 'Approved action baseline' });
  assert.equal(record.kind, 'action-outcomes');
  assert.equal(record.rowCount, 1);
});

test('inventory snapshots append dated history and replace same-date SKU corrections', () => {
  const rows = registry.mergeAppendRows('inventory', [
    { date: '2026-08-30', sku: 'SKU-1', asin: 'B000000001', available: 20 },
    { date: '2026-08-31', sku: 'SKU-1', asin: 'B000000001', available: 15 },
    { date: '2026-08-31', sku: 'sku-1', asin: 'B000000001', available: 12 }
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].available, 12);
  assert.ok(registry.APPEND_MERGE_KINDS.has('inventory'));
});

test('rank snapshots append new dates and replace corrections with the same stable key', () => {
  const rows = registry.mergeAppendRows('ranks', [
    { date: '2026-08-30', asin: 'B000000001', keyword: 'Reading Glasses', organicRank: 18 },
    { date: '2026-08-31', asin: 'B000000001', keyword: 'reading glasses', organicRank: 15 },
    { date: '2026-08-31', asin: 'b000000001', keyword: '  READING   GLASSES ', organicRank: 12 }
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].organicRank, 12);
});

test('competitor snapshots use date plus ASIN and collapse undated corrections conservatively', () => {
  const undated = { date: '', asin: 'B000000001', price: 19.99 };
  const correction = { date: '', asin: 'b000000001', price: 18.99 };
  const later = { date: '2026-09-01', asin: 'B000000001', price: 17.99 };
  const once = registry.mergeAppendRows('competitor', [undated, correction, later]);
  const twice = registry.mergeAppendRows('competitor', [...once, correction, later]);
  assert.equal(once.length, 2);
  assert.equal(once[0].price, 18.99);
  assert.deepEqual(twice, once);
});

test('replace-style datasets are not deduplicated by append merge policy', () => {
  const rows = [{ sku: 'SKU-1', unitCost: 1 }, { sku: 'SKU-1', unitCost: 2 }];
  assert.equal(registry.mergeAppendRows('costs', rows), rows);
  assert.equal(registry.normalizeRecord({ kind: 'costs', rows }).rowCount, 2);
});
