from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    p.write_text(text.replace(old, new, 1))


# keyword-lab.js: constants + labels + pure view model + runtime workspace.
replace_once(
    'keyword-lab.js',
    "const INPUT_SOURCE_LABELS=Object.freeze({manual:'Manual batch input',csv:'Batch CSV input','keyword-library':'Keyword Library'});\nconst LABELS=Object.freeze({",
    "const INPUT_SOURCE_LABELS=Object.freeze({manual:'Manual batch input',csv:'Batch CSV input','keyword-library':'Keyword Library'});\nconst NGRAM_MODES=Object.freeze(['1','2','3+']);\nconst STOP_WORDS=Object.freeze(new Set(['a','an','the','and','or','but','for','to','of','in','on','with','by','from','at','as','is','are','be']));\nconst LABELS=Object.freeze({",
    'keyword-lab constants'
)

replace_once(
    'keyword-lab.js',
    "    exactMissing:'No exact keyword match across loaded Ads, SQP/ABA, reverse-ASIN, rank or Keyword Library evidence.'\n",
    "    exactMissing:'No exact keyword match across loaded Ads, SQP/ABA, reverse-ASIN, rank or Keyword Library evidence.',\n    rootTitle:'N-grams & Common Words',rootHelp:'Click a root to filter and highlight the linked result table. Exclusions and deletions only affect this Keyword Lab view.',stopwords:'Ignore edge stopwords',excludeRoot:'Exclude',excludedRoots:'Common Words exclusions',deletedRows:'Deleted keywords',restore:'Restore',deleteRow:'Delete',clearRoot:'Clear root filter',showing:'Showing',emptyRoots:'No n-grams are available for the current result set.'\n",
    'english root labels'
)
replace_once(
    'keyword-lab.js',
    "    exactMissing:'已加载 Ads、SQP/ABA、reverse-ASIN、排名或 Keyword Library 证据中没有精确关键词匹配。'\n",
    "    exactMissing:'已加载 Ads、SQP/ABA、reverse-ASIN、排名或 Keyword Library 证据中没有精确关键词匹配。',\n    rootTitle:'N-gram 与常用词',rootHelp:'点击词根即可筛选并高亮联动结果表；排除和删除只影响当前关键词实验室视图，不修改原始证据。',stopwords:'忽略首尾停用词',excludeRoot:'排除',excludedRoots:'Common Words 排除',deletedRows:'已删除关键词',restore:'恢复',deleteRow:'删除',clearRoot:'清除词根筛选',showing:'显示',emptyRoots:'当前结果没有可用的 n-gram。'\n",
    'chinese root labels'
)
replace_once(
    'keyword-lab.js',
    "    exactMissing:'所有已加载关键词证据中均无精确匹配 / No exact match across loaded keyword evidence.'\n",
    "    exactMissing:'所有已加载关键词证据中均无精确匹配 / No exact match across loaded keyword evidence.',\n    rootTitle:'N-gram 与常用词 / N-grams & Common Words',rootHelp:'点击词根筛选并高亮联动结果 / Click a root to filter and highlight linked results; exclusions and deletions are view-only.',stopwords:'忽略首尾停用词 / Ignore edge stopwords',excludeRoot:'排除 / Exclude',excludedRoots:'Common Words 排除 / Exclusions',deletedRows:'已删除关键词 / Deleted keywords',restore:'恢复 / Restore',deleteRow:'删除 / Delete',clearRoot:'清除词根筛选 / Clear root filter',showing:'显示 / Showing',emptyRoots:'当前没有可用 n-gram / No n-grams are available.'\n",
    'bilingual root labels'
)

