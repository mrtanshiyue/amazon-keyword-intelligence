import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = appSource.indexOf('function suggestionData(){');
const end = appSource.indexOf('function suggestionDatasetKey(){', start);
const suggestionSource = appSource.slice(start, end);

test('bid suggestions require a real imported target bid', () => {
  assert.notEqual(start, -1, 'suggestionData() should exist');
  assert.notEqual(end, -1, 'suggestionData() boundary should exist');

  assert.doesNotMatch(suggestionSource, /x\.bid\s*\|\|\s*\.65/);
  assert.doesNotMatch(suggestionSource, /x\.bid\s*\|\|\s*\.6/);

  const eligibilityChecks = suggestionSource.match(/Number\.isFinite\(x\.bid\)&&x\.bid>0/g) || [];
  assert.equal(eligibilityChecks.length, 2, 'both bid recommendation lanes must require a real positive bid');

  const observedBidUses = suggestionSource.match(/observedBid:x\.bid/g) || [];
  assert.equal(observedBidUses.length, 2, 'both bid recommendation lanes must label the report-period bid as observed');
  assert.match(suggestionSource, /x\.orders>0&&x\.sales>0&&x\.acos<=state\.settings\.targetAcos\/100\?1\.08:\.88/);
});
