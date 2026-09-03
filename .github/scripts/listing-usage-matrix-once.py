from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path)
    text=p.read_text()
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    p.write_text(text.replace(old,new,1))

p=Path('growth-workspaces.js')
text=p.read_text()
anchor='async function stageListingKeywords(values,source=\'Keyword Lab\')'
if text.count(anchor)!=1:
    raise SystemExit(f'listing stage anchor expected once, found {text.count(anchor)}')
helpers=r'''const LISTING_USAGE_FIELDS=[['title','Title'],['bullets','Bullets'],['description','Description'],['searchTerms','Backend']];
function phraseOccurrenceCount(text,phrase){const hay=normalizedTokens(text),needle=normalizedTokens(phrase);if(!needle.length||needle.length>hay.length)return 0;let count=0;for(let index=0;index<=hay.length-needle.length;index++){let match=true;for(let offset=0;offset<needle.length;offset++)if(hay[index+offset]!==needle[offset]){match=false;break}if(match)count++}return count}
function listingUsageMatrix(fields,keywords=[]){const seen=new Set(),phrases=[],rootMap=new Map();for(const raw of Array.isArray(keywords)?keywords:[]){const keyword=String(raw&&typeof raw==='object'?(raw.keyword||raw.name||''):raw||'').trim().replace(/\s+/g,' '),key=normalizedTokens(keyword).join(' ');if(!key||seen.has(key))continue;seen.add(key);const counts=Object.fromEntries(LISTING_USAGE_FIELDS.map(([field])=>[field,phraseOccurrenceCount(fields?.[field]||'',keyword)])),total=Object.values(counts).reduce((sum,value)=>sum+value,0),placements=LISTING_USAGE_FIELDS.filter(([field])=>counts[field]>0).map(([,label])=>label);phrases.push({keyword,counts,total,placements,status:total?'Used':'Unused'});for(const root of new Set(normalizedTokens(keyword))){const current=rootMap.get(root)||{root,keywords:[]};if(!current.keywords.some(value=>normalizedTokens(value).join(' ')===key))current.keywords.push(keyword);rootMap.set(root,current)}}const roots=[...rootMap.values()].map(item=>{const counts=Object.fromEntries(LISTING_USAGE_FIELDS.map(([field])=>[field,phraseOccurrenceCount(fields?.[field]||'',item.root)])),total=Object.values(counts).reduce((sum,value)=>sum+value,0);return{...item,counts,total,status:total?'Used':'Unused'}}).sort((a,b)=>b.total-a.total||a.root.localeCompare(b.root));const fieldCoverage=LISTING_USAGE_FIELDS.map(([field,label])=>({field,label,phraseTerms:phrases.filter(item=>item.counts[field]>0).length,phraseUses:phrases.reduce((sum,item)=>sum+item.counts[field],0),rootTerms:roots.filter(item=>item.counts[field]>0).length,rootUses:roots.reduce((sum,item)=>sum+item.counts[field],0)}));return{phrases,roots,unusedRoots:roots.filter(item=>!item.total),fieldCoverage}}
function listingCompetitorPlacementComparison(fields,keywords=[],competitors=[]){const latest=latestCompetitors(Array.isArray(competitors)?competitors:[]),matrix=listingUsageMatrix(fields,keywords);return matrix.phrases.map(item=>{const localFields=LISTING_USAGE_FIELDS.filter(([field])=>item.counts[field]>0).map(([,label])=>label),matches=latest.filter(row=>row?.title&&phraseOccurrenceCount(row.title,item.keyword)>0).map(row=>({asin:String(row.asin||''),date:String(row.date||''),title:String(row.title||''),uses:phraseOccurrenceCount(row.title,item.keyword)})),competitorTitleUses=matches.reduce((sum,row)=>sum+row.uses,0),comparison=item.total&&matches.length?'Local + competitor title':item.total?'Local only':matches.length?'Competitor title only':'Not observed';return{keyword:item.keyword,localFields,localUses:item.total,competitorTitleMatches:matches.length,competitorTitleUses,matches,comparison}})}
'''
p.write_text(text.replace(anchor,helpers+anchor,1))