pure_anchor = "function filterResultRowsByQuery(rows=[],query=''){const q=normalizedKeyword(query);if(!q)return[...rows];const tokens=q.split(/\\s+/).filter(Boolean);return rows.filter(row=>tokens.some(token=>normalizedKeyword(row?.keyword).includes(token)));}\n"
pure_code = pure_anchor + r'''function keywordTokens(value){return clean(value).toLocaleLowerCase().match(/[\p{L}\p{N}]+(?:[+.-][\p{L}\p{N}]+)*/gu)||[];}
function rowKeyword(row){return clean(row?.keyword??row?.name);}
function containsGram(keyword,gram){const source=keywordTokens(keyword),target=keywordTokens(gram);if(!target.length||target.length>source.length)return false;for(let start=0;start<=source.length-target.length;start+=1){let match=true;for(let index=0;index<target.length;index+=1)if(source[start+index]!==target[index]){match=false;break;}if(match)return true;}return false;}
function extractNgrams(value,gramMode='1',{ignoreStopwords=false}={}){const mode=NGRAM_MODES.includes(gramMode)?gramMode:'1',tokens=keywordTokens(value);if(!tokens.length)return[];const sizes=mode==='3+'?Array.from({length:Math.max(0,tokens.length-2)},(_,index)=>index+3):[Number(mode)],out=[];for(const size of sizes){if(size>tokens.length)continue;for(let start=0;start<=tokens.length-size;start+=1){const parts=tokens.slice(start,start+size);if(ignoreStopwords&&(STOP_WORDS.has(parts[0])||STOP_WORDS.has(parts[parts.length-1])))continue;out.push(parts.join(' '));}}return[...new Set(out)];}
function ngramFrequency(rows=[],gramMode='1',{ignoreStopwords=false,limit=40}={}){const counts=new Map();for(const row of Array.isArray(rows)?rows:[]){for(const gram of extractNgrams(rowKeyword(row),gramMode,{ignoreStopwords}))counts.set(gram,(counts.get(gram)||0)+1);}const sorted=[...counts].map(([gram,count])=>Object.freeze({gram,count})).sort((a,b)=>b.count-a.count||a.gram.localeCompare(b.gram));return Number.isFinite(Number(limit))&&Number(limit)>=0?sorted.slice(0,Number(limit)):sorted;}
function normalizeRootWorkspaceState(state={}){const unique=values=>[...new Set((Array.isArray(values)?values:[]).map(normalizedKeyword).filter(Boolean))],gramMode=NGRAM_MODES.includes(state?.gramMode)?state.gramMode:'1',excludedRoots=unique(state?.excludedRoots),deletedKeywords=unique(state?.deletedKeywords);let activeRoot=normalizedKeyword(state?.activeRoot);if(activeRoot&&excludedRoots.includes(activeRoot))activeRoot='';return Object.freeze({gramMode,ignoreStopwords:state?.ignoreStopwords!==false,activeRoot,excludedRoots:Object.freeze(excludedRoots),deletedKeywords:Object.freeze(deletedKeywords)});}
function reduceRootWorkspaceState(state={},action={}){const current=normalizeRootWorkspaceState(state),type=clean(action?.type),value=normalizedKeyword(action?.value);if(type==='set-gram')return normalizeRootWorkspaceState({...current,gramMode:NGRAM_MODES.includes(action?.value)?action.value:current.gramMode});if(type==='set-stopwords')return normalizeRootWorkspaceState({...current,ignoreStopwords:Boolean(action?.value)});if(type==='select-root')return normalizeRootWorkspaceState({...current,activeRoot:current.activeRoot===value?'':value});if(type==='clear-root')return normalizeRootWorkspaceState({...current,activeRoot:''});if(type==='exclude-root'&&value)return normalizeRootWorkspaceState({...current,activeRoot:current.activeRoot===value?'':current.activeRoot,excludedRoots:[...current.excludedRoots,value]});if(type==='include-root'&&value)return normalizeRootWorkspaceState({...current,excludedRoots:current.excludedRoots.filter(item=>item!==value)});if(type==='delete-keyword'&&value)return normalizeRootWorkspaceState({...current,deletedKeywords:[...current.deletedKeywords,value]});if(type==='restore-keyword'&&value)return normalizeRootWorkspaceState({...current,deletedKeywords:current.deletedKeywords.filter(item=>item!==value)});return current;}
function applyKeywordWorkspace(rows=[],state={}, {respectActive=true}={}){const view=normalizeRootWorkspaceState(state),deleted=new Set(view.deletedKeywords);return(Array.isArray(rows)?rows:[]).filter(row=>{const keyword=rowKeyword(row),key=normalizedKeyword(keyword);if(!key||deleted.has(key))return false;if(view.excludedRoots.some(root=>containsGram(keyword,root)))return false;if(respectActive&&view.activeRoot&&!containsGram(keyword,view.activeRoot))return false;return true;});}
function highlightKeywordHtml(keyword,gram){const source=clean(keyword),target=normalizedKeyword(gram);if(!source||!target)return escapeHtml(source);const pattern=target.split(/\s+/).map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+');try{return escapeHtml(source).replace(new RegExp(`(${pattern})`,'ig'),'<mark>$1</mark>');}catch{return escapeHtml(source);}}
'''
replace_once('keyword-lab.js', pure_anchor, pure_code, 'keyword-lab pure ngram helpers')

