import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../keyword-lab-view.js');
await import('../growth-workspaces.js');
const view = globalThis.KeywordOSKeywordLabViewTest;
const growth = globalThis.KeywordOSGrowthTest;

test('Keyword Lab bulk selection is exact, ordered and case-insensitive deduplicated', () => {
  assert.deepEqual(view.normalizeKeywordSelection([' Reading Glasses ', 'reading glasses', '', 'Blue Light Readers']), ['Reading Glasses', 'Blue Light Readers']);
});

test('Listing intake merges Keyword Lab keywords without editing listing text fields', () => {
  const merged = growth.mergeListingKeywordBank(
    [{ keyword: 'reading glasses', source: 'Keyword Library', addedAt: '2026-09-01T00:00:00Z' }],
    ['Reading Glasses', 'blue light readers'],
    { source: 'Keyword Lab', addedAt: '2026-09-03T00:00:00Z' }
  );
  assert.equal(merged.added.length, 1);
  assert.deepEqual(merged.bank.map(item => item.keyword), ['reading glasses', 'blue light readers']);
  assert.equal(merged.bank[1].source, 'Keyword Lab');
});

test('unified bulk actions reuse Store state contracts and keep rank snapshots import-driven', async () => {
  const [app, viewSource, growthSource, readme] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../keyword-lab-view.js', import.meta.url), 'utf8'),
    readFile(new URL('../growth-workspaces.js', import.meta.url), 'utf8'),
    readFile(new URL('../README.md', import.meta.url), 'utf8')
  ]);
  assert.match(app, /stageKeywordAssets,trackKeywords,stageNegativeCandidates/);
  assert.match(app, /negativeConflict\(keyword,getRangeRows\(\)\)/);
  for (const label of ['Add to List','Track Snapshot','Negative Candidate','Send to Listing','⇩ Export']) assert.match(viewSource, new RegExp(label));
  assert.match(viewSource, /rank snapshot values remain imported evidence only/i);
  assert.match(growthSource, /planning bank only/);
  assert.match(growthSource, /never edits Title, Bullets, Description or Backend Search Terms automatically/);
  assert.match(readme, /- \[x\] 统一批量动作：Add to List、Track Snapshot、Negative Candidate、Send to Listing、Export。/);
});
