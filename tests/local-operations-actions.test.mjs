import test from 'node:test';
import assert from 'node:assert/strict';

await import('../local-operations-actions.js');

const {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  SAFE_LOCAL_KEYS,
  backupManifest,
  manifestsMatch,
  sanitizeScheduleStorage,
  validateLocalStateRaw,
  validateBackupObject
} = globalThis.KeywordOSLocalOperationsTest;

function currentBackup(localStorage = {}, datasets = []) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: '2026-09-02T08:00:00.000Z',
    manifest: backupManifest(localStorage, datasets),
    localStorage,
    datasets
  };
}

test('validateBackupObject accepts supported local state and dataset records', () => {
  const localStorage = {
    keywordos_v9_settings: '{"targetAcos":40}',
    keywordos_v9_schedules: JSON.stringify([
      { id: 'schedule-1', name: 'Real' }
    ]),
    unrelated_key: 'ignored'
  };
  const datasets = [
    { key: 'ads', schemaVersion: 1, rows: [{ date: '2026-06-01', impressions: 100, clicks: 5, cost: 2.5, orders: 1, sales: 10, bid: 0.65 }], source: 'ads.csv', importedAt: '2026-08-31', rowCount: 99 }
  ];
  const filteredLocal = {
    keywordos_v9_settings: localStorage.keywordos_v9_settings,
    keywordos_v9_schedules: localStorage.keywordos_v9_schedules
  };
  const value = currentBackup(localStorage, datasets);
  value.manifest = backupManifest(filteredLocal, datasets);
  const result = validateBackupObject(value);

  assert.equal(result.ok, true);
  assert.equal(result.backup.datasets[0].rowCount, 1);
  assert.equal('unrelated_key' in result.backup.localStorage, false);
  assert.deepEqual(JSON.parse(result.backup.localStorage.keywordos_v9_schedules), [{ id: 'schedule-1', name: 'Real' }]);
});

test('legacy backup versions remain readable and are upgraded to a verified manifest', () => {
  const result = validateBackupObject({
    format: BACKUP_FORMAT,
    version: 2,
    localStorage: { keywordos_v9_settings: '{"targetAcos":40}' },
    datasets: []
  });
  assert.equal(result.ok, true);
  assert.equal(result.backup.version, BACKUP_VERSION);
  assert.equal(result.backup.manifest.localKeys, 1);
  assert.equal(result.backup.manifest.datasetCount, 0);
});

test('validateBackupObject preserves Store-scoped growth registry records', () => {
  const localStorage = {};
  const datasets = [{
    key: 'store-a::inventory', kind: 'inventory', storeId: 'store-a', schemaVersion: 2,
    source: 'inventory.csv', importedAt: '2026-09-01T08:00:00.000Z',
    rows: [{ date: '2026-08-30', sku: 'SKU-1', available: 10 }]
  }];
  const result = validateBackupObject(currentBackup(localStorage, datasets));
  assert.equal(result.ok, true);
  assert.equal(result.backup.datasets[0].key, 'store-a::inventory');
  assert.equal(result.backup.datasets[0].kind, 'inventory');
});

test('backup manifest covers competitor creative and local-only Growth state', () => {
  const localStorage = {
    keywordos_growth_listing_versions_v1: JSON.stringify([{ capturedAt: '2026-09-02T00:00:00Z', fields: { title: 'Draft' } }]),
    keywordos_growth_listing_evidence_checklist_v1: JSON.stringify([{ 'Main image is compliant and legible': true }]),
    keywordos_growth_competitor_groups_v1: JSON.stringify([{ id: 'group-1', name: 'Core', asins: ['B000000001'] }]),
    keywordos_competitor_creative_evidence_v1: JSON.stringify([{ date: '2026-09-01', asin: 'B000000001', slot: 'Main', imageReference: 'capture-1' }])
  };
  const datasets = [{
    key: 'store-a::competitor-creative', kind: 'competitor-creative', storeId: 'store-a', schemaVersion: 2,
    source: 'manual creative evidence', rows: [{ date: '2026-09-01', asin: 'B000000001', slot: 'Main', imageReference: 'capture-1' }]
  }];
  const result = validateBackupObject(currentBackup(localStorage, datasets));

  assert.equal(result.ok, true);
  assert.equal(result.backup.datasets[0].kind, 'competitor-creative');
  assert.equal(result.backup.manifest.localKeys, 4);
  assert.equal(result.backup.manifest.datasetCount, 1);
  assert.equal(result.backup.manifest.datasetRows, 1);
  for (const key of Object.keys(localStorage)) assert.equal(SAFE_LOCAL_KEYS.has(key), true);
});