replace_once(
    'keyword-lab.js',
    "const PUBLIC_API={BATCH_INPUT_LIMIT,VALID_RECORD_STATES,SOURCE_ORDER,MODE_CATALOG,RESULT_FIELDS,BATCH_HEADER_ALIASES,INPUT_SOURCE_LABELS,LABELS,clean,normalizedKeyword,languageMode,labels,escapeHtml,metric,resultRow,validRecord,recordFor,observationValue,groupByKeyword,latestPerAsinKeyword,adsResultRows,sqpResultRows,reverseAsinEvidenceRows,rankResultRows,keywordAssetValue,keywordAssetResultRows,asinResultRows,mergeMetricEvidence,mergeKeywordRows,mergeEvidenceRows,combinedKeywordEvidence,enrichBaseRows,filterAdsByQuery,filterResultRowsByQuery,parseCsvMatrix,batchHeader,normalizeBatchKeywordList,parseBatchInput,keywordLibraryInput,batchLeftJoin,batchMatchSummary,modelSummary,sameResultShape};",
    "const PUBLIC_API={BATCH_INPUT_LIMIT,VALID_RECORD_STATES,SOURCE_ORDER,MODE_CATALOG,RESULT_FIELDS,BATCH_HEADER_ALIASES,INPUT_SOURCE_LABELS,NGRAM_MODES,STOP_WORDS,LABELS,clean,normalizedKeyword,languageMode,labels,escapeHtml,metric,resultRow,validRecord,recordFor,observationValue,groupByKeyword,latestPerAsinKeyword,adsResultRows,sqpResultRows,reverseAsinEvidenceRows,rankResultRows,keywordAssetValue,keywordAssetResultRows,asinResultRows,mergeMetricEvidence,mergeKeywordRows,mergeEvidenceRows,combinedKeywordEvidence,enrichBaseRows,filterAdsByQuery,filterResultRowsByQuery,keywordTokens,rowKeyword,containsGram,extractNgrams,ngramFrequency,normalizeRootWorkspaceState,reduceRootWorkspaceState,applyKeywordWorkspace,highlightKeywordHtml,parseCsvMatrix,batchHeader,normalizeBatchKeywordList,parseBatchInput,keywordLibraryInput,batchLeftJoin,batchMatchSummary,modelSummary,sameResultShape};",
    'keyword-lab public api'
)
replace_once(
    'keyword-lab.js',
    "const doc=root.document,$=(selector,scope=doc)=>scope.querySelector(selector);let observer=null,auditTimer=0;const batchState={rawText:'',parsed:null,source:'manual',error:'',dirty:false};",
    "const doc=root.document,$=(selector,scope=doc)=>scope.querySelector(selector);let observer=null,auditTimer=0;const batchState={rawText:'',parsed:null,source:'manual',error:'',dirty:false};let rootWorkspaceState=normalizeRootWorkspaceState({gramMode:'1',ignoreStopwords:true});",
    'keyword-lab browser state'
)

