import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ImportValidationError,
  validateImportBody,
  validateImportText,
} from '../src/import-validation.js';

test('validates the authoritative Amazon Ads sample', async () => {
  const body = await readFile(new URL('../sample-data/202606.csv', import.meta.url));
  const result = await validateImportBody('amazon_ads', body);

  assert.equal(result.reportType, 'Amazon Ads Search Term Performance');
  assert.equal(result.rowCount, 8753);
  assert.equal(result.fieldCount, 45);
  assert.equal(result.byteSize, body.byteLength);
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
  assert.match(result.contentSha256, /^[0-9a-f]{64}$/);
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

test('rejects malformed quoted CSV', () => {
  assert.throws(
    () => validateImportText('unified_transaction', 'Date/Time,Type,Total\n"2026-06-01,Order,10\n'),
    (error) => error instanceof ImportValidationError && error.code === 'malformed_csv'
  );
});
