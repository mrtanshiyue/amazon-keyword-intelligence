import test from 'node:test';
import assert from 'node:assert/strict';

await import('../growth-workspaces.js');
await import('../purchase-order-planning.js');
const growth = globalThis.KeywordOSGrowthTest;
const po = globalThis.KeywordOSPurchaseOrderPlanningTest;

test('builds a purchase-order planning row only from explicit replenishment inputs', () => {
  const row = po.purchaseOrderPlanRow({
    sku: 'SKU-1', product: 'Blue', date: '2026-09-01', available: 10, inbound: 4, reserved: 2,
    velocity: { unitsPerDay: 2, observedDays: 5 }
  }, { leadTimeDays: 7, safetyDays: 3 }, growth.replenishmentPlan);

  assert.equal(row.available, true);
  assert.equal(row.status, 'Planning only - not submitted');
  assert.equal(row.sellableUnits, 12);
  assert.equal(row.targetCoverageUnits, 20);
  assert.equal(row.coverageGapUnits, 8);
  assert.equal(row.reviewDate, '2026-09-01');
  assert.equal(row.forecastStockoutDate, '2026-09-07');
});

test('keeps PO planning unavailable when required sales evidence is missing', () => {
  const row = po.purchaseOrderPlanRow({
    sku: 'SKU-1', date: '2026-09-01', available: 10,
    velocity: { unitsPerDay: 0, observedDays: 0 }
  }, { leadTimeDays: 7, safetyDays: 3 }, growth.replenishmentPlan);

  assert.equal(row.available, false);
  assert.match(row.reason, /Daily sales evidence is required/);
});

test('exports parseable planning CSV with an explicit non-submission status', () => {
  const csv = po.purchaseOrderPlanCsv([{
    available: true, status: po.STATUS, sku: 'SKU-1', product: 'Blue, "Large"', snapshotDate: '2026-09-01',
    availableUnits: 10, inboundUnits: 4, reservedUnits: 2, observedUnitsPerDay: 2, observedDays: 5,
    leadTimeDays: 7, safetyDays: 3, sellableUnits: 12, targetCoverageUnits: 20, coverageGapUnits: 8,
    daysUntilReview: 0, reviewDate: '2026-09-01', daysToStockout: 6, forecastStockoutDate: '2026-09-07'
  }]);

  assert.match(csv, /Planning only - not submitted/);
  assert.match(csv, /"Blue, ""Large"""/);
  assert.equal(csv.split('\n').length, 2);
});