replace_once(
    'keyword-lab.js',
    "function batchResultsHtml(rows,text){if(!batchState.parsed?.ok||batchState.dirty)return'';const body=rows.map(row=>`<tr><td><b>${escapeHtml(row.keyword)}</b></td><td>${row.matched?escapeHtml(text.matched):escapeHtml(text.missing)}</td><td>${escapeHtml(row.sources.join(', ')||'—')}</td><td>${escapeHtml(metricText(row,'orders'))}</td><td>${escapeHtml(metricText(row,'sales'))}</td><td>${escapeHtml(row.reason||'—')}</td></tr>`).join('');return `<div class=\"table-wrap\" data-keyword-lab-batch-results><table><thead><tr><th>${text.keyword}</th><th>${text.matched}</th><th>${text.source}</th><th>${text.orders}</th><th>${text.sales}</th><th>${text.reason}</th></tr></thead><tbody>${body}</tbody></table></div>`;}",
    "function batchResultsHtml(rows,text){if(!batchState.parsed?.ok||batchState.dirty)return'';const body=rows.map(row=>`<tr data-keyword-lab-keyword=\"${encodeURIComponent(row.keyword)}\"><td><b class=\"keyword-lab-keyword-text\">${highlightKeywordHtml(row.keyword,rootWorkspaceState.activeRoot)}</b> <button type=\"button\" class=\"btn sm\" data-keyword-lab-delete=\"${encodeURIComponent(row.keyword)}\">${text.deleteRow}</button></td><td>${row.matched?escapeHtml(text.matched):escapeHtml(text.missing)}</td><td>${escapeHtml(row.sources.join(', ')||'—')}</td><td>${escapeHtml(metricText(row,'orders'))}</td><td>${escapeHtml(metricText(row,'sales'))}</td><td>${escapeHtml(row.reason||'—')}</td></tr>`).join('');return `<div class=\"table-wrap\" data-keyword-lab-batch-results><table><thead><tr><th>${text.keyword}</th><th>${text.matched}</th><th>${text.source}</th><th>${text.orders}</th><th>${text.sales}</th><th>${text.reason}</th></tr></thead><tbody>${body}</tbody></table></div>`;}",
    'batch result delete/highlight'
)
replace_once(
    'keyword-lab.js',
    "function batchWorkspaceSignature(rows,mode){const match=batchMatchSummary(rows);return[languageMode(mode),batchState.rawText,batchState.parsed?.source||'',batchState.parsed?.format||'',batchState.parsed?.keywords?.join('\\u001f')||'',batchState.error,batchState.dirty?'dirty':'clean',match.matched,match.missing,modelSummary(rows).sources.join(',')].join('|');}",
    "function batchWorkspaceSignature(rows,mode){const match=batchMatchSummary(rows),view=normalizeRootWorkspaceState(rootWorkspaceState);return[languageMode(mode),batchState.rawText,batchState.parsed?.source||'',batchState.parsed?.format||'',batchState.parsed?.keywords?.join('\\u001f')||'',batchState.error,batchState.dirty?'dirty':'clean',match.matched,match.missing,modelSummary(rows).sources.join(','),view.activeRoot,view.excludedRoots.join(','),view.deletedKeywords.join(',')].join('|');}",
    'batch signature root state'
)
replace_once(
    'keyword-lab.js',
    "function renderBatchWorkspace(){const content=$('#content');if(!content)return false;const active=uiMode()==='batch';setLegacyBatchVisibility(active,content);let host=$('[data-keyword-lab-batch-host]',content);if(!active){host?.remove();return false;}const text=labels(root.KeywordOSI18N?.getLanguage?.()||'en'),rows=currentRows('batch'),signature=batchWorkspaceSignature(rows,root.KeywordOSI18N?.getLanguage?.()||'en');if(!host){const shell=$('[data-keyword-lab-shell]',content);(shell||content.firstElementChild)?.insertAdjacentHTML(shell?'afterend':'beforebegin',batchWorkspaceHtml(rows,text,signature));host=$('[data-keyword-lab-batch-host]',content);}else if(host.dataset.keywordLabBatchSignature!==signature){host.outerHTML=batchWorkspaceHtml(rows,text,signature);host=$('[data-keyword-lab-batch-host]',content);}bindBatchWorkspace(host,text);return true;}",
    "function renderBatchWorkspace(){const content=$('#content');if(!content)return false;const active=uiMode()==='batch';setLegacyBatchVisibility(active,content);let host=$('[data-keyword-lab-batch-host]',content);if(!active){host?.remove();return false;}const text=labels(root.KeywordOSI18N?.getLanguage?.()||'en'),allRows=currentRows('batch'),rows=applyKeywordWorkspace(allRows,rootWorkspaceState),signature=batchWorkspaceSignature(rows,root.KeywordOSI18N?.getLanguage?.()||'en');if(!host){const shell=$('[data-keyword-lab-shell]',content);(shell||content.firstElementChild)?.insertAdjacentHTML(shell?'afterend':'beforebegin',batchWorkspaceHtml(rows,text,signature));host=$('[data-keyword-lab-batch-host]',content);}else if(host.dataset.keywordLabBatchSignature!==signature){host.outerHTML=batchWorkspaceHtml(rows,text,signature);host=$('[data-keyword-lab-batch-host]',content);}bindBatchWorkspace(host,text);return true;}",
    'batch workspace view filter'
)

