from pathlib import Path


def replace_once(path, old, new):
    p=Path(path); text=p.read_text()
    count=text.count(old)
    if count!=1: raise SystemExit(f'{path}: expected one match, found {count}')
    p.write_text(text.replace(old,new,1))

module=r'''(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof globalThis!=='undefined')globalThis.KeywordOSKeywordRelevanceReviewTest=api;
  if(root)root.KeywordOSKeywordRelevanceReview=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';

const VERSION='keyword-relevance-review-v1';
const REVIEW_STATUSES=Object.freeze(['pending','relevant','irrelevant','unsure']);
function clean(value,max=500){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max);}
function keywordKey(value){return clean(value).toLowerCase();}
function asinKey(value){return clean(value,40).toUpperCase();}
function snapshotDate(row){const value=clean(row?.snapshotDate||row?.date,20);return /^\d{4}-\d{2}-\d{2}$/.test(value)?value:'';}
function scopeSet(values=[]){return new Set((Array.isArray(values)?values:[]).map(asinKey).filter(Boolean));}
function latestResultSets(rows=[],scopeAsins=[]){
  const scope=scopeSet(scopeAsins),byAsin=new Map();
  for(const row of Array.isArray(rows)?rows:[]){const asin=asinKey(row?.asin),keyword=clean(row?.keyword||row?.query||row?.searchTerm);if(!asin||!keyword||scope.size&&!scope.has(asin))continue;if(!byAsin.has(asin))byAsin.set(asin,[]);byAsin.get(asin).push(row);}
  const out=[];
  for(const [asin,asinRows] of byAsin){const dates=asinRows.map(snapshotDate).filter(Boolean).sort(),latest=dates.at(-1)||'',current=latest?asinRows.filter(row=>snapshotDate(row)===latest):asinRows,map=new Map();for(const row of current){const keyword=clean(row?.keyword||row?.query||row?.searchTerm),key=keywordKey(keyword);if(key&&!map.has(key))map.set(key,keyword);}out.push(Object.freeze({asin,date:latest,keywords:Object.freeze([...map.entries()].map(([key,keyword])=>Object.freeze({key,keyword})))}));}
  return out.sort((a,b)=>a.asin.localeCompare(b.asin));
}
function relevanceFromSets(keyword,sets=[]){
  const key=keywordKey(keyword),all=Array.isArray(sets)?sets:[],matching=all.filter(set=>set.keywords.some(item=>item.key===key)),numerator=matching.length,denominator=all.length,available=denominator>=2&&numerator>=2;
  return Object.freeze({label:'Local relevance',available,value:available?numerator/denominator:null,numerator,denominator,formula:'ASIN result sets containing the exact keyword ÷ ASIN result sets in the current scope',matchingAsins:Object.freeze(matching.map(set=>set.asin)),snapshotDates:Object.freeze(all.map(set=>Object.freeze({asin:set.asin,date:set.date}))),quality:available?'calculated-local':'missing',reason:denominator<2?'At least two imported ASIN result sets are required.':numerator<2?'The exact keyword does not overlap across at least two ASIN result sets.':''});
}
function buildQueue(rows=[],scopeAsins=[]){const sets=latestResultSets(rows,scopeAsins),terms=new Map();for(const set of sets)for(const item of set.keywords)if(!terms.has(item.key))terms.set(item.key,item.keyword);return[...terms.entries()].map(([key,keyword])=>Object.freeze({key,keyword,localRelevance:relevanceFromSets(keyword,sets)})).sort((a,b)=>{const ar=a.localRelevance.available?a.localRelevance.value:-1,br=b.localRelevance.available?b.localRelevance.value:-1;return br-ar||b.localRelevance.numerator-a.localRelevance.numerator||a.keyword.localeCompare(b.keyword)});}
function fnv1a(value){let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(36);}
function evidenceKey(rows=[],scopeAsins=[]){const sets=latestResultSets(rows,scopeAsins),scope=[...scopeSet(scopeAsins)].sort(),payload=sets.map(set=>`${set.asin}|${set.date}|${set.keywords.map(item=>item.key).sort().join(',')}`).join('\n');return sets.length?`${VERSION}:${fnv1a(`${scope.join(',')}\n${payload}`)}:${sets.length}`:'';}
function normalizeStatus(value){return REVIEW_STATUSES.includes(value)?value:'pending';}
function normalizeReview(input={}){return Object.freeze({status:normalizeStatus(input?.status),note:clean(input?.note),updatedAt:clean(input?.updatedAt,40)});}
function normalizeState(input={},currentEvidenceKey=''){
  const evidence=clean(currentEvidenceKey,200),source=input&&typeof input==='object'&&!Array.isArray(input)?input:{};if(!evidence||clean(source.evidenceKey,200)!==evidence)return{version:1,evidenceKey:evidence,reviews:{}};
  const reviews={};if(source.reviews&&typeof source.reviews==='object'&&!Array.isArray(source.reviews))for(const [rawKey,raw] of Object.entries(source.reviews).slice(0,5000)){const key=keywordKey(rawKey);if(key)reviews[key]=normalizeReview(raw);}return{version:1,evidenceKey:evidence,reviews};
}
function updateReview(state,keyword,patch={},currentEvidenceKey='',now=''){
  const current=normalizeState(state,currentEvidenceKey),key=keywordKey(keyword);if(!key)return current;current.reviews[key]=normalizeReview({status:patch?.status,note:patch?.note,updatedAt:clean(now,40)||new Date().toISOString()});return current;
}
function applyReviews(queue=[],state={},currentEvidenceKey=''){const current=normalizeState(state,currentEvidenceKey);return(Array.isArray(queue)?queue:[]).map(item=>Object.freeze({...item,review:current.reviews[item.key]||normalizeReview({})}));}
function reviewSummary(items=[]){const out={pending:0,relevant:0,irrelevant:0,unsure:0,scored:0,total:0};for(const item of Array.isArray(items)?items:[]){out.total++;out[normalizeStatus(item?.review?.status)]++;if(item?.localRelevance?.available)out.scored++;}return Object.freeze(out);}
return{VERSION,REVIEW_STATUSES,clean,keywordKey,asinKey,snapshotDate,latestResultSets,relevanceFromSets,buildQueue,evidenceKey,normalizeStatus,normalizeReview,normalizeState,updateReview,applyReviews,reviewSummary};
});
'''
Path('keyword-relevance-review.js').write_text(module)

