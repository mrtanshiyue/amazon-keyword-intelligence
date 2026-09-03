from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


module = r'''(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(typeof globalThis!=='undefined'){globalThis.KeywordOSSuggestedKeywords=api;globalThis.KeywordOSSuggestedKeywordsTest=api;}})(typeof window!=='undefined'?window:null,function(){
'use strict';
const RULE_VERSION='suggested-keywords-v1';
const SAVED_RULE=Object.freeze({version:RULE_VERSION,sources:['ads','sqp','reverse-asin'],exclude:['tracked','deleted']});
function cleanKeyword(value){return String(value||'').trim().replace(/\s+/g,' ')}
function keywordKey(value){return cleanKeyword(value).toLowerCase()}
function usableRecord(record){return Boolean(record&&Array.isArray(record.rows)&&record.rows.length&&['validated','migrated'].includes(String(record.validation?.status||'')))}
function recordFor(records,kind){return(Array.isArray(records)?records:[]).find(record=>record?.kind===kind&&usableRecord(record))||null}
function latestReverseAsinRows(record){const rows=Array.isArray(record?.rows)?record.rows:[],dated=rows.map(row=>({row,date:String(row?.snapshotDate||row?.date||'').slice(0,10)})).filter(item=>/^\d{4}-\d{2}-\d{2}$/.test(item.date));if(!dated.length)return rows;const latest=dated.map(item=>item.date).sort().at(-1);return dated.filter(item=>item.date===latest).map(item=>item.row)}
function sourceVocabulary({adsRows=[],adsImportedAt='',records=[]}={}){const map=new Map(),add=(value,source)=>{const keyword=cleanKeyword(value),key=keywordKey(keyword);if(!key)return;const current=map.get(key)||{key,keyword,sources:[]};if(!current.sources.includes(source))current.sources.push(source);map.set(key,current)};if(String(adsImportedAt||'').trim())for(const row of Array.isArray(adsRows)?adsRows:[])add(row?.searchTerm,'ads');const sqp=recordFor(records,'sqp');if(sqp)for(const row of sqp.rows)add(row?.query||row?.keyword||row?.searchTerm,'sqp');const reverse=recordFor(records,'reverse-asin');if(reverse)for(const row of latestReverseAsinRows(reverse))add(row?.keyword||row?.query||row?.searchTerm,'reverse-asin');return[...map.values()].sort((a,b)=>b.sources.length-a.sources.length||a.keyword.localeCompare(b.keyword))}
function deletedKeywordKeys(assetRows=[]){return new Set((Array.isArray(assetRows)?assetRows:[]).filter(row=>String(row?.deletedAt||'').trim()).map(row=>keywordKey(row?.keyword||row?.name)).filter(Boolean))}
function exclusionKeys(tracked=[],assetRows=[]){const set=deletedKeywordKeys(assetRows);for(const value of Array.isArray(tracked)?tracked:[]){const key=keywordKey(value);if(key)set.add(key)}return set}
function recordFingerprint(record){if(!usableRecord(record))return'';const coverage=record.coverage||{},stamp=String(record.importedAt||record.checksum||record.source||'').trim(),rows=Number(record.rowCount||record.rows.length||0);return`${record.kind}:${stamp}:${rows}:${coverage.min||''}:${coverage.max||''}`}
function importKey({adsRows=[],adsImportedAt='',adsSource='',records=[]}={}){const parts=[];if(String(adsImportedAt||'').trim()&&(Array.isArray(adsRows)?adsRows.length:0))parts.push(`ads:${adsImportedAt}:${adsSource||''}:${adsRows.length}`);for(const kind of ['sqp','reverse-asin']){const fingerprint=recordFingerprint(recordFor(records,kind));if(fingerprint)parts.push(fingerprint)}return parts.join('|')}
function normalizeSnapshot(raw){if(!raw||typeof raw!=='object'||raw.rule?.version!==RULE_VERSION||!Array.isArray(raw.items))return null;return{rule:SAVED_RULE,importKey:String(raw.importKey||''),computedAt:String(raw.computedAt||''),sourceTerms:Number(raw.sourceTerms||0),excludedAtCompute:Number(raw.excludedAtCompute||0),items:raw.items.map(item=>{const keyword=cleanKeyword(item?.keyword),key=keywordKey(keyword),sources=[...new Set((Array.isArray(item?.sources)?item.sources:[]).filter(source=>SAVED_RULE.sources.includes(source)))];return key?{key,keyword,sources}:null}).filter(Boolean)}}
function recomputeSnapshot(input={}){const key=importKey(input),vocabulary=sourceVocabulary(input),excluded=exclusionKeys(input.tracked,input.assetRows),items=vocabulary.filter(item=>!excluded.has(item.key));return{rule:SAVED_RULE,importKey:key,computedAt:String(input.now||''),sourceTerms:vocabulary.length,excludedAtCompute:vocabulary.length-items.length,items}}
function pruneSnapshot(raw,{tracked=[],assetRows=[]}={}){const snapshot=normalizeSnapshot(raw);if(!snapshot)return{snapshot:null,removed:0};const excluded=exclusionKeys(tracked,assetRows),items=snapshot.items.filter(item=>!excluded.has(item.key)),removed=snapshot.items.length-items.length;return{snapshot:{...snapshot,items},removed}}
function shouldRecompute(raw,currentImportKey){const snapshot=normalizeSnapshot(raw),key=String(currentImportKey||'');return Boolean(key&&(!snapshot||snapshot.importKey!==key))}
return{RULE_VERSION,SAVED_RULE,cleanKeyword,keywordKey,usableRecord,latestReverseAsinRows,sourceVocabulary,deletedKeywordKeys,exclusionKeys,recordFingerprint,importKey,normalizeSnapshot,recomputeSnapshot,pruneSnapshot,shouldRecompute};
});
'''
Path('suggested-keywords.js').write_text(module)