runtime_anchor = "function applyShell(){const page=currentPage();if(page!=='cerebro'&&page!=='asin-comparison')return false;"
runtime_code = r'''function rootWorkspaceSignature(rows,language){const view=normalizeRootWorkspaceState(rootWorkspaceState),base=applyKeywordWorkspace(rows,view,{respectActive:false}),visible=applyKeywordWorkspace(rows,view),freq=ngramFrequency(base,view.gramMode,{ignoreStopwords:view.ignoreStopwords});return[languageMode(language),view.gramMode,view.ignoreStopwords?'1':'0',view.activeRoot,view.excludedRoots.join(','),view.deletedKeywords.join(','),base.length,visible.length,freq.map(item=>`${item.gram}:${item.count}`).join(',')].join('|');}
function rootWorkspaceHtml(rows,text,signature){const view=normalizeRootWorkspaceState(rootWorkspaceState),base=applyKeywordWorkspace(rows,view,{respectActive:false}),visible=applyKeywordWorkspace(rows,view),freq=ngramFrequency(base,view.gramMode,{ignoreStopwords:view.ignoreStopwords}),gramTabs=NGRAM_MODES.map(mode=>`<button type="button" class="mode-tab ${view.gramMode===mode?'active':''}" data-keyword-lab-gram-mode="${mode}" aria-pressed="${view.gramMode===mode?'true':'false'}">${mode}-gram</button>`).join(''),chips=freq.map(item=>`<span class="word-chip"><button type="button" class="utility-link" data-keyword-lab-root="${encodeURIComponent(item.gram)}">${escapeHtml(item.gram)} <b>${item.count}</b></button><button type="button" class="utility-link" data-keyword-lab-exclude-root="${encodeURIComponent(item.gram)}" title="${escapeHtml(text.excludeRoot)}">×</button></span>`).join('')||`<span class="small muted">${escapeHtml(text.emptyRoots)}</span>`,excluded=view.excludedRoots.map(value=>`<span class="word-chip">${escapeHtml(value)} <button type="button" class="utility-link" data-keyword-lab-include-root="${encodeURIComponent(value)}">${escapeHtml(text.restore)}</button></span>`).join('')||'—',deleted=view.deletedKeywords.map(value=>`<span class="word-chip">${escapeHtml(value)} <button type="button" class="utility-link" data-keyword-lab-restore="${encodeURIComponent(value)}">${escapeHtml(text.restore)}</button></span>`).join('')||'—';return `<div class="card" data-keyword-lab-roots data-keyword-lab-roots-signature="${escapeHtml(signature)}"><div class="card-head"><div class="card-title"><h3 data-no-i18n>${text.rootTitle}</h3><small data-no-i18n>${text.rootHelp}</small></div></div><div class="card-body"><div class="mode-tabs" style="margin-bottom:10px">${gramTabs}</div><label class="small"><input type="checkbox" data-keyword-lab-stopwords ${view.ignoreStopwords?'checked':''}> ${text.stopwords}</label><div class="small muted" style="margin:8px 0" data-no-i18n>${text.showing} ${visible.length} / ${base.length}${view.activeRoot?` · ${escapeHtml(view.activeRoot)}`:''} ${view.activeRoot?`<button type="button" class="utility-link" data-keyword-lab-clear-root>${text.clearRoot}</button>`:''}</div><div class="wordcloud">${chips}</div><div class="small muted" style="margin-top:12px">${text.excludedRoots}</div><div class="wordcloud">${excluded}</div><div class="small muted" style="margin-top:12px">${text.deletedRows}</div><div class="wordcloud">${deleted}</div></div></div>`;}
function setRootWorkspaceState(action){rootWorkspaceState=reduceRootWorkspaceState(rootWorkspaceState,action);if(currentPage()==='cerebro'&&typeof root.KeywordOSUIBridge?.render==='function'){root.KeywordOSUIBridge.render();root.setTimeout(enhance,0);}else enhance();}
function bindRootWorkspace(host){if(!host||host.dataset.keywordLabRootsBound==='1')return;host.dataset.keywordLabRootsBound='1';host.querySelectorAll('[data-keyword-lab-gram-mode]').forEach(button=>button.addEventListener('click',()=>setRootWorkspaceState({type:'set-gram',value:button.dataset.keywordLabGramMode})));host.querySelector('[data-keyword-lab-stopwords]')?.addEventListener('change',event=>setRootWorkspaceState({type:'set-stopwords',value:event.target.checked}));host.querySelectorAll('[data-keyword-lab-root]').forEach(button=>button.addEventListener('click',()=>setRootWorkspaceState({type:'select-root',value:decodeURIComponent(button.dataset.keywordLabRoot)})));host.querySelectorAll('[data-keyword-lab-exclude-root]').forEach(button=>button.addEventListener('click',()=>setRootWorkspaceState({type:'exclude-root',value:decodeURIComponent(button.dataset.keywordLabExcludeRoot)})));host.querySelectorAll('[data-keyword-lab-include-root]').forEach(button=>button.addEventListener('click',()=>setRootWorkspaceState({type:'include-root',value:decodeURIComponent(button.dataset.keywordLabIncludeRoot)})));host.querySelectorAll('[data-keyword-lab-restore]').forEach(button=>button.addEventListener('click',()=>setRootWorkspaceState({type:'restore-keyword',value:decodeURIComponent(button.dataset.keywordLabRestore)})));host.querySelector('[data-keyword-lab-clear-root]')?.addEventListener('click',()=>setRootWorkspaceState({type:'clear-root'}));}
function renderRootWorkspace(){const page=currentPage(),active=uiMode();if(page!=='cerebro'&&page!=='asin-comparison')return false;const content=$('#content');if(!content||!active)return false;if(page==='cerebro'){const legacy=$('.research-summary',content);if(legacy&&!legacy.hidden){legacy.hidden=true;legacy.dataset.keywordLabHidden='1';}}const language=root.KeywordOSI18N?.getLanguage?.()||'en',text=labels(language),rows=currentRows(active),signature=rootWorkspaceSignature(rows,language);let host=$('[data-keyword-lab-roots]',content);if(!host){const batch=$('[data-keyword-lab-batch-host]',content),shell=$('[data-keyword-lab-shell]',content);(batch||shell||content.firstElementChild)?.insertAdjacentHTML(batch||shell?'afterend':'beforebegin',rootWorkspaceHtml(rows,text,signature));host=$('[data-keyword-lab-roots]',content);}else if(host.dataset.keywordLabRootsSignature!==signature){host.outerHTML=rootWorkspaceHtml(rows,text,signature);host=$('[data-keyword-lab-roots]',content);}bindRootWorkspace(host);return true;}
function filterLegacyAdsItems(items=[]){return applyKeywordWorkspace(items,rootWorkspaceState);}
function linkedKeyword(row){const encoded=row?.dataset?.keywordLabKeyword;if(encoded){try{return decodeURIComponent(encoded);}catch{return encoded;}}const link=row?.querySelector?.('[data-r-detail]');if(link?.dataset?.rDetail){try{return decodeURIComponent(link.dataset.rDetail);}catch{return clean(link.textContent);}}return clean(link?.textContent);}
function bindDeleteButton(button){if(!button||button.dataset.keywordLabDeleteBound==='1')return;button.dataset.keywordLabDeleteBound='1';button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();let value='';try{value=decodeURIComponent(button.dataset.keywordLabDelete||'');}catch{value=button.dataset.keywordLabDelete||'';}setRootWorkspaceState({type:'delete-keyword',value});});}
function syncLinkedTables(){const content=$('#content');if(!content)return;const active=normalizeRootWorkspaceState(rootWorkspaceState).activeRoot;content.querySelectorAll('.data-workspace .data-table tbody tr,[data-keyword-lab-batch-results] tbody tr').forEach(row=>{const keyword=linkedKeyword(row);if(!keyword)return;row.hidden=!applyKeywordWorkspace([{keyword}],rootWorkspaceState).length;const label=row.querySelector('.keyword-lab-keyword-text,[data-r-detail]');if(label)label.innerHTML=highlightKeywordHtml(keyword,active);let button=row.querySelector('[data-keyword-lab-delete]');if(!button&&label){label.insertAdjacentHTML('afterend',` <button type="button" class="btn sm" data-keyword-lab-delete="${encodeURIComponent(keyword)}">${escapeHtml(labels(root.KeywordOSI18N?.getLanguage?.()||'en').deleteRow)}</button>`);button=row.querySelector('[data-keyword-lab-delete]');}bindDeleteButton(button);});}
''' + runtime_anchor
replace_once('keyword-lab.js', runtime_anchor, runtime_code, 'keyword-lab root runtime')

