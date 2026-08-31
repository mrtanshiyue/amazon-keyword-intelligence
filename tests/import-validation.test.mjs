import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ImportValidationError,
  MAX_IMPORT_BYTES,
  validateImportBody,
  validateImportText,
} from '../src/import-validation.js';

const ADS_HEADER = [
  'Advertiser Account Name',
  'Campaign Name',
  'Ad Group Name',
  'Customer Search Term',
  'Date',
  'Targeting',
  'Match Type',
  'Impressions',
  'Clicks',
  'Spend',
  'Orders',
  'Sales',
].join(',');

const UNIFIED_HEADER = [
  'Date/Time',
  'Settlement Id',
  'Type',
  'Order Id',
  'SKU',
  'Description',
  'Quantity',
  'Marketplace',
  'Product Sales',
  'Promotional Rebates',
  'Marketplace Withheld Tax',
  'Selling Fees',
  'FBA Fees',
  'Other Transaction Fees',
  'Other',
  'Total',
].join(',');

test('validates the authoritative Amazon Ads sample', async () => {
  const body = await readFile(new URL('../sample-data/202606.csv', import.meta.url));
  const result = await validateImportBody('amazon_ads', body);

  assert.equal(result.reportType, 'Amazon Ads Search Term Performance');
  assert.equal(result.rowCount, 8753);
  assert.equal(result.fieldCount, 45);
  assert.equal(result.byteSize, body.byteLength);
  assert.ok(body.byteLength < MAX_IMPORT_BYTES);
  assert.match(result.contentSha256, /^[0-9a-f]{64}$/);
});

test('validates the authoritative Unified Transaction sample', async () => {
  const body = await readFile(new URL('../sample-data/UnifiedTransaction-202606.csv', import.meta.url));
  const result = await validateImportBody('unified_transaction', body);

  assert.equal(result.reportType, 'Amazon Unified Transaction Report');
  assert.equal(result.rowCount, 3643);
  assert.equal(result.fieldCount, 32);
  assert.deepEqual(result.missingRequiredFields, []);
  assert.equal(result.byteSize, body.byteLength);
  assert.ok(body.byteLength < MAX_IMPORT_BYTES);
  assert.match(result.contentSha256, /^[0-9a-f]{64}$/);
});

test('rejects an import larger than the buffered parser limit before decoding', async () => {
  const oversized = new Uint8Array(MAX_IMPORT_BYTES + 1);

  await assert.rejects(
    validateImportBody('amazon_ads', oversized),
    (error) =>
      error instanceof ImportValidationError &&
      error.code === 'import_too_large' &&
      error.details?.maxByteSize === MAX_IMPORT_BYTES &&
      error.details?.actualByteSize === MAX_IMPORT_BYTES + 1
  );
});

test('rejects Ads CSV missing required report fields', () => {
  assert.throws(
    () => validateImportText('amazon_ads', 'Date,Campaign Name\n2026-06-01,Campaign A\n'),
    (error) => error instanceof ImportValidationError && error.code === 'missing_required_fields'
  );
});

test('rejects incomplete Unified CSV that only resembles a transaction report', () => {
  assert.throws(
    () => validateImportText('unified_transaction', 'Date/Time,Type,Total\n2026-06-01,Order,10\n'),
    (error) =>
      error instanceof ImportValidationError &&
      error.code === 'missing_required_fields' &&
      error.details?.missingRequiredFields?.includes('product sales') &&
      error.details?.missingRequiredFields?.includes('selling fees')
  );
});

test('rejects nonblank Ads rows whose field count differs from the header', () => {
  const shortRow = 'Account A,Campaign A,Group A,readers,2026-06-01,readers,EXACT,100,10,5,2';
  assert.throws(
    () => validateImportText('amazon_ads', `${ADS_HEADER}\n${shortRow}\n`),
    (error) =>
      error instanceof ImportValidationError &&
      error.code === 'inconsistent_row_width' &&
      error.details?.expectedFieldCount === 12 &&
      error.details?.actualFieldCount === 11
  );
});

test('rejects nonblank Unified rows whose field count differs from the header', () => {
  const shortRow = '2026-06-01,1,Order,ORDER-1,SKU-1,Sale,1,Amazon.com,10,0,0,-1,-2,0,0';
  assert.throws(
    () => validateImportText('unified_transaction', `${UNIFIED_HEADER}\n${shortRow}\n`),
    (error) =>
      error instanceof ImportValidationError &&
      error.code === 'inconsistent_row_width' &&
      error.details?.expectedFieldCount === 16 &&
      error.details?.actualFieldCount === 15
  );
});

test('rejects malformed quoted CSV', () => {
  assert.throws(
    () => validateImportText('unified_transaction', 'Date/Time,Type,Total\n"2026-06-01,Order,10\n'),
    (error) => error instanceof ImportValidationError && error.code === 'malformed_csv'
  );
});
