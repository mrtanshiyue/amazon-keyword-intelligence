import test from 'node:test';
import assert from 'node:assert/strict';

await import('../preflight-state.js');

const {
  sanitizeScheduleDrafts,
  validatePersistedDatasetRows,
  localStateDecision,
  repairLocalState
} = globalThis.KeywordOSPreflightTest;

test('sanitizeScheduleDrafts removes only the synthetic default schedule', () => {
  const input = [
    { id: 'schedule-default', name: 'Weekday efficiency window' },
    { id: 'schedule-123', name: 'My real draft' }
  ];
  assert.deepEqual(sanitizeScheduleDrafts(input), [{ id: 'schedule-123', name: 'My real draft' }]);
});

test('sanitizeScheduleDrafts fails closed for non-array input', () => {
  assert.deepEqual(sanitizeScheduleDrafts({ id: 'schedule-default' }), []);
});

test('localStateDecision removes malformed or wrong-container startup state', () => {
  assert.deepEqual(localStateDecision('keywordos_v9_protected', '{}'), { action: 'remove' });
  assert.deepEqual(localStateDecision('keywordos_v9_settings', '[]'), { action: 'remove' });
  assert.deepEqual(localStateDecision('keywordos_v9_preset_default', '{}'), { action: 'remove' });
  assert.deepEqual(localStateDecision('keywordos_v9_actions', '{bad json'), { action: 'remove' });
  assert.deepEqual(localStateDecision('keywordos_v9_settings', '{"targetAcos":40}'), { action: 'keep' });
  assert.deepEqual(localStateDecision('keywordos_v9_protected', '["reading glasses"]'), { action: 'keep' });
});

test('schedule startup state always resolves to a real array without synthetic default', () => {
  assert.deepEqual(localStateDecision('keywordos_v9_schedules', null), { action: 'set', raw: '[]' });
  assert.deepEqual(localStateDecision('keywordos_v9_schedules', '{bad json'), { action: 'set', raw: '[]' });
  assert.deepEqual(localStateDecision('keywordos_v9_schedules', '{}'), { action: 'set', raw: '[]' });
  assert.deepEqual(
    localStateDecision('keywordos_v9_schedules', JSON.stringify([
      { id: 'schedule-default' },
      { id: 'schedule-user' }
    ])),
    { action: 'set', raw: JSON.stringify([{ id: 'schedule-user' }]) }
  );
});

test('repairLocalState removes invalid live storage before app initialization', () => {
  const values = new Map([
    ['keywordos_v9_protected', '{}'],
    ['keywordos_v9_settings', JSON.stringify({ targetAcos: 40 })],
    ['keywordos_v9_schedules', '{bad json'],
    ['keywordos_v9_preset_default', JSON.stringify('Winners')]
  ]);
  const storage = {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };

  repairLocalState(storage);

  assert.equal(values.has('keywordos_v9_protected'), false);
  assert.equal(values.get('keywordos_v9_settings'), JSON.stringify({ targetAcos: 40 }));
  assert.equal(values.get('keywordos_v9_schedules'), '[]');
  assert.equal(values.get('keywordos_v9_preset_default'), JSON.stringify('Winners'));
});

test('persisted Ads validation rejects type-coerced bid lineage and malformed rows', () => {
  const row = { date: '2026-06-01', impressions: 100, clicks: 5, cost: 2.5, orders: 1, sales: 10, bid: 0.65 };
  assert.equal(validatePersistedDatasetRows('ads', [row]).ok, true);
  assert.equal(validatePersistedDatasetRows('ads', [{ ...row, bid: '0.65' }]).ok, false);
  assert.equal(validatePersistedDatasetRows('ads', [{ ...row, bid: -0.1 }]).ok, false);
  assert.equal(validatePersistedDatasetRows('ads', [{ ...row, clicks: '5' }]).ok, false);
  assert.equal(validatePersistedDatasetRows('ads', [{ ...row, date: '2026-02-30' }]).ok, false);
});

test('persisted Unified validation preserves signed finance values but rejects malformed values', () => {
  const row = {
    date: '2026-06-01', quantity: 1, productSales: 20, productSalesTax: 0, shippingCredits: 0,
    shippingTax: 0, giftWrapCredits: 0, giftWrapTax: 0, regulatoryFee: 0, regulatoryTax: 0,
    promo: 0, promoTax: 0, withheldTax: 0, sellingFees: -3, fbaFees: -4, otherTxnFees: 0,
    other: 0, total: 13
  };
  assert.equal(validatePersistedDatasetRows('finance', [row]).ok, true);
  assert.equal(validatePersistedDatasetRows('finance', [{ ...row, sellingFees: '-3' }]).ok, false);
  assert.equal(validatePersistedDatasetRows('finance', [{ ...row, date: '2026-02-30' }]).ok, false);
});
