import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../growth-workspaces.js');
const growth = globalThis.KeywordOSGrowthTest;

test('Listing Keyword Bank keeps legacy rows readable and preserves linked Library metadata', () => {
  const rows = growth.normalizeListingKeywordBank([
    'reading glasses',
    { keyword:'blue light readers', id:'kw_blue', source:'Keyword Library', sources:['ads','sqp'], addedAt:'2026-09-03T00:00:00Z', favorite:true, status:'Review' }
  ]);
  assert.equal(rows[0].keyword,'reading glasses');
  assert.equal(rows[0].source,'Keyword Lab');
  assert.equal(rows[1].assetId,'kw_blue');
  assert.deepEqual(rows[1].sources,['ads','sqp']);
  assert.equal(rows[1].favorite,true);
  assert.equal(rows[1].status,'Review');
});

test('duplicate Listing intake refreshes Library metadata without duplicating the keyword', () => {
  const merged = growth.mergeListingKeywordBank(
    [{ keyword:'reading glasses', source:'Keyword Lab', addedAt:'2026-09-01T00:00:00Z' }],
    [{ id:'kw_readers', keyword:'Reading Glasses', sources:['ads','sqp'], favorite:true, deletedAt:'', status:'Active' }],
    { source:'Keyword Library', addedAt:'2026-09-03T00:00:00Z' }
  );
  assert.equal(merged.bank.length,1);
  assert.equal(merged.added.length,0);
  assert.equal(merged.updated.length,1);
  assert.equal(merged.bank[0].assetId,'kw_readers');
  assert.equal(merged.bank[0].source,'Keyword Library');
  assert.deepEqual(merged.bank[0].sources,['Keyword Lab','ads','sqp']);
  assert.equal(merged.bank[0].favorite,true);
});

test('Listing placement is exact phrase presence across Title Bullets Description and Backend', () => {
  const fields={title:'Reading glasses for women',bullets:'Blue light readers for office',description:'Lightweight TR frame reading glasses',searchTerms:'computer readers spring hinge'};
  assert.equal(growth.listingKeywordPlacement(fields,'reading glasses').label,'Title · Description');
  assert.equal(growth.listingKeywordPlacement(fields,'blue light readers').label,'Bullets');
  assert.equal(growth.listingKeywordPlacement(fields,'computer readers').label,'Backend');
  assert.equal(growth.listingKeywordPlacement(fields,'glasses reading').label,'Unplaced');
});

test('Listing Keyword Bank joins current Library favorite delete status sources and live placement', () => {
  const bank=[{ keyword:'reading glasses', assetId:'kw_a', source:'Keyword Library', sources:['ads'], addedAt:'2026-09-01T00:00:00Z', favorite:true }];
  const assets=[{ id:'kw_a', keyword:'Reading Glasses', sources:['ads','sqp'], favorite:false, deletedAt:'2026-09-03T01:00:00Z', status:'Archived' }];
  const rows=growth.listingKeywordBankRows(bank,assets,{title:'Reading glasses for women',bullets:'',description:'',searchTerms:''});
  assert.equal(rows.length,1);
  assert.equal(rows[0].favorite,false);
  assert.equal(rows[0].deletedAt,'2026-09-03T01:00:00Z');
  assert.equal(rows[0].libraryState,'Recycle Bin');
  assert.deepEqual(rows[0].sources,['ads','sqp']);
  assert.equal(rows[0].placement.label,'Title');
});

test('Keyword Library and Listing Optimizer are wired to one traceable bank without automatic copy mutation', async () => {
  const [app,workspace,readme]=await Promise.all([
    readFile(new URL('../app.js',import.meta.url),'utf8'),
    readFile(new URL('../growth-workspaces.js',import.meta.url),'utf8'),
    readFile(new URL('../README.md',import.meta.url),'utf8')
  ]);
  assert.match(app,/id="kw-listing-selected">Send to Listing/);
  assert.match(app,/stageListingKeywords\(assets,'Keyword Library'\)/);
  assert.match(app,/\['listingPlacement','Listing placement'\]/);
  assert.match(app,/keywordAssets\(\)\{return keywordAssetRows\(\);\}/);
  assert.match(workspace,/<h3>Listing Keyword Bank<\/h3>/);
  assert.match(workspace,/Library state','Sources','Favorite','Placement'/);
  assert.match(workspace,/never edits Title, Bullets, Description or Backend Search Terms automatically/);
  assert.match(readme,/- \[x\] 串联 Keyword Library → Listing Keyword Bank → Title\/Bullets\/Description\/Backend/);
});