replace_once(
    'keyword-lab.js',
    "function enhance(){auditTimer=0;applyShell();renderBatchWorkspace();}",
    "function enhance(){auditTimer=0;applyShell();renderBatchWorkspace();renderRootWorkspace();syncLinkedTables();}",
    'keyword-lab enhance'
)
replace_once(
    'keyword-lab.js',
    "return Object.assign(PUBLIC_API,{shellSignature,currentRows,uiMode,applyShell,renderBatchWorkspace,activate,start});",
    "return Object.assign(PUBLIC_API,{shellSignature,currentRows,uiMode,applyShell,renderBatchWorkspace,renderRootWorkspace,filterLegacyAdsItems,activate,start});",
    'keyword-lab browser api'
)

# app.js: let the legacy Ads table consume the same view filter and expose render for deterministic refresh.
replace_once(
    'app.js',
    "if(r.matchType!=='all')items=items.filter(x=>x.matchTypes.includes(r.matchType));return items;}",
    "if(r.matchType!=='all')items=items.filter(x=>x.matchTypes.includes(r.matchType));return window.KeywordOSKeywordLab?.filterLegacyAdsItems?.(items)||items;}",
    'app research view filter'
)
replace_once(
    'app.js',
    "window.KeywordOSUIBridge={get page(){return state.page},get settings(){return state.settings},get adsRows(){return state.currentRows},get financeRows(){return state.financeRows},get actions(){return state.actions},get datasetRegistry(){return state.datasetRegistry},getRangeRows,aggregateLevel,isProtected,toast,syncKeywordAssets,stageKeywordAsset,async refreshDatasetRegistry(){state.datasetRegistry=await (datasetRegistry?.list('store-a')||[]);return state.datasetRegistry;}};",
    "window.KeywordOSUIBridge={get page(){return state.page},get settings(){return state.settings},get adsRows(){return state.currentRows},get financeRows(){return state.financeRows},get actions(){return state.actions},get datasetRegistry(){return state.datasetRegistry},getRangeRows,aggregateLevel,isProtected,toast,syncKeywordAssets,stageKeywordAsset,render,async refreshDatasetRegistry(){state.datasetRegistry=await (datasetRegistry?.list('store-a')||[]);return state.datasetRegistry;}};",
    'app bridge render'
)

# Capability truth: Common Words is real now and scrolls to the canonical Keyword Lab workspace.
replace_once('ui-capability-guard.js', "wordFrequency:'Word Frequency'", "wordFrequency:'Common Words'", 'guard en common words')
replace_once('ui-capability-guard.js', "wordFrequency:'词频'", "wordFrequency:'常用词'", 'guard zh common words')
replace_once('ui-capability-guard.js', "wordFrequency:'词频 / Word Frequency'", "wordFrequency:'常用词 / Common Words'", 'guard bi common words')
replace_once(
    'ui-capability-guard.js',
    "commonWords.title='Scrolls to literal word frequency for the currently filtered Ads terms; no Common Words exclusion manager is implemented yet.';",
    "commonWords.title='Opens the Keyword Lab n-gram and Common Words workspace, where roots can filter/highlight linked results or be excluded without mutating source evidence.';",
    'guard common words truth title'
)
replace_once(
    'ui-capability-guard.js',
    "['.utility-links .utility-link:nth-child(2)',()=>$('.wordcloud')?.closest('.summary-card')?.scrollIntoView({block:'center',behavior:'smooth'})],",
    "['.utility-links .utility-link:nth-child(2)',()=> $('[data-keyword-lab-roots]')?.scrollIntoView({block:'center',behavior:'smooth'})],",
    'guard common words binding'
)

