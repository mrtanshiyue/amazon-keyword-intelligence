import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../growth-workspaces.js');
const growth=globalThis.KeywordOSGrowthTest;

test('phrase occurrence counts use exact contiguous token boundaries',()=>{
  assert.equal(growth.phraseOccurrenceCount('Reading glasses, reading glasses for women','reading glasses'),2);
  assert.equal(growth.phraseOccurrenceCount('readers and eyeglasses','reading glasses'),0);
  assert.equal(growth.phraseOccurrenceCount('rack shoe','shoe rack'),0);
});

test('Listing usage matrix counts phrase and root uses by real draft field and exposes unused roots',()=>{
  const matrix=growth.listingUsageMatrix({title:'Reading glasses for women',bullets:'Lightweight glasses glasses',description:'',searchTerms:'women readers'},['reading glasses','blue light readers']);
  const phrase=matrix.phrases.find(row=>row.keyword==='reading glasses');
  assert.equal(phrase.counts.title,1);
  assert.equal(phrase.total,1);
  const glasses=matrix.roots.find(row=>row.root==='glasses');
  assert.equal(glasses.counts.title,1);
  assert.equal(glasses.counts.bullets,2);
  assert.deepEqual(matrix.unusedRoots.map(row=>row.root).sort(),['blue','light']);
  const title=matrix.fieldCoverage.find(row=>row.field==='title');
  assert.equal(title.phraseTerms,1);
  assert.equal(title.rootUses,2);
});

test('competitor placement comparison uses latest imported Title snapshots only and exact Bank phrases',()=>{
  const rows=growth.listingCompetitorPlacementComparison(
    {title:'Reading glasses',bullets:'',description:'',searchTerms:''},
    ['reading glasses','computer glasses','readers for women'],
    [
      {asin:'B1',date:'2026-08-01',title:'Old computer glasses'},
      {asin:'B1',date:'2026-09-01',title:'Blue light reading glasses'},
      {asin:'B2',date:'2026-09-01',title:'Readers for women',description:'computer glasses'}
    ]
  );
  assert.equal(rows.find(row=>row.keyword==='reading glasses').comparison,'Local + competitor title');
  assert.deepEqual(rows.find(row=>row.keyword==='reading glasses').matches.map(row=>row.asin),['B1']);
  assert.equal(rows.find(row=>row.keyword==='readers for women').comparison,'Competitor title only');
  assert.equal(rows.find(row=>row.keyword==='computer glasses').competitorTitleMatches,0);
});

test('Listing runtime exposes phrase root field-count and imported-title comparison workspaces without copy inference',async()=>{
  const source=await readFile(new URL('../growth-workspaces.js',import.meta.url),'utf8');
  assert.match(source,/Phrase usage matrix/);
  assert.match(source,/Root usage matrix/);
  assert.match(source,/Field coverage counts/);
  assert.match(source,/Unused roots/);
  assert.match(source,/Imported competitor placement comparison/);
  assert.match(source,/latest imported competitor Title snapshot only/);
  assert.match(source,/Competitor descriptions, reviews, reverse-ASIN evidence and external copy are not inferred or compared/);
});