app = Path('app.js')
text = app.read_text()
old = "const keywordLibraryState=window.KeywordOSKeywordLibraryState;\n"
new = old + "const suggestedKeywordEngine=window.KeywordOSSuggestedKeywords;\n"
if text.count(old) != 1:
    raise SystemExit('suggested engine anchor mismatch')
text = text.replace(old, new, 1)

anchor = "function suggestionData(){\n"
helpers = r'''const SUGGESTED_KEYWORDS_STATE_KEY='__suggestedKeywordsSnapshot';
function suggestedKeywordContext(){return{adsRows:state.currentRows||[],adsImportedAt:state.adsImportedAt||'',adsSource:state.adsSource||'',records:state.datasetRegistry||[],tracked:state.tracked||[],assetRows:persistedKeywordAssetRows()}}
function persistSuggestedKeywordSnapshot(snapshot){state.suggestionReviews[SUGGESTED_KEYWORDS_STATE_KEY]=snapshot;save(STORAGE.suggestionReviews,state.suggestionReviews);return snapshot}
function suggestedKeywordSnapshot(){if(!suggestedKeywordEngine)return null;const context=suggestedKeywordContext(),currentImportKey=suggestedKeywordEngine.importKey(context),stored=suggestedKeywordEngine.normalizeSnapshot(state.suggestionReviews[SUGGESTED_KEYWORDS_STATE_KEY]);if(!currentImportKey)return null;if(suggestedKeywordEngine.shouldRecompute(stored,currentImportKey))return persistSuggestedKeywordSnapshot(suggestedKeywordEngine.recomputeSnapshot({...context,now:new Date().toISOString()}));const pruned=suggestedKeywordEngine.pruneSnapshot(stored,{tracked:context.tracked,assetRows:context.assetRows});if(pruned.removed)return persistSuggestedKeywordSnapshot(pruned.snapshot);return pruned.snapshot}
function suggestedKeywordItems(){const snapshot=suggestedKeywordSnapshot();if(!snapshot)return[];const ads=new Map(aggregateSearchTermContexts(state.currentRows||[]).map(row=>[String(row.name||'').trim().toLowerCase(),row]));return snapshot.items.map(item=>{const performance=ads.get(item.key)||null;return{name:item.keyword,key:item.key,suggestion:'Suggested Keyword',recommendedMatch:'EXACT',sources:item.sources,datasetKey:snapshot.importKey,spend:performance?.spend??null,sales:performance?.sales??null,acos:performance?.acos??null,orders:performance?.orders??null,clicks:performance?.clicks??null,campaign:''}})}
function suggestionData(){
'''
if text.count(anchor) != 1:
    raise SystemExit('suggestionData anchor mismatch')
