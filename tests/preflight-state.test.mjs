import test from 'node:test';
import assert from 'node:assert/strict';

await import('../preflight-state.js');

const { sanitizeScheduleDrafts, validatePersistedDatasetRows } = globalThis.KeywordOSPreflightTest;

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
