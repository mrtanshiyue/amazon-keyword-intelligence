import test from 'node:test';
import assert from 'node:assert/strict';

await import('../data-provenance-guard.js');
const {
  classifyDatasetSource,
  classifyAdsSource,
  classifyFinanceSource,
  classifyMetricEvidence,
  approvalBlocked,
  actionApprovalBlocked,
  actionEvidenceType,
  markLegacyActions,
  stampNewActionLineage,
} = globalThis.KeywordOSDataProvenance;

test('validated persisted Ads data is treated as user import', () => {
  const result = classifyAdsSource({
    record: { source: 'ads.csv', checksum: 'fnv1a32:ads1', rows: [{ searchTerm: 'reader' }] },
    seedRows: [{ searchTerm: 'seed' }],
    validation: { ok: true },
  });
  assert.equal(result.type, 'user-import');
  assert.equal(result.description, 'ads.csv');
  assert.equal(result.checksum, 'fnv1a32:ads1');
  assert.equal(approvalBlocked(result), false);
});

test('invalid persisted Ads data falls back to bundled seed and blocks approval', () => {
  const result = classifyAdsSource({
    record: { source: 'bad.csv', rows: [{ searchTerm: 'reader' }] },
    seedRows: [{ searchTerm: 'seed' }],
    validation: { ok: false },
  });
  assert.equal(result.type, 'bundled-seed');
  assert.match(result.description, /stored import rejected/i);
  assert.equal(approvalBlocked(result), true);
});

test('Finance uses the same user-import, bundled-seed and missing contract as Ads', () => {
  const imported = classifyFinanceSource({
    record: { source: 'unified.csv', rows: [{ date: '2026-07-01' }] },
    seedRows: [{ date: '2026-06-01' }],
    validation: { ok: true },
  });
  const seed = classifyFinanceSource({ seedRows: [{ date: '2026-06-01' }] });
  const missing = classifyFinanceSource();

  assert.equal(imported.type, 'user-import');
  assert.equal(seed.type, 'bundled-seed');
  assert.equal(missing.type, 'missing');
});

test('validated Growth records are user imports while derived registry records are calculated', () => {
  const imported = classifyDatasetSource({
    kind: 'inventory',
    record: {
      kind: 'inventory',
      source: 'inventory.csv',
      validation: { status: 'validated' },
      rows: [{ sku: 'SKU-1' }],
    },
  });
  const derived = classifyDatasetSource({
    kind: 'keyword-assets',
    record: {
      kind: 'keyword-assets',
      source: 'Derived from Store 01 keyword evidence',
      validation: { status: 'validated' },
      rows: [{ keyword: 'reading glasses' }],
    },
  });
  const invalid = classifyDatasetSource({
    kind: 'ranks',
    record: { kind: 'ranks', validation: { status: 'invalid' }, rows: [{ keyword: 'reader' }] },
  });

  assert.equal(imported.type, 'user-import');
  assert.equal(derived.type, 'calculated');
  assert.equal(invalid.type, 'missing');
});

test('metric provenance distinguishes calculated, third-party estimate and missing values', () => {
  assert.equal(classifyMetricEvidence({ value: 0.32, calculated: true }).type, 'calculated');
  assert.equal(classifyMetricEvidence({ value: 1200, estimated: true }).type, 'third-party-estimate');
  assert.equal(classifyMetricEvidence({ value: null }).type, 'missing');
  assert.equal(classifyMetricEvidence({ value: 10, source: { type: 'bundled-seed', description: 'seed' } }).type, 'bundled-seed');
});

test('missing Ads evidence blocks approval', () => {
  const result = classifyAdsSource();
  assert.equal(result.type, 'missing');
  assert.equal(approvalBlocked(result), true);
});

test('legacy actions are fail-closed instead of inheriting the current import', () => {
  const actions = [{ id: 'a1', status: 'Pending' }, { id: 'a2', status: 'Approved', evidenceProvenance: 'user-import' }];
  assert.equal(markLegacyActions(actions), 1);
  assert.equal(actions[0].evidenceProvenance, 'legacy-unknown');
  assert.equal(actionEvidenceType(actions[0]), 'legacy-unknown');
  assert.equal(actions[1].evidenceProvenance, 'user-import');
});

test('new actions capture the exact Ads evidence type and checksum once', () => {
  const known = new Set(['old']);
  const actions = [{ id: 'old' }, { id: 'new' }];
  const provenance = classifyAdsSource({
    record: { source: 'ads.csv', checksum: 'fnv1a32:current', rows: [{ searchTerm: 'reader' }] },
    validation: { ok: true },
  });

  assert.equal(stampNewActionLineage(actions, known, provenance), 1);
  assert.equal(actions[1].evidenceProvenance, 'user-import');
  assert.equal(actions[1].evidenceChecksum, 'fnv1a32:current');
  assert.equal(stampNewActionLineage(actions, known, provenance), 0);
});

test('seed, legacy and stale-dataset actions remain unapprovable after a later user import', () => {
  const current = classifyAdsSource({
    record: { source: 'new.csv', checksum: 'fnv1a32:new', rows: [{ searchTerm: 'reader' }] },
    validation: { ok: true },
  });

  assert.equal(actionApprovalBlocked({ evidenceProvenance: 'bundled-seed' }, current), true);
  assert.equal(actionApprovalBlocked({ evidenceProvenance: 'legacy-unknown' }, current), true);
  assert.equal(actionApprovalBlocked({ evidenceProvenance: 'user-import', evidenceChecksum: 'fnv1a32:old' }, current), true);
  assert.equal(actionApprovalBlocked({ evidenceProvenance: 'user-import', evidenceChecksum: 'fnv1a32:new' }, current), false);
});