text = text.replace(anchor, helpers, 1)

old = "  const newKeywords=terms.filter(x=>x.orders>=state.settings.harvestOrders&&x.acos!=null&&x.acos<=state.settings.harvestAcos/100).sort((a,b)=>b.orders-a.orders).slice(0,60).map(x=>({...x,suggestion:'New Keyword',recommendedMatch:'EXACT'}));\n  const negativeKeywords=terms.filter(x=>x.orders===0&&x.clicks>=state.settings.negativeClicks&&x.spend>=state.settings.negativeSpend).sort((a,b)=>b.spend-a.spend).slice(0,60).map(x=>({...x,suggestion:'Negative Keyword',recommendedMatch:'NEGATIVE EXACT'}));\n  return {'AI Bids':aiBids,'Bids':bids,'New Keywords':newKeywords,'Negative Keywords':negativeKeywords};"
new = "  const suggestedKeywords=suggestedKeywordItems();\n  const negativeKeywords=terms.filter(x=>x.orders===0&&x.clicks>=state.settings.negativeClicks&&x.spend>=state.settings.negativeSpend).sort((a,b)=>b.spend-a.spend).slice(0,60).map(x=>({...x,suggestion:'Negative Keyword',recommendedMatch:'NEGATIVE EXACT'}));\n  return {'AI Bids':aiBids,'Bids':bids,'Suggested Keywords':suggestedKeywords,'Negative Keywords':negativeKeywords};"
if text.count(old) != 1:
    raise SystemExit('New Keywords suggestion block mismatch')
text = text.replace(old, new, 1)

old = "function suggestionDatasetKey(){const rows=state.currentRows||[];let min='',max='';for(const r of rows){const d=r.date||'';if(d&&(!min||d<min))min=d;if(d&&d>max)max=d;}return `${rows.length}:${min}:${max}`;}\nfunction suggestionReviewKey(tab,x){return [suggestionDatasetKey(),tab,x.key||x.name||'',x.campaign||'',x.adGroup||'',x.matchType||''].join('|');}"
new = "function suggestionDatasetKey(){const rows=state.currentRows||[];let min='',max='';for(const r of rows){const d=r.date||'';if(d&&(!min||d<min))min=d;if(d&&d>max)max=d;}return `${rows.length}:${min}:${max}`;}\nfunction suggestionTabDatasetKey(tab){return tab==='Suggested Keywords'?(suggestedKeywordSnapshot()?.importKey||''):suggestionDatasetKey();}\nfunction suggestionReviewKey(tab,x){return [x.datasetKey||suggestionTabDatasetKey(tab),tab,x.key||x.name||'',x.campaign||'',x.adGroup||'',x.matchType||''].join('|');}"
if text.count(old) != 1:
    raise SystemExit('suggestion review key block mismatch')
text = text.replace(old, new, 1)

old = "function resetSuggestionReviews(tab){const prefix=`${suggestionDatasetKey()}|${tab}|`;let restored=0;"
new = "function resetSuggestionReviews(tab){const prefix=`${suggestionTabDatasetKey(tab)}|${tab}|`;let restored=0;"
if text.count(old) != 1:
    raise SystemExit('reset suggestion review key mismatch')
text = text.replace(old, new, 1)