test('current backup manifest rejects tampered local state or dataset rows', () => {
  const localStorage = { keywordos_growth_competitor_groups_v1: JSON.stringify([{ id: 'group-1', name: 'Core', asins: ['B000000001'] }]) };
  const datasets = [{ key: 'store-a::competitor', kind: 'competitor', storeId: 'store-a', schemaVersion: 2, rows: [{ date: '2026-09-01', asin: 'B000000001', price: 29.99 }] }];
  const value = currentBackup(localStorage, datasets);
  assert.equal(validateBackupObject(value).ok, true);

  const localTamper = structuredClone(value);
  localTamper.localStorage.keywordos_growth_competitor_groups_v1 = JSON.stringify([]);
  assert.equal(validateBackupObject(localTamper).ok, false);

  const datasetTamper = structuredClone(value);
  datasetTamper.datasets[0].rows[0].price = 19.99;
  assert.equal(validateBackupObject(datasetTamper).ok, false);
});

test('backup manifest comparison checks counts and content checksums', () => {
  const localStorage = { keywordos_v9_settings: '{"targetAcos":40}' };
  const datasets = [{ key: 'store-a::inventory', kind: 'inventory', storeId: 'store-a', rows: [{ sku: 'SKU-1', available: 10 }] }];
  const expected = backupManifest(localStorage, datasets);
  assert.equal(manifestsMatch(expected, backupManifest(localStorage, datasets)), true);
  assert.equal(manifestsMatch(expected, backupManifest({ ...localStorage, keywordos_v9_shell_ui: '{}' }, datasets)), false);
  assert.equal(manifestsMatch(expected, backupManifest(localStorage, [...datasets, { key: 'store-a::costs', kind: 'costs', storeId: 'store-a', rows: [] }])), false);
});

test('validateBackupObject rejects unsupported dataset keys and duplicate datasets', () => {
  const base = { format: BACKUP_FORMAT, version: 2, localStorage: {} };
  assert.equal(validateBackupObject({ ...base, datasets: [{ key: 'other', schemaVersion: 1, rows: [] }] }).ok, false);
  assert.equal(validateBackupObject({ ...base, datasets: [
    { key: 'ads', schemaVersion: 1, rows: [] },
    { key: 'ads', schemaVersion: 1, rows: [] }
  ] }).ok, false);
});

test('validateBackupObject rejects wrong local-state top-level shapes before restore', () => {
  const base = { format: BACKUP_FORMAT, version: 2, datasets: [] };
  assert.equal(validateBackupObject({ ...base, localStorage: {
    keywordos_v9_protected: JSON.stringify(['reading glasses']),
    keywordos_v9_settings: JSON.stringify({ targetAcos: 40 }),
    keywordos_v9_preset_default: JSON.stringify('Winners'),
    keywordos_growth_listing_versions_v1: JSON.stringify([])
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
    keywordos_growth_competitor_groups_v1: JSON.stringify({ bad: true })
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
  assert.equal(validateLocalStateRaw('keywordos_growth_listing_versions_v1', '[]').ok, true);
  assert.equal(validateLocalStateRaw('keywordos_growth_listing_versions_v1', '{}').ok, false);
});

test('validateBackupObject rejects corrupted normalized dataset rows before restore', () => {
  const base = { format: BACKUP_FORMAT, version: 2, localStorage: {} };
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