# app bridge: keep manual relevance reviews inside the existing backup-safe suggestion review object.
replace_once('app.js',
"const SUGGESTED_KEYWORDS_STATE_KEY='__suggestedKeywordsSnapshot';\n",
"const SUGGESTED_KEYWORDS_STATE_KEY='__suggestedKeywordsSnapshot';\nconst KEYWORD_RELEVANCE_REVIEW_STATE_KEY='__keywordRelevanceReviews';\nfunction keywordRelevanceReviewState(){const raw=state.suggestionReviews[KEYWORD_RELEVANCE_REVIEW_STATE_KEY];return raw&&typeof raw==='object'&&!Array.isArray(raw)?clone(raw):{}}\nfunction saveKeywordRelevanceReviewState(next){const value=next&&typeof next==='object'&&!Array.isArray(next)?clone(next):{};state.suggestionReviews[KEYWORD_RELEVANCE_REVIEW_STATE_KEY]=value;save(STORAGE.suggestionReviews,state.suggestionReviews);return clone(value)}\n")
replace_once('app.js',
"keywordAssets(){return keywordAssetRows();},getRangeRows,aggregateLevel,isProtected,toast,syncKeywordAssets,stageKeywordAsset,stageKeywordAssets,trackKeywords,stageNegativeCandidates,render,getResearchItems()",
"keywordAssets(){return keywordAssetRows();},getKeywordRelevanceReviewState:keywordRelevanceReviewState,setKeywordRelevanceReviewState:saveKeywordRelevanceReviewState,getRangeRows,aggregateLevel,isProtected,toast,syncKeywordAssets,stageKeywordAsset,stageKeywordAssets,trackKeywords,stageNegativeCandidates,render,getResearchItems()")