old = "  const data=suggestionData(),tabs=['AI Bids','Bids','New Keywords','Negative Keywords'];if(!data[state.suggestionTab])state.suggestionTab='AI Bids';const allItems=data[state.suggestionTab]||[];"
new = "  const data=suggestionData(),tabs=['AI Bids','Bids','Suggested Keywords','Negative Keywords'];if(!data[state.suggestionTab])state.suggestionTab='AI Bids';const allItems=data[state.suggestionTab]||[],suggestedSnapshot=state.suggestionTab==='Suggested Keywords'?suggestedKeywordSnapshot():null;"
if text.count(old) != 1:
    raise SystemExit('suggestion tabs mismatch')
text = text.replace(old, new, 1)

old = "    const name=esc(x.name||x.key||'—'); const acos=x.acos==null?'—':fmtPct(x.acos);\n    let change='';"
new = "    const name=esc(x.name||x.key||'—'); const acos=x.acos==null?'—':fmtPct(x.acos),spend=x.spend==null?'—':fmtMoney(x.spend),sales=x.sales==null?'—':fmtMoney(x.sales),orders=x.orders==null?'—':fmtInt(x.orders),subline=state.suggestionTab==='Suggested Keywords'?`${(x.sources||[]).map(source=>source==='reverse-asin'?'reverse-ASIN':source.toUpperCase()).join(' + ')} · latest imported vocabulary`:x.campaign||'Search term recommendation';\n    let change='';"
if text.count(old) != 1:
    raise SystemExit('suggestion row values anchor mismatch')
text = text.replace(old, new, 1)

old = "    else if(state.suggestionTab==='New Keywords') change=`<b>${x.recommendedMatch}</b>`;"
new = "    else if(state.suggestionTab==='Suggested Keywords') change=`<b>${x.recommendedMatch}</b>`;"
if text.count(old) != 1:
    raise SystemExit('suggested keyword change branch mismatch')
text = text.replace(old, new, 1)

old = "    return `<tr><td class=\"check-col\"><input type=\"checkbox\" data-suggest-select=\"${i}\"></td><td class=\"left\"><b>${name}</b><span class=\"subline\">${esc(x.campaign||'Search term recommendation')}</span></td><td>${fmtMoney(x.spend)}</td><td>${fmtMoney(x.sales)}</td><td class=\"${metricClassAcos(x.acos)}\">${acos}</td><td>${fmtInt(x.orders)}</td><td>${change}</td><td class=\"center\"><div class=\"suggest-actions\"><button class=\"icon-action accept\" data-suggest-action=\"apply\" data-suggest-index=\"${i}\" title=\"Apply\">✓</button><button class=\"icon-action remove\" data-suggest-action=\"remove\" data-suggest-index=\"${i}\" title=\"Remove\">×</button><button class=\"icon-action pause\" data-suggest-action=\"pause\" data-suggest-index=\"${i}\" title=\"Pause\">Ⅱ</button></div></td></tr>`;"
new = "    return `<tr><td class=\"check-col\"><input type=\"checkbox\" data-suggest-select=\"${i}\"></td><td class=\"left\"><b>${name}</b><span class=\"subline\">${esc(subline)}</span></td><td>${spend}</td><td>${sales}</td><td class=\"${metricClassAcos(x.acos)}\">${acos}</td><td>${orders}</td><td>${change}</td><td class=\"center\"><div class=\"suggest-actions\"><button class=\"icon-action accept\" data-suggest-action=\"apply\" data-suggest-index=\"${i}\" title=\"Apply\">✓</button><button class=\"icon-action remove\" data-suggest-action=\"remove\" data-suggest-index=\"${i}\" title=\"Remove\">×</button><button class=\"icon-action pause\" data-suggest-action=\"pause\" data-suggest-index=\"${i}\" title=\"Pause\">Ⅱ</button></div></td></tr>`;"
if text.count(old) != 1:
    raise SystemExit('suggestion row html mismatch')
text = text.replace(old, new, 1)

