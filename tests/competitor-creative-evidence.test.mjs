import test from 'node:test';
import assert from 'node:assert/strict';

await import('../competitor-creative-evidence.js');
const creative=globalThis.KeywordOSCompetitorCreativeEvidenceTest;

test('normalizes manual evidence and deduplicates explicit labels without inference',()=>{
  const row=creative.normalizeEvidence({date:'2026/09/02',asin:'b0abc12345',slot:'Main',imageReference:'capture-main.png',visualTags:'White background | white background | Female model',sellingPoints:'Spring hinge\nBlue light | spring hinge',sourceNote:'manual observation'});
  assert.equal(row.date,'2026-09-02');
  assert.equal(row.asin,'B0ABC12345');
  assert.equal(row.visualTags,'White background | Female model');
  assert.equal(row.sellingPoints,'Spring hinge | Blue light');
});

test('rejects incomplete evidence instead of inventing image content',()=>{
  assert.throws(()=>creative.normalizeEvidence({date:'2026-09-02',asin:'B0ABC12345',slot:'Main'}),/image reference/i);
  assert.throws(()=>creative.normalizeEvidence({date:'2026-09-02',asin:'bad',slot:'Main',imageReference:'x'}),/10-character ASIN/i);
});

test('same ASIN date and slot is a correction that replaces the prior capture',()=>{
  const first={date:'2026-09-01',asin:'B0ABC12345',slot:'Main',imageReference:'old.png',visualTags:'white background'};
  const correction={date:'2026-09-01',asin:'B0ABC12345',slot:'Main',imageReference:'new.png',visualTags:'white background | product only'};
  const rows=creative.mergeRows([first],[correction]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].imageReference,'new.png');
  assert.match(rows[0].visualTags,/product only/);
});

test('latest evidence is selected independently per image slot',()=>{
  const rows=creative.latestPerAsinSlot([
    {date:'2026-08-01',asin:'B0ABC12345',slot:'Main',imageReference:'m1'},
    {date:'2026-09-01',asin:'B0ABC12345',slot:'Main',imageReference:'m2'},
    {date:'2026-08-15',asin:'B0ABC12345',slot:'Image 2',imageReference:'i2'}
  ]);
  assert.equal(rows.length,2);
  assert.equal(rows.find(row=>row.slot==='Main').imageReference,'m2');
  assert.equal(rows.find(row=>row.slot==='Image 2').date,'2026-08-15');
});

test('comparison uses exact explicit tag and selling-point sets only',()=>{
  const rows=[
    {date:'2026-09-01',asin:'B0AAA11111',slot:'Main',imageReference:'a-main',visualTags:'White background | Female model',sellingPoints:'Spring hinge | Lightweight'},
    {date:'2026-09-01',asin:'B0AAA11111',slot:'Image 2',imageReference:'a-2',visualTags:'Dimension diagram',sellingPoints:'Frame size'},
    {date:'2026-09-02',asin:'B0BBB22222',slot:'Main',imageReference:'b-main',visualTags:'white background | Lifestyle',sellingPoints:'spring hinge | Blue light'},
    {date:'2026-09-02',asin:'B0BBB22222',slot:'Image 3',imageReference:'b-3',visualTags:'Dimension Diagram',sellingPoints:'UV protection'}
  ];
  const result=creative.compareEvidence(rows,'B0AAA11111','B0BBB22222');
  assert.equal(result.available,true);
  assert.deepEqual(result.slots.shared,['Main']);
  assert.deepEqual(result.slots.onlyA,['Image 2']);
  assert.deepEqual(result.slots.onlyB,['Image 3']);
  assert.deepEqual(result.visualTags.shared,['Dimension diagram','White background']);
  assert.deepEqual(result.sellingPoints.shared,['Spring hinge']);
  assert.deepEqual(result.sellingPoints.onlyA,['Frame size','Lightweight']);
  assert.deepEqual(result.sellingPoints.onlyB,['Blue light','UV protection']);
});