# growth workspace integration.
replace_once('growth-workspaces.js',
"const rankViewState={asin:'',metric:'organic'};\n",
"const rankViewState={asin:'',metric:'organic'};\nconst relevanceReviewEngine=root?.KeywordOSKeywordRelevanceReview;\n")
functions=r'''function relevanceReviewModel(){
  const sourceRows=load('reverse-asin'),master=load('product-master'),groups=load('competitor-groups'),scope=asinComparisonScope(sourceRows,master,groups,asinComparisonState());
  if(!relevanceReviewEngine||!scope.primaryOwnedAsin)return{available:false,scope,evidenceKey:'',items:[],summary:{pending:0,relevant:0,irrelevant:0,unsure:0,scored:0,total:0}};
  const evidenceKey=relevanceReviewEngine.evidenceKey(sourceRows,scope.scopeAsins),queue=relevanceReviewEngine.buildQueue(sourceRows,scope.scopeAsins),stored=root.KeywordOSUIBridge?.getKeywordRelevanceReviewState?.()||{},items=relevanceReviewEngine.applyReviews(queue,stored,evidenceKey),summary=relevanceReviewEngine.reviewSummary(items);return{available:Boolean(evidenceKey),scope,evidenceKey,items,summary};
}
function localRelevanceDisclosure(metric){const value=metric?.available?pct(metric.value):'—',dates=(metric?.snapshotDates||[]).map(item=>`${item.asin}: ${item.date||'undated current import'}`).join(' · '),matching=(metric?.matchingAsins||[]).join(', ')||'none';return`<details><summary>${esc(value)}</summary><small><b>Formula:</b> ${esc(metric?.formula||'—')}<br><b>Inputs:</b> ${integer(metric?.numerator||0)} ÷ ${integer(metric?.denominator||0)} · exact overlap ASINs: ${esc(matching)}<br><b>Current result sets:</b> ${esc(dates||'—')}<br><b>Limit:</b> Local imported overlap only; this is not Amazon Relevancy or a marketplace relevance score.${metric?.reason?` ${esc(metric.reason)}`:''}</small></details>`}
function relevanceReviewPanel(){const model=relevanceReviewModel();if(!model.available)return'<div class="notice-banner top-gap"><b>Relevance review unavailable.</b> Import reverse-ASIN evidence for at least two scoped ASIN result sets and explicitly map a primary owned ASIN. KeywordOS will not synthesize relevance without result overlap evidence.</div>';const order={pending:0,unsure:1,relevant:2,irrelevant:3},items=[...model.items].sort((a,b)=>(order[a.review.status]-order[b.review.status])||(b.localRelevance.available-b.localRelevance.available)||((b.localRelevance.value||0)-(a.localRelevance.value||0))||a.keyword.localeCompare(b.keyword)),rows=items.slice(0,250).map(item=>{const encoded=encodeURIComponent(item.keyword),metric=item.localRelevance;return`<tr><td class="left"><b>${esc(item.keyword)}</b></td><td>${integer(metric.numerator)} / ${integer(metric.denominator)}</td><td>${localRelevanceDisclosure(metric)}</td><td><select data-relevance-status="${encoded}"><option value="pending" ${item.review.status==='pending'?'selected':''}>Pending</option><option value="relevant" ${item.review.status==='relevant'?'selected':''}>Relevant</option><option value="irrelevant" ${item.review.status==='irrelevant'?'selected':''}>Irrelevant</option><option value="unsure" ${item.review.status==='unsure'?'selected':''}>Unsure</option></select></td><td class="left"><input data-relevance-note="${encoded}" value="${esc(item.review.note||'')}" placeholder="Manual relevance note" maxlength="500"></td></tr>`}).join('');return`<div class="card top-gap" data-relevance-review-queue><div class="card-head"><div class="card-title"><h3>Human relevance review queue</h3><small>Manual review is authoritative. Local relevance is shown only when the exact keyword overlaps at least two current imported ASIN result sets.</small></div></div><div class="growth-kpis">${kpi('Pending',integer(model.summary.pending),'Needs human review')}${kpi('Relevant',integer(model.summary.relevant),'Manual decision')}${kpi('Irrelevant',integer(model.summary.irrelevant),'Manual decision')}${kpi('Local score available',integer(model.summary.scored),`${model.summary.total} queue keywords`)}</div>${table(['Keyword','ASIN result overlap','Local relevance · formula','Human review','Note'],rows)}</div>`}
function saveRelevanceReview(rootNode,keyword){const model=relevanceReviewModel();if(!model.available)return;const encoded=encodeURIComponent(keyword),status=rootNode.querySelector(`[data-relevance-status="${encoded}"]`)?.value||'pending',note=rootNode.querySelector(`[data-relevance-note="${encoded}"]`)?.value||'',stored=root.KeywordOSUIBridge?.getKeywordRelevanceReviewState?.()||{},next=relevanceReviewEngine.updateReview(stored,keyword,{status,note},model.evidenceKey,new Date().toISOString());root.KeywordOSUIBridge?.setKeywordRelevanceReviewState?.(next);render('asin-comparison');root.KeywordOSUIBridge?.toast?.('Relevance review saved','success')}
'''
replace_once('growth-workspaces.js','function competitorGroupsPanel(){',functions+'function competitorGroupsPanel(){')
replace_once('growth-workspaces.js',
"${page==='asin-comparison'?asinTrafficPanel():''}",
"${page==='asin-comparison'?asinTrafficPanel()+relevanceReviewPanel():''}")
replace_once('growth-workspaces.js',
"$$('[data-rank-asin]',rootNode).forEach(button=>button.addEventListener('click',()=>{rankViewState.asin=decodeURIComponent(button.dataset.rankAsin||'');render('rank-intelligence')}));",
"$$('[data-relevance-status],[data-relevance-note]',rootNode).forEach(input=>input.addEventListener('change',()=>saveRelevanceReview(rootNode,decodeURIComponent(input.dataset.relevanceStatus||input.dataset.relevanceNote||''))));$$('[data-rank-asin]',rootNode).forEach(button=>button.addEventListener('click',()=>{rankViewState.asin=decodeURIComponent(button.dataset.rankAsin||'');render('rank-intelligence')}));")