old = "  $('#content').innerHTML=`<div class=\"h10-callout\"><div><b>Suggestions</b><span>Recommendations are generated from your configured thresholds. Review before applying.</span></div><button class=\"btn secondary sm\" data-learn-page=\"Suggestions\">Learn</button></div>"
new = "  $('#content').innerHTML=`<div class=\"h10-callout\"><div><b>Suggestions</b><span>Bid and negative suggestions use configured thresholds. Suggested Keywords uses the saved import-set rule and never calls an external suggestion service.</span></div><button class=\"btn secondary sm\" data-learn-page=\"Suggestions\">Learn</button></div>"
if text.count(old) != 1:
    raise SystemExit('suggestion callout mismatch')
text = text.replace(old, new, 1)

old = "  <div class=\"suggest-settings\"><span><b>Account AI Bid Settings</b> · Default Target ACoS ${state.settings.targetAcos}% · Active ${items.length} · Hidden ${hiddenCount}${hiddenCount?` (${hiddenRemoved} removed · ${hiddenPaused} paused)`:''}</span><div style=\"display:flex;gap:6px\"><button class=\"btn ghost sm\" id=\"restore-hidden-suggestions\" ${hiddenCount?'':'disabled'}>Restore Hidden${hiddenCount?` (${hiddenCount})`:''}</button><button class=\"btn ghost sm\" id=\"suggestion-settings\">Edit Settings</button></div></div>"
new = "  <div class=\"suggest-settings\"><span>${state.suggestionTab==='Suggested Keywords'?`<b>Saved rule</b> · latest Ads + SQP + reverse-ASIN terms − tracked − deleted · Recompute only after a new import · Snapshot ${suggestedSnapshot?.computedAt?esc(suggestedSnapshot.computedAt.slice(0,19).replace('T',' ')):'awaiting import'} · Active ${items.length} · Hidden ${hiddenCount}`:`<b>Account AI Bid Settings</b> · Default Target ACoS ${state.settings.targetAcos}% · Active ${items.length} · Hidden ${hiddenCount}${hiddenCount?` (${hiddenRemoved} removed · ${hiddenPaused} paused)`:''}`}</span><div style=\"display:flex;gap:6px\"><button class=\"btn ghost sm\" id=\"restore-hidden-suggestions\" ${hiddenCount?'':'disabled'}>Restore Hidden${hiddenCount?` (${hiddenCount})`:''}</button><button class=\"btn ghost sm\" id=\"suggestion-settings\">Edit Settings</button></div></div>"
if text.count(old) != 1:
    raise SystemExit('suggestion settings block mismatch')
text = text.replace(old, new, 1)

old = "<div class=\"empty-state\"><h3>No suggestions for this view</h3><p>Suggestions will appear when your thresholds are met.</p></div>"
new = "<div class=\"empty-state\"><h3>No suggestions for this view</h3><p>${state.suggestionTab==='Suggested Keywords'?'Import Ads, SQP or reverse-ASIN data. The saved set-difference rule is evaluated only when the import fingerprint changes.':'Suggestions will appear when your thresholds are met.'}</p></div>"
if text.count(old) != 1:
    raise SystemExit('suggestion empty state mismatch')
text = text.replace(old, new, 1)

old = "const type=state.suggestionTab==='Negative Keywords'?'Negative Exact':state.suggestionTab==='New Keywords'?'Add Exact Keyword':'Bid Change';"
new = "const type=state.suggestionTab==='Negative Keywords'?'Negative Exact':state.suggestionTab==='Suggested Keywords'?'Add Exact Keyword':'Bid Change';"
if text.count(old) != 1:
    raise SystemExit('suggestion action type mismatch')
text = text.replace(old, new, 1)

app.write_text(text)

index = Path('index.html')
text = index.read_text()
old = '  <script src="keyword-library-state.js"></script>\n  <script src="app.js"></script>'
new = '  <script src="keyword-library-state.js"></script>\n  <script src="suggested-keywords.js"></script>\n  <script src="app.js"></script>'
if text.count(old) != 1:
    raise SystemExit('index suggested module anchor mismatch')
