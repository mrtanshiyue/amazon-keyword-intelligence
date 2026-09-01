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