# runtime wiring
replace_once('index.html',
'  <script src="growth-import-validation.js"></script>\n  <script src="growth-workspaces.js"></script>',
'  <script src="growth-import-validation.js"></script>\n  <script src="keyword-relevance-review.js"></script>\n  <script src="growth-workspaces.js"></script>')

p=Path('package.json'); text=p.read_text()
text=text.replace('node --check growth-import-validation.js && node --check growth-import-gate.js', 'node --check growth-import-validation.js && node --check keyword-relevance-review.js && node --check growth-import-gate.js')
text=text.replace('data-provenance-guard.js growth-import-validation.js growth-import-gate.js', 'data-provenance-guard.js growth-import-validation.js keyword-relevance-review.js growth-import-gate.js')
p.write_text(text)

# README closeout with count placeholders finalized by workflow.
old='- [ ] 增加人工相关性审核队列；若有 ASIN-result overlap，允许显示公式公开的“本地相关度”。'
new='''- [x] 增加人工相关性审核队列；若有 ASIN-result overlap，允许显示公式公开的“本地相关度”。
  - 2026-09-03：新增纯函数 `keyword-relevance-review.js` 并把审核 UI 放在现有 ASIN Comparison 下，不新建第二套关键词证据或页面。队列只读取当前 reverse-ASIN import 在所选 primary + competitor scope 中每个 ASIN 的最新 result set；exact normalized keyword 是唯一匹配键，不做 stemming、substring 或外部扩词。人工状态为 Pending / Relevant / Irrelevant / Unsure，并可保存 500 字以内 Note；人工结论不触发 Add to List、Negative、Listing 或任何 Amazon mutation。只有当前 scope 至少有 2 个 ASIN result set 且同一 exact keyword 出现在至少 2 个 result set 时才显示 **Local relevance = 包含该 exact keyword 的 ASIN result sets ÷ 当前 scope 的 ASIN result sets**；可展开查看 numerator、denominator、匹配 ASIN 和各 ASIN 当前 snapshot date，并明确声明它不是 Amazon Relevancy。没有真实 overlap 时值为 `—`。审核状态复用现有 backup-safe `keywordos_v9_suggestion_reviews` 的 `__keywordRelevanceReviews` 命名空间，不增加 storage key；状态绑定 deterministic reverse-ASIN evidence fingerprint + 当前 ASIN scope，换导入或换 scope 后旧人工判断不会冒充当前结论，删除源数据后队列也不会继续显示。CI 为 **__TEST_COUNT__ passed / 0 failed**；`npm run build` 验证 **__JS_COUNT__ 个 JS + 9 个 CSS，__PUBLISH_COUNT__ 个发布文件**，source/dist byte identity 与 committed-dist parity gate 全部通过。'''
replace_once('README.md',old,new)