index.write_text(text.replace(old, new, 1))

pkg = Path('package.json')
text = pkg.read_text()
old = 'node --check keyword-library-state.js && node --check navigation-taxonomy.js'
new = 'node --check keyword-library-state.js && node --check suggested-keywords.js && node --check navigation-taxonomy.js'
if text.count(old) != 1:
    raise SystemExit('package check anchor mismatch')
text = text.replace(old, new, 1)
old = 'keyword-lab.js keyword-lab-view.js keyword-library-state.js navigation-taxonomy.js'
new = 'keyword-lab.js keyword-lab-view.js keyword-library-state.js suggested-keywords.js navigation-taxonomy.js'
if text.count(old) != 1:
    raise SystemExit('package build anchor mismatch')
pkg.write_text(text.replace(old, new, 1))

tests = r'''import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../suggested-keywords.js');
const engine=globalThis.KeywordOSSuggestedKeywordsTest;
const record=(kind,rows,extra={})=>({kind,rows,rowCount:rows.length,source:`${kind}.csv`,importedAt:`2026-09-03T0${kind==='sqp'?'1':'2'}:00:00Z`,validation:{status:'validated'},...extra});

test('Suggested Keywords is the exact union of latest imported Ads, SQP and latest reverse-ASIN vocabulary',()=>{
  const rows=engine.sourceVocabulary({
    adsImportedAt:'2026-09-03T00:00:00Z',
    adsRows:[{searchTerm:'Reading Glasses'},{searchTerm:'blue light readers'}],
    records:[
      record('sqp',[{query:'reading glasses'},{query:'computer readers'}]),
      record('reverse-asin',[{keyword:'old keyword',snapshotDate:'2026-09-01'},{keyword:'competitor readers',snapshotDate:'2026-09-03'},{keyword:'reading glasses',snapshotDate:'2026-09-03'}])
    ]
  });
  assert.deepEqual(rows.map(row=>row.keyword),['Reading Glasses','blue light readers','competitor readers','computer readers']);
  assert.deepEqual(rows.find(row=>row.key==='reading glasses').sources,['ads','sqp','reverse-asin']);
  assert.ok(!rows.some(row=>row.key==='old keyword'));
});

test('recompute subtracts tracked and recycle-bin deleted keywords case-insensitively',()=>{
  const snapshot=engine.recomputeSnapshot({
    adsImportedAt:'2026-09-03T00:00:00Z',adsSource:'ads.csv',adsRows:[{searchTerm:'Reading Glasses'},{searchTerm:'Blue Light Readers'},{searchTerm:'Computer Readers'}],
    records:[],tracked:['reading glasses'],assetRows:[{keyword:'BLUE LIGHT READERS',deletedAt:'2026-09-03T01:00:00Z'}],now:'2026-09-03T03:00:00Z'
  });
  assert.deepEqual(snapshot.items.map(item=>item.keyword),['Computer Readers']);
  assert.equal(snapshot.excludedAtCompute,2);
  assert.deepEqual(snapshot.rule,engine.SAVED_RULE);
});

test('import fingerprint changes only with imported evidence metadata, not tracker or delete state',()=>{
  const base={adsImportedAt:'2026-09-03T00:00:00Z',adsSource:'ads.csv',adsRows:[{searchTerm:'one'}],records:[record('sqp',[{query:'two'}])]},key=engine.importKey(base);
  assert.equal(engine.importKey({...base,tracked:['one'],assetRows:[{keyword:'two',deletedAt:'x'}]}),key);
  assert.notEqual(engine.importKey({...base,records:[record('sqp',[{query:'two'}],{importedAt:'2026-09-04T00:00:00Z'})]}),key);
});

test('pruning is monotonic between imports: tracking or deletion removes terms but restore does not re-add them',()=>{
  const original=engine.recomputeSnapshot({adsImportedAt:'2026-09-03T00:00:00Z',adsRows:[{searchTerm:'one'},{searchTerm:'two'}],records:[],now:'x'});
  const pruned=engine.pruneSnapshot(original,{tracked:['one'],assetRows:[]}).snapshot;
  assert.deepEqual(pruned.items.map(item=>item.keyword),['two']);
  const restored=engine.pruneSnapshot(pruned,{tracked:[],assetRows:[]}).snapshot;
  assert.deepEqual(restored.items.map(item=>item.keyword),['two']);
  assert.equal(engine.shouldRecompute(restored,original.importKey),false);
});

test('Suggested Keywords runtime is loaded before app and replaces the old render-time New Keywords threshold tab',async()=>{
  const [app,index,pkg]=await Promise.all([
    readFile(new URL('../app.js',import.meta.url),'utf8'),
    readFile(new URL('../index.html',import.meta.url),'utf8'),
    readFile(new URL('../package.json',import.meta.url),'utf8')
  ]);
  assert.ok(index.indexOf('<script src="suggested-keywords.js"></script>')<index.indexOf('<script src="app.js"></script>'));
  assert.match(pkg.scripts.check,/node --check suggested-keywords\.js/);
  assert.match(pkg.scripts.build,/suggested-keywords\.js/);
  assert.match(app,/SUGGESTED_KEYWORDS_STATE_KEY='__suggestedKeywordsSnapshot'/);
  assert.match(app,/latest Ads \+ SQP \+ reverse-ASIN terms − tracked − deleted/);
  assert.match(app,/tabs=\['AI Bids','Bids','Suggested Keywords','Negative Keywords'\]/);
  assert.doesNotMatch(app,/suggestion:'New Keyword'/);
});
'''
Path('tests/suggested-keywords.test.mjs').write_text(tests)

