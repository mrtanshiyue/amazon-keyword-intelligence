import test from 'node:test';
import assert from 'node:assert/strict';

await import('../local-operations-actions.js');

const {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  sanitizeScheduleStorage,
  validateLocalStateRaw,
  validateBackupObject
} = globalThis.KeywordOSLocalOperationsTest;

test('validateBackupObject accepts supported local state and dataset records', () => {
  const result = validateBackupObject({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: '2026-08-31T08:00:00.000Z',
    localStorage: {
      keywordos_v9_settings: '{"targetAcos":40}',
      keywordos_v9_schedules: JSON.stringify([
        { id: 'schedule-default', name: 'Synthetic' },
        { id: 'schedule-1', name: 'Real' }
      ]),
      unrelated_key: 'ignored'
    },
    datasets: [
      { key: 'ads', schemaVersion: 1, rows: [{ date: '2026-06-01', impressions: 100, clicks: 5, cost: 2.5, orders: 1, sales: 10, bid: 0.65 }], source: 'ads.csv', importedAt: '2026-08-31', rowCount: 99 }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.backup.datasets[0].rowCount, 1);
  assert.equal('unrelated_key' in result.backup.localStorage, false);
  assert.deepEqual(JSON.parse(result.backup.localStorage.keywordos_v9_schedules), [{ id: 'schedule-1', name: 'Real' }]);
});

test('validateBackupObject preserves Store-scoped growth registry records', () => {
  const result = validateBackupObject({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    localStorage: {},
    datasets: [{
      key: 'store-a::inventory', kind: 'inventory', storeId: 'store-a', schemaVersion: 2,
      source: 'inventory.csv', importedAt: '2026-09-01T08:00:00.000Z',
      rows: [{ date: '2026-08-30', sku: 'SKU-1', available: 10 }]
    }]
  });
  assert.equal(result.ok, true);
  assert.equal(result.backup.datasets[0].key, 'store-a::inventory');
  assert.equal(result.backup.datasets[0].kind, 'inventory');
});

test('validateBackupObject rejects unsupported dataset keys and duplicate datasets', () => {
  const base = { format: BACKUP_FORMAT, version: BACKUP_VERSION, localStorage: {} };
  assert.equal(validateBackupObject({ ...base, datasets: [{ key: 'other', schemaVersion: 1, rows: [] }] }).ok, false);
  assert.equal(validateBackupObject({ ...base, datasets: [
    { key: 'ads', schemaVersion: 1, rows: [] },
    { key: 'ads', schemaVersion: 1, rows: [] }
  ] }).ok, false);
});

test('validateBackupObject rejects wrong local-state top-level shapes before restore', () => {
  const base = { format: BACKUP_FORMAT, version: BACKUP_VERSION, datasets: [] };
  assert.equal(validateBackupObject({ ...base, localStorage: {
    keywordos_v9_protected: JSON.stringify(['reading glasses']),
    keywordos_v9_settings: JSON.stringify({ targetAcos: 40 }),
    keywordos_v9_preset_default: JSON.stringify('Winners')
  } }).ok, true);
  assert.equal(validateBackupObject({ ...base, localStorage: {
    keywordos_v9_protected: JSON.stringify({ bad: true })
  } }).ok, false);
  assert.equal(validateBackupObject({ ...base, localStorage: {
    keywordos_v9_settings: JSON.stringify([])
  } }).ok, false);
  assert.equal(validateBackupObject({ ...base, localStorage: {
    keywordos_v9_preset_default: JSON.stringify({ bad: true })
  } }).ok, false);
  assert.equal(validateBackupObject({ ...base, localStorage: {
    keywordos_v9_actions: '{bad json'
  } }).ok, false);
});

test('validateLocalStateRaw enforces the stored JSON container contract', () => {
  assert.equal(validateLocalStateRaw('keywordos_v9_actions', '[]').ok, true);
  assert.equal(validateLocalStateRaw('keywordos_v9_actions', '{}').ok, false);
  assert.equal(validateLocalStateRaw('keywordos_v9_settings', '{}').ok, true);
  assert.equal(validateLocalStateRaw('keywordos_v9_settings', '[]').ok, false);
  assert.equal(validateLocalStateRaw('keywordos_v9_preset_default', JSON.stringify('')).ok, true);
});

test('validateBackupObject rejects corrupted normalized dataset rows before restore', () => {
  const base = { format: BACKUP_FORMAT, version: BACKUP_VERSION, localStorage: {} };
  const adsRow = { date: '2026-06-01', impressions: 100, clicks: 5, cost: 2.5, orders: 1, sales: 10, bid: 0.65 };
  const financeRow = {
    date: '2026-06-01', quantity: 1, productSales: 20, productSalesTax: 0, shippingCredits: 0,
    shippingTax: 0, giftWrapCredits: 0, giftWrapTax: 0, regulatoryFee: 0, regulatoryTax: 0,
    promo: 0, promoTax: 0, withheldTax: 0, sellingFees: -3, fbaFees: -4, otherTxnFees: 0,
    other: 0, total: 13
  };

  assert.equal(validateBackupObject({ ...base, datasets: [
    { key: 'ads', schemaVersion: 1, rows: [{ ...adsRow, cost: -1 }] }
  ] }).ok, false);
  assert.equal(validateBackupObject({ ...base, datasets: [
    { key: 'ads', schemaVersion: 1, rows: [{ ...adsRow, clicks: '5' }] }
  ] }).ok, false);
  assert.equal(validateBackupObject({ ...base, datasets: [
    { key: 'ads', schemaVersion: 1, rows: [{ ...adsRow, bid: '0.65' }] }
  ] }).ok, false);
  assert.equal(validateBackupObject({ ...base, datasets: [
    { key: 'ads', schemaVersion: 1, rows: [{ ...adsRow, date: '2026-02-30' }] }
  ] }).ok, false);
  assert.equal(validateBackupObject({ ...base, datasets: [
    { key: 'finance', schemaVersion: 1, rows: [{ ...financeRow, total: '13' }] }
  ] }).ok, false);
  assert.equal(validateBackupObject({ ...base, datasets: [
    { key: 'finance', schemaVersion: 1, rows: [financeRow] }
  ] }).ok, true);
});

test('sanitizeScheduleStorage removes the retired synthetic default draft', () => {
  const raw = JSON.stringify([{ id: 'schedule-default' }, { id: 'schedule-user' }]);
  assert.deepEqual(JSON.parse(sanitizeScheduleStorage(raw)), [{ id: 'schedule-user' }]);
});
