import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('startup restore validates persisted Ads and Unified rows before activating them', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.ok(source.includes('window.KeywordOSPersistedDatasetGuard'));
  assert.ok(source.includes("validateDatasetRows?.('ads',ads.rows)"));
  assert.ok(source.includes("validateDatasetRows?.('finance',finance.rows)"));
  assert.ok(source.includes('KeywordOS persisted Ads dataset rejected'));
  assert.ok(source.includes('KeywordOS persisted Unified dataset rejected'));
});