readme = Path('README.md')
text = readme.read_text()
old = '- [ ] Suggested Keywords 使用集合差：最新 Ads/SQP/reverse-ASIN 导入词减去已追踪/已删除词，只在新导入后按保存规则重算。'
new = '- [x] Suggested Keywords 使用集合差：最新 Ads/SQP/reverse-ASIN 导入词减去已追踪/已删除词，只在新导入后按保存规则重算。\n  - 2026-09-03：Suggestions 的旧 `New Keywords` Ads 阈值列表已替换为 **Suggested Keywords** 导入集合差。新增无依赖 `suggested-keywords.js`：候选全集只取真实用户导入的 Ads search terms、当前 validated/migrated SQP rows，以及 reverse-ASIN 当前最新 Snapshot Date 的关键词；按 normalized exact keyword 合并来源，不做 substring/fuzzy 扩词，也不调用 Amazon Suggest。保存规则固定记录为 `latest Ads + SQP + reverse-ASIN − tracked − deleted`，快照继续复用现有 backup-safe `keywordos_v9_suggestion_reviews` 的保留字段，不新增第二套持久化或 storage key。只有 Ads/SQP/reverse-ASIN import fingerprint 改变时才从来源全集重算；两次导入之间，新增 Tracker 或 Keyword Library Recycle Bin 删除只会把命中词从已保存快照中继续裁掉，取消追踪/恢复不会把词重新加回，必须等下一次真实导入重新评估。SQP/reverse-ASIN-only 词没有 Ads performance 时 Spend/Sales/ACoS/Orders 显示 `—`，不会伪造 0；来源行明确显示 ADS / SQP / reverse-ASIN。CI 为 **__TEST_COUNT__ passed / 0 failed**；`npm run build` 验证 **__JS_COUNT__ 个 JS + 9 个 CSS，__PUBLISH_COUNT__ 个发布文件**，source/dist byte identity 与 committed-dist parity gate 全部通过。'
if text.count(old) != 1:
    raise SystemExit(f'README Suggested Keywords item expected once, found {text.count(old)}')
readme.write_text(text.replace(old,new,1))
