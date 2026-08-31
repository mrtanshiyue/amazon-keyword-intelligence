import test from 'node:test';
import assert from 'node:assert/strict';

await import('../local-operations-actions.js');

const {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  sanitizeScheduleStorage,
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
      { key: 'ads', schemaVersion: 1, rows: [{ date: '2026-06-01' }], source: 'ads.csv', importedAt: '2026-08-31', rowCount: 99 }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.backup.datasets[0].rowCount, 1);
  assert.equal('unrelated_key' in result.backup.localStorage, false);
  assert.deepEqual(JSON.parse(result.backup.localStorage.keywordos_v9_schedules), [{ id: 'schedule-1', name: 'Real' }]);
});

test('validateBackupObject rejects unsupported dataset keys and duplicate datasets', () => {
  const base = { format: BACKUP_FORMAT, version: BACKUP_VERSION, localStorage: {} };
  assert.equal(validateBackupObject({ ...base, datasets: [{ key: 'other', schemaVersion: 1, rows: [] }] }).ok, false);
  assert.equal(validateBackupObject({ ...base, datasets: [
    { key: 'ads', schemaVersion: 1, rows: [] },
    { key: 'ads', schemaVersion: 1, rows: [] }
  ] }).ok, false);
});

test('sanitizeScheduleStorage removes the retired synthetic default draft', () => {
  const raw = JSON.stringify([{ id: 'schedule-default' }, { id: 'schedule-user' }]);
  assert.deepEqual(JSON.parse(sanitizeScheduleStorage(raw)), [{ id: 'schedule-user' }]);
});