old="repeated=quality.repeated.slice(0,12),fieldStats=Object.entries(fields).map(([field])=>({field,phrases:coverage.filter(item=>item.byField[field].phrase).length,roots:coverage.filter(item=>item.byField[field].roots.length)})),suggestions=listingPlacementSuggestions(fields,evidence,draft.brandTerms),competitorGaps=competitorListingGaps(fields,latestCompetitors(load('competitor')));return"
new="repeated=quality.repeated.slice(0,12),activeBankKeywords=intake.filter(item=>!item.deletedAt).map(item=>item.keyword),usage=listingUsageMatrix(fields,activeBankKeywords),suggestions=listingPlacementSuggestions(fields,evidence,draft.brandTerms),competitorPlacement=listingCompetitorPlacementComparison(fields,activeBankKeywords,load('competitor'));return"
replace_once('growth-workspaces.js',old,new,'render listing analysis variables')

old_ui="<h3>Field coverage</h3>${table(['Field','Exact phrases','Terms with roots'],fieldStats.map(item=>`<tr><td>${esc(item.field)}</td><td>${integer(item.phrases)}</td><td>${integer(item.roots)}</td></tr>`))}<h3>High-value unused evidence</h3>"
new_ui="<h3>Phrase usage matrix</h3>${usage.phrases.length?table(['Bank phrase','Title','Bullets','Description','Backend','Total','Status'],usage.phrases.slice(0,100).map(item=>`<tr><td class=\"left\"><b>${esc(item.keyword)}</b></td><td>${integer(item.counts.title)}</td><td>${integer(item.counts.bullets)}</td><td>${integer(item.counts.description)}</td><td>${integer(item.counts.searchTerms)}</td><td>${integer(item.total)}</td><td><span class=\"badge ${item.total?'green':'amber'}\">${item.total?'Used':'Unused'}</span></td></tr>`)):'<div class=\"growth-chips\"><span>Add active Keyword Bank terms to build the phrase matrix</span></div>'}<small>Counts are exact contiguous token-sequence occurrences in the current local draft; Recycle Bin assets are excluded from this analysis.</small><h3>Root usage matrix</h3>${usage.roots.length?table(['Root','Title','Bullets','Description','Backend','Total','Bank phrases'],usage.roots.slice(0,100).map(item=>`<tr><td class=\"left\"><b>${esc(item.root)}</b></td><td>${integer(item.counts.title)}</td><td>${integer(item.counts.bullets)}</td><td>${integer(item.counts.description)}</td><td>${integer(item.counts.searchTerms)}</td><td>${integer(item.total)}</td><td class=\"left\">${esc(item.keywords.join(' · '))}</td></tr>`)):'<div class=\"growth-chips\"><span>No Bank roots available</span></div>'}<small>Roots are literal tokens from Bank phrases only. No stemming, synonym expansion or language inference is applied.</small><h3>Field coverage counts</h3>${table(['Field','Phrase terms covered','Phrase uses','Root terms covered','Root uses'],usage.fieldCoverage.map(item=>`<tr><td>${esc(item.label)}</td><td>${integer(item.phraseTerms)}</td><td>${integer(item.phraseUses)}</td><td>${integer(item.rootTerms)}</td><td>${integer(item.rootUses)}</td></tr>`))}<h3>Unused roots</h3><div class=\"growth-chips\">${usage.unusedRoots.slice(0,60).map(item=>`<span>${esc(item.root)} · ${integer(item.keywords.length)} bank phrase${item.keywords.length===1?'':'s'}</span>`).join('')||'<span>No unused roots in active Bank phrases</span>'}</div><h3>High-value unused evidence</h3>"
replace_once('growth-workspaces.js',old_ui,new_ui,'listing usage matrix UI')