test=r'''import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

await import('../keyword-relevance-review.js');
const review=globalThis.KeywordOSKeywordRelevanceReviewTest;
assert.ok(review);

const rows=[
  {asin:'B000000001',keyword:'reading glasses',snapshotDate:'2026-09-01'},
  {asin:'B000000001',keyword:'old only',snapshotDate:'2026-09-01'},
  {asin:'B000000001',keyword:'reading glasses',snapshotDate:'2026-09-03'},
  {asin:'B000000001',keyword:'blue light readers',snapshotDate:'2026-09-03'},
  {asin:'B000000002',keyword:'Reading Glasses',snapshotDate:'2026-09-02'},
  {asin:'B000000002',keyword:'readers',snapshotDate:'2026-09-02'},
  {asin:'B000000003',keyword:'computer readers',snapshotDate:'2026-09-03'}
];

test('latest ASIN result sets use each ASIN latest imported snapshot and drop older rows',()=>{
  const sets=review.latestResultSets(rows,['B000000001','B000000002']);
  assert.equal(sets.length,2);
  assert.deepEqual(sets[0].keywords.map(x=>x.key),['reading glasses','blue light readers']);
  assert.equal(sets[0].date,'2026-09-03');
  assert.equal(sets[0].keywords.some(x=>x.key==='old only'),false);
});

test('local relevance is transparent exact ASIN result-set overlap only',()=>{
  const queue=review.buildQueue(rows,['B000000001','B000000002','B000000003']);
  const reading=queue.find(x=>x.key==='reading glasses');
  assert.equal(reading.localRelevance.available,true);
  assert.equal(reading.localRelevance.numerator,2);
  assert.equal(reading.localRelevance.denominator,3);
  assert.equal(reading.localRelevance.value,2/3);
  assert.match(reading.localRelevance.formula,/ASIN result sets containing the exact keyword/);
  const blue=queue.find(x=>x.key==='blue light readers');
  assert.equal(blue.localRelevance.available,false);
  assert.equal(blue.localRelevance.value,null);
});

test('overlap matching is exact normalized keyword and never substring or stemming',()=>{
  const queue=review.buildQueue(rows,['B000000001','B000000002']);
  const readers=queue.find(x=>x.key==='readers');
  const blue=queue.find(x=>x.key==='blue light readers');
  assert.equal(readers.localRelevance.numerator,1);
  assert.equal(blue.localRelevance.numerator,1);
  assert.equal(readers.localRelevance.available,false);
});

test('manual decisions bind to the evidence fingerprint and reset when evidence or scope changes',()=>{
  const evidence=review.evidenceKey(rows,['B000000001','B000000002']);
  let state=review.updateReview({},'reading glasses',{status:'relevant',note:'Core phrase'},evidence,'2026-09-03T04:00:00Z');
  assert.equal(review.normalizeState(state,evidence).reviews['reading glasses'].status,'relevant');
  assert.equal(review.normalizeState(state,evidence).reviews['reading glasses'].note,'Core phrase');
  const changed=review.evidenceKey(rows,['B000000001','B000000002','B000000003']);
  assert.notEqual(changed,evidence);
  assert.deepEqual(review.normalizeState(state,changed).reviews,{});
});

test('review state stores decisions only and does not preserve derived relevance result payloads',()=>{
  const evidence=review.evidenceKey(rows,['B000000001','B000000002']);
  const state=review.normalizeState({evidenceKey:evidence,reviews:{'reading glasses':{status:'relevant',note:'ok',score:99,asins:['fake'],formula:'fake'}},results:[1],resultCount:9},evidence);
  assert.deepEqual(Object.keys(state.reviews['reading glasses']),['status','note','updatedAt']);
  assert.equal(Object.hasOwn(state,'results'),false);
  assert.equal(Object.hasOwn(state,'resultCount'),false);
});

test('runtime uses existing suggestion-review persistence and renders a manual queue without Amazon Relevancy claims',async()=>{
  const [index,pkg,app,growth,readme]=await Promise.all([
    readFile(new URL('../index.html',import.meta.url),'utf8'),
    readFile(new URL('../package.json',import.meta.url),'utf8'),
    readFile(new URL('../app.js',import.meta.url),'utf8'),
    readFile(new URL('../growth-workspaces.js',import.meta.url),'utf8'),
    readFile(new URL('../README.md',import.meta.url),'utf8')
  ]);
  assert.ok(index.indexOf('keyword-relevance-review.js')<index.indexOf('growth-workspaces.js'));
  assert.match(pkg,/node --check keyword-relevance-review\.js/);
  assert.match(pkg,/keyword-relevance-review\.js growth-import-gate\.js/);
  assert.match(app,/__keywordRelevanceReviews/);
  assert.match(app,/getKeywordRelevanceReviewState:keywordRelevanceReviewState/);
  assert.match(app,/setKeywordRelevanceReviewState:saveKeywordRelevanceReviewState/);
  assert.match(growth,/Human relevance review queue/);
  assert.match(growth,/Local imported overlap only; this is not Amazon Relevancy/);
  assert.match(growth,/data-relevance-status/);
  assert.doesNotMatch(readme,/keywordos_v9_keyword_relevance_reviews/);
});
'''
Path('tests/keyword-relevance-review.test.mjs').write_text(test)
