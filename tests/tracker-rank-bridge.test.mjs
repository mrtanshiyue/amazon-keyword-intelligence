import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Tracker keeps imported rank snapshots ASIN-specific', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(source, /function trackerRankSnapshots\(term\)/);
  assert.match(source, /if\(rows\.length>1\).*ASINs/);
  assert.match(source, /Organic Rank Snapshots/);
  assert.doesNotMatch(source, /class="locked">Not connected<\/td><td class="locked">Not connected/);
});
