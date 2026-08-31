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

  const currentBidUses = suggestionSource.match(/currentBid:x\.bid/g) || [];
  assert.equal(currentBidUses.length, 2, 'both bid recommendation lanes must use the imported bid directly');
});