# Tests: pure n-gram semantics, reducer, filtering/highlight, and runtime wiring.
tests = Path('tests/keyword-lab.test.mjs')
text = tests.read_text()
append = r'''

test('Keyword Lab n-grams use contiguous token matches with 1/2/3+ modes and edge stopword control', () => {
  assert.deepEqual(lab.keywordTokens('Reading-glasses for Women 2.0'), ['reading-glasses','for','women','2.0']);
  assert.deepEqual(lab.extractNgrams('reading glasses for women', '1', { ignoreStopwords:true }), ['reading','glasses','women']);
  assert.deepEqual(lab.extractNgrams('reading glasses for women', '2', { ignoreStopwords:true }), ['reading glasses','glasses for']);
  assert.deepEqual(lab.extractNgrams('reading glasses for women', '3+', { ignoreStopwords:true }), ['glasses for women','reading glasses for women']);
  assert.equal(lab.containsGram('reading glasses for women', 'glasses for'), true);
  assert.equal(lab.containsGram('reading glasses for women', 'reader'), false);
});

test('n-gram frequency counts result rows once per root and sorts deterministically', () => {
  const rows = [{keyword:'reading glasses women'},{keyword:'reading glasses men'},{keyword:'blue light glasses'}];
  assert.deepEqual(lab.ngramFrequency(rows,'2',{ignoreStopwords:true,limit:3}), [
    {gram:'reading glasses',count:2},
    {gram:'blue light',count:1},
    {gram:'glasses men',count:1}
  ]);
});

test('Common Words exclusion and delete/restore are reversible view state only', () => {
  const rows = [{keyword:'reading glasses women'},{keyword:'blue light glasses'},{keyword:'computer readers'}];
  let state = lab.normalizeRootWorkspaceState({});
  state = lab.reduceRootWorkspaceState(state,{type:'select-root',value:'glasses'});
  assert.deepEqual(lab.applyKeywordWorkspace(rows,state).map(row=>row.keyword), ['reading glasses women','blue light glasses']);
  state = lab.reduceRootWorkspaceState(state,{type:'exclude-root',value:'blue light'});
  assert.deepEqual(lab.applyKeywordWorkspace(rows,state).map(row=>row.keyword), ['reading glasses women']);
  state = lab.reduceRootWorkspaceState(state,{type:'delete-keyword',value:'reading glasses women'});
  assert.deepEqual(lab.applyKeywordWorkspace(rows,state), []);
  state = lab.reduceRootWorkspaceState(state,{type:'restore-keyword',value:'reading glasses women'});
  state = lab.reduceRootWorkspaceState(state,{type:'include-root',value:'blue light'});
  assert.deepEqual(lab.applyKeywordWorkspace(rows,state).map(row=>row.keyword), ['reading glasses women','blue light glasses']);
  assert.deepEqual(rows.map(row=>row.keyword), ['reading glasses women','blue light glasses','computer readers'], 'source evidence must remain untouched');
});

test('root highlight marks only the selected phrase and escapes source text', () => {
  assert.equal(lab.highlightKeywordHtml('Reading Glasses <Women>', 'reading glasses'), '<mark>Reading Glasses</mark> &lt;Women&gt;');
});

test('Keyword Lab runtime owns the Common Words workspace and links the legacy Ads table through the same view filter', async () => {
  const source = await readFile(new URL('../keyword-lab.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(source, /data-keyword-lab-gram-mode/);
  assert.match(source, /data-keyword-lab-exclude-root/);
  assert.match(source, /data-keyword-lab-delete/);
  assert.match(source, /data-keyword-lab-restore/);
  assert.match(app, /KeywordOSKeywordLab\?\.filterLegacyAdsItems/);
  assert.match(app, /stageKeywordAsset,render,/);
});
'''
if "Keyword Lab n-grams use contiguous token matches" in text:
    raise SystemExit('keyword-lab tests already patched')
tests.write_text(text + append)