old_comp="<h3>Imported competitor title phrase gaps</h3>${competitorGaps.length?table(['ASIN','Imported title','Phrases absent from local draft'],competitorGaps.slice(0,20).map(item=>`<tr><td>${esc(item.asin)}</td><td class=\"left\">${esc(item.title)}</td><td class=\"left\">${esc(item.phrases.slice(0,12).join(' · '))}</td></tr>`)):'<div class=\"growth-chips\"><span>Import competitor title snapshots to compare text</span></div>'}"
new_comp="<h3>Imported competitor placement comparison</h3>${competitorPlacement.length?table(['Bank phrase','Local placement','Local uses','Competitor title matches','Imported ASINs','Comparison'],competitorPlacement.slice(0,100).map(item=>`<tr><td class=\"left\"><b>${esc(item.keyword)}</b></td><td class=\"left\">${esc(item.localFields.join(' · ')||'Unplaced')}</td><td>${integer(item.localUses)}</td><td>${integer(item.competitorTitleMatches)} ASIN${item.competitorTitleMatches===1?'':'s'} · ${integer(item.competitorTitleUses)} use${item.competitorTitleUses===1?'':'s'}</td><td class=\"left\">${esc(item.matches.map(match=>`${match.asin}${match.date?` · ${match.date}`:''}`).join(' | ')||'—')}</td><td><span class=\"badge ${item.comparison==='Local + competitor title'?'green':item.comparison==='Competitor title only'?'amber':'gray'}\">${esc(item.comparison)}</span></td></tr>`)):'<div class=\"growth-chips\"><span>Add active Keyword Bank terms to compare placement</span></div>'}<small>Competitor placement uses exact Bank phrases against each ASIN's latest imported competitor Title snapshot only. Competitor descriptions, reviews, reverse-ASIN evidence and external copy are not inferred or compared.</small>"
replace_once('growth-workspaces.js',old_comp,new_comp,'competitor placement UI')

replace_once('growth-workspaces.js','listingPlacementSuggestions,normalizeListingKeywordBank,mergeListingKeywordBank,listingKeywordPlacement,listingKeywordBankRows,stageListingKeywords,competitorListingGaps','listingPlacementSuggestions,normalizeListingKeywordBank,mergeListingKeywordBank,listingKeywordPlacement,listingKeywordBankRows,phraseOccurrenceCount,listingUsageMatrix,listingCompetitorPlacementComparison,stageListingKeywords,competitorListingGaps','growth exports listing matrix')

Path('tests/listing-usage-matrix.test.mjs').write_text(r'''import test from 'node:test';
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
  assert.deepEqual(matrix.unusedRoots.map(row=>row.root).sort(),['blue']);
  const title=matrix.fieldCoverage.find(row=>row.field==='title');
  assert.equal(title.phraseTerms,1);
  assert.equal(title.rootUses,3);
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
''')

readme=Path('README.md')
text=readme.read_text()
old='- [ ] Listing 增加词根/短语使用矩阵、字段覆盖次数、未使用词根和仅基于导入竞品文案的 placement comparison。'
new='''- [x] Listing 增加词根/短语使用矩阵、字段覆盖次数、未使用词根和仅基于导入竞品文案的 placement comparison。\n  - 2026-09-03：Listing Optimizer 继续复用现有 `listing.keywordBank` 与本地四字段 draft，没有新增分析数据源或持久化键。新增 `phraseOccurrenceCount()` / `listingUsageMatrix()`：对 active Bank phrase 使用完整 token-boundary contiguous sequence 计数，并把每个 Bank phrase 的原始 token 作为 literal roots；Phrase / Root 两套矩阵分别显示 Title、Bullets、Description、Backend 的真实出现次数与 Total，Field coverage 同时汇总“覆盖了多少 phrase/root term”和“实际出现多少次”，Unused roots 只列当前四字段中 0 次出现的 Bank roots；Recycle Bin asset 不进入该优化矩阵，且不做 stemming、同义词扩展或语言推断。新增 `listingCompetitorPlacementComparison()`：只对每个 ASIN 最新一条真实导入的 competitor **Title** snapshot 与 active Bank phrase 做 exact phrase comparison，显示 Local placement / uses、Competitor title matches / uses、ASIN + snapshot date 以及 `Local only / Competitor title only / Local + competitor title / Not observed`；不会把 competitor description、reviews、reverse-ASIN 或外部文案当作 placement evidence。现有 `competitorListingGaps()` 保留兼容，但 Listing UI 已改用可追溯 placement comparison。CI 为 **__TEST_COUNT__ passed / 0 failed**；`npm run build` 验证 **__JS_COUNT__ 个 JS + 9 个 CSS，__PUBLISH_COUNT__ 个发布文件**，source/dist byte identity 与 committed-dist parity gate 全部通过。'''
if text.count(old)!=1:
    raise SystemExit(f'README listing usage item expected once, found {text.count(old)}')
readme.write_text(text.replace(old,new,1))
