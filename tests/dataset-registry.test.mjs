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
