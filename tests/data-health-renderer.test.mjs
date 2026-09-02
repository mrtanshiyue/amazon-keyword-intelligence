import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Data Health keeps one complete provenance renderer', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const definitions = source.match(/function renderDataHealth\(/g) || [];

  assert.equal(definitions.length, 1);
  assert.match(source, /Dataset \/ Store/);
  assert.match(source, /Imported/);
  assert.match(source, /Schema/);
});

test('Data Health recency is wired to the UI state bridge instead of rendered coverage labels', async () => {
  const source = await readFile(new URL('../data-recency-actions.js', import.meta.url), 'utf8');

  assert.match(source, /recencyModel\(window\.KeywordOSUIBridge\)/);
  assert.match(source, /Amazon Ads/);
  assert.match(source, /Unified Transaction/);
  assert.doesNotMatch(source, /schema-list/);
  assert.doesNotMatch(source, /Ads date coverage|Finance date coverage/);
  assert.doesNotMatch(source, /coverageCell\.textContent/);
});