ui_tests = Path('tests/ui-capability-guard.test.mjs')
text = ui_tests.read_text()
text = text.replace("assert.equal(guard.researchTruthLabels('en').wordFrequency, 'Word Frequency');", "assert.equal(guard.researchTruthLabels('en').wordFrequency, 'Common Words');")
text = text.replace("assert.equal(guard.researchTruthLabels('bi').wordFrequency, '词频 / Word Frequency');", "assert.equal(guard.researchTruthLabels('bi').wordFrequency, '常用词 / Common Words');")
text = text.replace("test('Keyword Research truth pass advertises real Batch Analysis while Common Words and saved presets remain unavailable', async () => {", "test('Keyword Lab truth pass advertises real Batch Analysis and the implemented Common Words workspace while saved presets remain unavailable', async () => {")
text = text.replace("  assert.match(source, /no Common Words exclusion manager is implemented yet/);", "  assert.match(source, /Keyword Lab n-gram and Common Words workspace/);\n  assert.match(source, /data-keyword-lab-roots/);")
ui_tests.write_text(text)

# README truth update and next-task handoff.
replace_once(
    'README.md',
    "| [keyword-lab.js](./keyword-lab.js) | Keyword Lab 三模式运行时壳与 source-aware 统一结果契约 | ✅ 三模式、五来源 exact merge、source-aware 指标冲突与 canonical Keyword Lab 页面身份已统一 |",
    "| [keyword-lab.js](./keyword-lab.js) | Keyword Lab 三模式、source-aware 结果契约与 n-gram/Common Words 结果视图 | ✅ 三模式、五来源 exact merge、1/2/3+ gram、Common Words 排除、删除/恢复与词根联动已统一 |",
    'README architecture keyword lab'
)
replace_once(
    'README.md',
    "- ✅ P0 语义收口：原 `Common Words` 入口已准确改名为 **Word Frequency / 词频**，继续只滚动到当前过滤结果的字面词频；无 handler 的 `Save as Filter Preset` 已隐藏。Common Words 排除、删除/恢复、保存筛选和完整列视图仍作为 P1 功能，不再在当前页伪装为已可用。\n- ✅ Keyword Lab 的 Word Frequency / Learn / Search / Settings 工具按钮按 canonical `cerebro` route id 直接接线，不依赖可见标题；Batch Analysis、Word Frequency 与隐藏保存预设的状态同样由该 route 的 truth pass 驱动。",
    "- ✅ Keyword Lab 的 **Common Words** 入口现在直接打开统一 n-gram 工作区：支持 1/2/3+ gram、首尾停用词控制、词根筛选/高亮、Common Words 排除以及关键词删除/恢复；这些动作只改变当前结果视图，不修改 Dataset Registry 或原始导入证据。\n- ✅ Keyword Lab 的 Common Words / Learn / Search / Settings 工具按钮按 canonical `cerebro` route id 接线，不依赖可见标题；Batch Analysis 与 Common Words 的状态由同一 route truth pass 驱动，未实现的保存筛选仍继续隐藏。",
    'README keyword truth bullets'
)
replace_once(
    'README.md',
    "| Keyword Distribution、Word Frequency、可拖动/显隐列、删除/恢复、历史、复制和导出 | 做成真实可操作的词根筛选、列视图和回收站 | 🟡 当前 Word Frequency 只展示字面词频，闭环仍未实现 |",
    "| Keyword Distribution、Word Frequency、可拖动/显隐列、删除/恢复、历史、复制和导出 | 做成真实可操作的词根筛选、列视图和回收站 | 🟡 1/2/3+ gram、Common Words 排除、删除/恢复和词根联动已完成；列视图、历史与导出仍待闭环 |",
    'README benchmark root gap'
)
replace_once(
    'README.md',
    "- [ ] 完成可点击 1/2/3+ gram、停用词、Common Words 排除、删除/恢复、词根高亮和原表联动。",
    "- [x] 完成可点击 1/2/3+ gram、停用词、Common Words 排除、删除/恢复、词根高亮和原表联动。\n  - 2026-09-03：`keyword-lab.js` 在统一 `currentRows()` 结果之上增加可测试的 token / contiguous n-gram / root-view reducer：1/2/3+ gram 统计按结果行计数，停用词模式只忽略 n-gram 首尾常见功能词，不把非连续 token 拼成伪短语；root 点击使用完整 token 序列匹配并联动筛选、高亮当前结果。Common Words 排除、keyword delete/restore 都是可逆 view state，不写回 Ads、第三方 CSV 或 Dataset Registry。`app.js` 的 legacy Ads result table 通过 `filterLegacyAdsItems()` 消费同一 view state，因此页码/结果数会跟随 root、排除与删除状态；Batch 结果表同样消费这套状态。原只读 Word Frequency summary 在 Keyword Lab 中被统一 n-gram workspace 取代，`ui-capability-guard.js` 把 canonical `cerebro` 的第二个工具入口恢复为真实 **Common Words / 常用词** 并滚动到该 workspace。CI 为 **334 passed / 0 failed**；`npm run build` 验证 **42 个 JS + 9 个 CSS，52 个发布文件**，source/dist byte identity 与 committed-dist parity gate 全部通过。",
    'README P1 root task'
)
