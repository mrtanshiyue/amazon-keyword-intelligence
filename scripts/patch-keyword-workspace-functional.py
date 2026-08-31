from pathlib import Path
import re

app_path = Path('app.js')
ui_path = Path('ui-actions.js')
app = app_path.read_text(encoding='utf-8')
ui = ui_path.read_text(encoding='utf-8')


def replace_app(pattern, replacement, label):
    global app
    app, count = re.subn(pattern, replacement, app, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')


def replace_ui(pattern, replacement, label):
    global ui
    ui, count = re.subn(pattern, replacement, ui, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')

old_storage = "suggestionReviews:'keywordos_v9_suggestion_reviews', schedules:'keywordos_v9_schedules', globalUi:'keywordos_v9_global_ui'"
new_storage = "suggestionReviews:'keywordos_v9_suggestion_reviews', schedules:'keywordos_v9_schedules', globalUi:'keywordos_v9_global_ui', keywordTags:'keywordos_v9_keyword_tags', keywordUi:'keywordos_v9_keyword_ui', trackerUi:'keywordos_v9_tracker_ui', changeLogUi:'keywordos_v9_change_log_ui', researchHistory:'keywordos_v9_research_history'"
if app.count(old_storage) != 1:
    raise SystemExit('storage insertion marker not unique')
app = app.replace(old_storage, new_storage, 1)

old_state = "  globalUi:load(STORAGE.globalUi,{crossStoreView:'performance',keywordSearch:'',keywordStatus:'all',keywordSort:'sales_desc',keywordPageNo:1,keywordPageSize:25}),\n  presets:load(STORAGE.presets,["
new_state = "  globalUi:load(STORAGE.globalUi,{crossStoreView:'performance',keywordSearch:'',keywordStatus:'all',keywordSort:'sales_desc',keywordPageNo:1,keywordPageSize:25}),\n  keywordTags:load(STORAGE.keywordTags,{}),\n  keywordUi:load(STORAGE.keywordUi,{search:'',lifecycle:'all',tag:'all',columns:['lifecycle','tags','protected','products','campaigns','clicks','orders','spend','sales','acos','cvr']}),\n  trackerUi:load(STORAGE.trackerUi,{search:'',tag:'all'}),\n  changeLogUi:load(STORAGE.changeLogUi,{search:'',source:'all',type:'all'}),\n  researchHistory:load(STORAGE.researchHistory,[]),\n  presets:load(STORAGE.presets,["
if app.count(old_state) != 1:
    raise SystemExit('state insertion marker not unique')
app = app.replace(old_state, new_state, 1)

old_timer = "let globalKeywordSearchTimer=null;"
new_timer = "let globalKeywordSearchTimer=null,keywordLibrarySearchTimer=null,trackerSearchTimer=null,changeLogSearchTimer=null;"
if app.count(old_timer) != 1:
    raise SystemExit('timer marker not unique')
app = app.replace(old_timer, new_timer, 1)

replace_app(
    r"function renderChangeLog\(\)\{.*?\n\}\n\nfunction researchTerms",
    """function filteredChangeLogs(){let rows=[...state.logs];const q=String(state.changeLogUi.search||'').trim().toLowerCase(),source=String(state.changeLogUi.source||'all').toLowerCase(),type=String(state.changeLogUi.type||'all');if(q)rows=rows.filter(l=>[l.date,l.type,l.target,l.campaign,l.change,l.source,l.by].some(v=>String(v||'').toLowerCase().includes(q)));if(source!=='all')rows=rows.filter(l=>String(l.source||'').toLowerCase()===source);if(type!=='all')rows=rows.filter(l=>l.type===type);return rows;}
function exportChangeLogs(rows){const head=['Date','Change Type','Target','Campaign','Change','Source','Changed By'];const csv=[head.map(csvq).join(','),...rows.map(l=>[l.date,l.type,l.target,l.campaign||'—',l.change,l.source,l.by].map(csvq).join(','))].join('\\n');download(`KeywordOS_change_log_${today()}.csv`,csv,'text/csv;charset=utf-8');}
function renderChangeLog(){const sourceTabs=['All','Automatic','Semi-auto','Manual','Import'],types=[...new Set(state.logs.map(l=>l.type).filter(Boolean))].sort(),sources=[...new Set(state.logs.map(l=>l.source).filter(Boolean))].sort(),rows=filteredChangeLogs();$('#content').innerHTML=`<div class=\"change-source-tabs\">${sourceTabs.map(x=>`<button class=\"source-pill ${String(state.changeLogUi.source||'all').toLowerCase()===x.toLowerCase()?'active':''}\" data-log-source=\"${x.toLowerCase()}\">${x}</button>`).join('')}</div><div class=\"data-workspace\"><div class=\"toolbar\"><div class=\"searchbox\"><input class=\"input\" id=\"log-search\" value=\"${esc(state.changeLogUi.search||'')}\" placeholder=\"Search target, rule, campaign or change\"></div><div class=\"toolbar-right\"><select class=\"select\" id=\"log-type-filter\"><option value=\"all\">All change types</option>${types.map(x=>`<option value=\"${esc(x)}\" ${state.changeLogUi.type===x?'selected':''}>${esc(x)}</option>`).join('')}</select><select class=\"select\" id=\"log-source-filter\"><option value=\"all\">All sources</option>${sources.map(x=>`<option value=\"${esc(String(x).toLowerCase())}\" ${String(state.changeLogUi.source||'all').toLowerCase()===String(x).toLowerCase()?'selected':''}>${esc(x)}</option>`).join('')}</select><span class=\"result-count\">${fmtInt(rows.length)} / ${fmtInt(state.logs.length)}</span><button class=\"btn\" id=\"log-export\">⇩ Export filtered</button></div></div><div class=\"table-scroll\"><table class=\"data-table\"><thead><tr><th class=\"left\">Date</th><th class=\"left\">Change Type</th><th class=\"left\">Target</th><th class=\"left\">Campaign</th><th class=\"left\">Change</th><th class=\"left\">Source</th><th class=\"left\">Changed By</th></tr></thead><tbody>${rows.length?rows.map(l=>`<tr><td class=\"left\">${esc(l.date)}</td><td class=\"left\">${badge(l.type,l.type.includes('Negative')||l.type.includes('Block')?'red':l.type.includes('Import')?'blue':'gray')}</td><td class=\"left\"><b>${esc(l.target)}</b></td><td class=\"left\">${esc(l.campaign||'—')}</td><td class=\"left\">${esc(l.change)}</td><td class=\"left\">${esc(l.source)}</td><td class=\"left\">${esc(l.by)}</td></tr>`).join(''):`<tr><td colspan=\"7\"><div class=\"empty-state\"><h3>No log entries match</h3><p>Clear search or filters to restore the audit trail.</p></div></td></tr>`}</tbody></table></div></div>`;$$('[data-log-source]').forEach(b=>b.addEventListener('click',()=>{state.changeLogUi.source=b.dataset.logSource;save(STORAGE.changeLogUi,state.changeLogUi);render();}));$('#log-source-filter')?.addEventListener('change',e=>{state.changeLogUi.source=e.target.value;save(STORAGE.changeLogUi,state.changeLogUi);render();});$('#log-type-filter')?.addEventListener('change',e=>{state.changeLogUi.type=e.target.value;save(STORAGE.changeLogUi,state.changeLogUi);render();});$('#log-search')?.addEventListener('input',e=>{state.changeLogUi.search=e.target.value;save(STORAGE.changeLogUi,state.changeLogUi);clearTimeout(changeLogSearchTimer);changeLogSearchTimer=setTimeout(()=>{render();requestAnimationFrame(()=>{const input=$('#log-search');if(input){input.focus();const n=input.value.length;input.setSelectionRange(n,n);}});},120);});$('#log-export')?.addEventListener('click',()=>exportChangeLogs(rows));}

function researchTerms""",
    'Change Log block',
)

history_helpers = """function recordResearchHistory(query,mode,resultCount){const q=String(query||'').trim();if(!q)return;const item={id:'rh-'+Date.now(),query:q,mode:mode==='analyze'?'analyze':'suggest',resultCount:Number(resultCount||0),createdAt:new Date().toLocaleString()};state.researchHistory=[item,...state.researchHistory.filter(x=>!(String(x.query).toLowerCase()===q.toLowerCase()&&x.mode===item.mode))].slice(0,30);save(STORAGE.researchHistory,state.researchHistory);}
function openResearchHistory(){openModal('Cerebro Research History',state.researchHistory.length?`<div class=\"preset-list\">${state.researchHistory.map((h,i)=>`<div class=\"preset-item\"><div class=\"preset-icon\">⌕</div><div class=\"preset-copy\"><b>${esc(h.query)}</b><small>${h.mode==='analyze'?'Analyze':'Suggestions'} · ${fmtInt(h.resultCount)} results · ${esc(h.createdAt)}</small></div><button class=\"btn sm\" data-research-history-run=\"${i}\">Run again</button></div>`).join('')}</div>`:`<div class=\"empty-state\"><h3>No research history yet</h3><p>Run a Cerebro query and it will be saved locally in this browser.</p></div>`,[{label:'Clear History',type:'danger',action:()=>{state.researchHistory=[];save(STORAGE.researchHistory,state.researchHistory);closeModal();toast('Research history cleared','success');}},{label:'Close',action:closeModal}]);setTimeout(()=>{$$('[data-research-history-run]').forEach(b=>b.addEventListener('click',()=>{const h=state.researchHistory[+b.dataset.researchHistoryRun];if(!h)return;state.researchMode=h.mode;state.research.query=h.query;state.pageNo=1;closeModal();render();}));},0);}
"""
marker = "function researchTerms()"
if app.count(marker) != 1:
    raise SystemExit('researchTerms marker not unique')
app = app.replace(marker, history_helpers + marker, 1)

old_history_button = '<button class="utility-link">History</button>'
new_history_button = '<button class="utility-link" id="research-history">History</button>'
if app.count(old_history_button) != 1:
    raise SystemExit('Cerebro History button marker not unique')
app = app.replace(old_history_button, new_history_button, 1)

old_options = '<div class="search-options"><label><input type="checkbox" checked> Amazon.com</label><label><input type="checkbox"> Exclude variations</label><span>Source: Amazon Ads search-term report</span></div>'
new_options = '<div class="search-options"><label title="Marketplace is fixed by the currently loaded report"><input type="checkbox" checked disabled> Amazon.com</label><label title="Variation relationships are not present in the imported Ads report"><input type="checkbox" disabled> Exclude variations · unavailable</label><span>Source: Amazon Ads search-term report</span></div>'
if app.count(old_options) != 1:
    raise SystemExit('Cerebro search options marker not unique')
app = app.replace(old_options, new_options, 1)

old_go = "$('#research-go')?.addEventListener('click',()=>{state.research.query=$('#research-query').value;state.pageNo=1;render();});"
new_go = "$('#research-go')?.addEventListener('click',()=>{state.research.query=$('#research-query').value;state.pageNo=1;const count=researchTerms().length;recordResearchHistory(state.research.query,state.researchMode,count);render();});$('#research-history')?.addEventListener('click',openResearchHistory);"
if app.count(old_go) != 1:
    raise SystemExit('research-go binding marker not unique')
app = app.replace(old_go, new_go, 1)

keyword_helpers_and_functions = r'''const KEYWORD_LIBRARY_COLUMNS=[['lifecycle','Lifecycle'],['tags','Tags'],['protected','Protected'],['products','Products'],['campaigns','Campaigns'],['clicks','Clicks'],['orders','Orders'],['spend','Spend'],['sales','Sales'],['acos','ACoS'],['cvr','CVR']];
function normalizeKeywordTags(values){return [...new Set((Array.isArray(values)?values:String(values||'').split(',')).map(x=>String(x).trim().replace(/\s+/g,' ')).filter(Boolean))].slice(0,12);}
function keywordTagsFor(term){return normalizeKeywordTags(state.keywordTags[String(term||'').toLowerCase()]||[]);}
function allKeywordTags(){return [...new Set(Object.values(state.keywordTags).flatMap(v=>normalizeKeywordTags(v)))].sort((a,b)=>a.localeCompare(b));}
function openKeywordTagEditor(term){const current=keywordTagsFor(term);openModal('Keyword Tags',`<div class="form-field"><label>${esc(term)}</label><input class="input" id="keyword-tag-input" value="${esc(current.join(', '))}" placeholder="brand, seasonal, high intent"></div><div class="notice-banner top-gap">Tags are local workspace metadata shared by Keyword Library and Keyword Tracker.</div>`,[{label:'Cancel',action:closeModal},{label:'Save Tags',type:'primary',action:()=>{const tags=normalizeKeywordTags($('#keyword-tag-input')?.value||'');const key=String(term).toLowerCase();if(tags.length)state.keywordTags[key]=tags;else delete state.keywordTags[key];save(STORAGE.keywordTags,state.keywordTags);closeModal();toast('Keyword tags saved','success');render();}}]);}
function filteredTrackerRows(){const terms=aggregateLevel(getRangeRows(),'searchterm'),q=String(state.trackerUi.search||'').trim().toLowerCase(),tag=state.trackerUi.tag||'all';let rows=state.tracked.map(t=>terms.find(x=>x.name===t)).filter(Boolean);if(q)rows=rows.filter(x=>x.name.toLowerCase().includes(q)||keywordTagsFor(x.name).some(t=>t.toLowerCase().includes(q)));if(tag!=='all')rows=rows.filter(x=>keywordTagsFor(x.name).includes(tag));return rows;}
function exportTrackerRows(rows){const head=['Keyword','Tags','Ad Impressions','Clicks','Orders','CVR','Spend','Sales','ACoS'];const csv=[head.map(csvq).join(','),...rows.map(x=>[x.name,keywordTagsFor(x.name).join('|'),x.impressions,x.clicks,x.orders,x.cvr==null?'':(x.cvr*100).toFixed(2)+'%',x.spend,x.sales,x.acos==null?'':(x.acos*100).toFixed(2)+'%'].map(csvq).join(','))].join('\n');download(`KeywordOS_tracked_keywords_${today()}.csv`,csv,'text/csv;charset=utf-8');}
function renderTracker(){const tracked=filteredTrackerRows(),tags=allKeywordTags();$('#content').innerHTML=`<div class="notice-banner" style="margin-bottom:12px"><b>Rank data connection:</b> Organic Rank / Sponsored Rank is intentionally not fabricated. This page tracks paid performance and local keyword metadata only.</div><div class="data-workspace"><div class="toolbar"><div class="toolbar-left"><div class="searchbox"><input id="tracker-search" class="input" value="${esc(state.trackerUi.search||'')}" placeholder="Search tracked keywords or tags"></div><select id="tracker-tag-filter" class="select"><option value="all">All tags</option>${tags.map(t=>`<option value="${esc(t)}" ${state.trackerUi.tag===t?'selected':''}>${esc(t)}</option>`).join('')}</select><span class="result-count">${tracked.length} tracked</span></div><div class="toolbar-right"><button class="btn" id="add-track">＋ Add Keywords</button><button class="btn" id="tracker-export">⇩ Export filtered</button></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th class="left">Keyword</th><th class="left">Tags</th><th>Ad Impressions</th><th class="locked">Organic Rank</th><th class="locked">Sponsored Rank</th><th>Clicks</th><th>Orders</th><th>CVR</th><th>Spend</th><th>Sales</th><th>ACoS</th><th class="center">Track</th></tr></thead><tbody>${tracked.length?tracked.map(x=>{const rowTags=keywordTagsFor(x.name);return `<tr><td class="left"><span class="entity-link" data-track-detail="${encodeURIComponent(x.name)}">${esc(x.name)}</span></td><td class="left"><button class="btn ghost sm" data-tag-edit="${encodeURIComponent(x.name)}">${rowTags.length?rowTags.map(esc).join(' · '):'＋ Add tag'}</button></td><td>${fmtInt(x.impressions)}</td><td class="locked">Not connected</td><td class="locked">Not connected</td><td>${fmtInt(x.clicks)}</td><td>${fmtInt(x.orders)}</td><td class="${metricClassCvr(x.cvr)}">${fmtPct(x.cvr)}</td><td>${fmtMoney(x.spend)}</td><td>${fmtMoney(x.sales)}</td><td class="${metricClassAcos(x.acos)}">${fmtPct(x.acos)}</td><td class="center"><span class="toggle on" data-untrack="${encodeURIComponent(x.name)}"></span></td></tr>`;}).join(''):`<tr><td colspan="12"><div class="empty-state"><h3>No tracked keywords match</h3><p>Change the search/tag filter or add keywords from Cerebro.</p></div></td></tr>`}</tbody></table></div></div>`;$$('[data-untrack]').forEach(t=>t.addEventListener('click',()=>{state.tracked=state.tracked.filter(x=>x!==decodeURIComponent(t.dataset.untrack));save(STORAGE.tracked,state.tracked);render();}));$$('[data-track-detail]').forEach(a=>a.addEventListener('click',()=>openSearchTermDetail(decodeURIComponent(a.dataset.trackDetail),getRangeRows())));$$('[data-tag-edit]').forEach(b=>b.addEventListener('click',()=>openKeywordTagEditor(decodeURIComponent(b.dataset.tagEdit))));$('#add-track')?.addEventListener('click',()=>{state.page='cerebro';render();toast('Select keywords in Cerebro and choose Track','success');});$('#tracker-search')?.addEventListener('input',e=>{state.trackerUi.search=e.target.value;save(STORAGE.trackerUi,state.trackerUi);clearTimeout(trackerSearchTimer);trackerSearchTimer=setTimeout(()=>{render();requestAnimationFrame(()=>{const input=$('#tracker-search');if(input){input.focus();const n=input.value.length;input.setSelectionRange(n,n);}});},120);});$('#tracker-tag-filter')?.addEventListener('change',e=>{state.trackerUi.tag=e.target.value;save(STORAGE.trackerUi,state.trackerUi);render();});$('#tracker-export')?.addEventListener('click',()=>exportTrackerRows(tracked));}

function classifyKeyword(x){if(isProtected(x.name))return['Protected','blue'];if(x.orders>=3&&x.acos!=null&&x.acos<=.35)return['Core','green'];if(x.orders>=2&&x.acos!=null&&x.acos<=state.settings.harvestAcos/100)return['Winner','green'];if(x.orders===0&&x.clicks>=state.settings.negativeClicks&&x.spend>=state.settings.negativeSpend)return['Negative Candidate','red'];if(x.orders===0&&x.clicks>=6)return['Weak','amber'];return['Testing','gray'];}
function filteredKeywordLibraryRows(){let rows=aggregateLevel(getRangeRows(),'searchterm').sort((a,b)=>b.sales-a.sales);const q=String(state.keywordUi.search||'').trim().toLowerCase(),lifecycle=state.keywordUi.lifecycle||'all',tag=state.keywordUi.tag||'all';if(q)rows=rows.filter(x=>x.name.toLowerCase().includes(q)||keywordTagsFor(x.name).some(t=>t.toLowerCase().includes(q)));if(lifecycle!=='all')rows=rows.filter(x=>classifyKeyword(x)[0]===lifecycle);if(tag!=='all')rows=rows.filter(x=>keywordTagsFor(x.name).includes(tag));return rows;}
function keywordLibraryVisibleColumns(){const valid=new Set(KEYWORD_LIBRARY_COLUMNS.map(x=>x[0])),configured=Array.isArray(state.keywordUi.columns)?state.keywordUi.columns:[];const selected=configured.filter(x=>valid.has(x));return selected.length?selected:KEYWORD_LIBRARY_COLUMNS.map(x=>x[0]);}
function keywordLibraryCell(x,key){if(key==='lifecycle'){const [s,c]=classifyKeyword(x);return badge(s,c);}if(key==='tags'){const tags=keywordTagsFor(x.name);return `<button class="btn ghost sm" data-tag-edit="${encodeURIComponent(x.name)}">${tags.length?tags.map(esc).join(' · '):'＋ Add tag'}</button>`;}if(key==='protected')return `<span class="toggle ${isProtected(x.name)?'on':''}" data-protect="${encodeURIComponent(x.name)}"></span>`;if(key==='products')return fmtInt(x.products);if(key==='campaigns')return fmtInt(x.campaigns);if(key==='clicks')return fmtInt(x.clicks);if(key==='orders')return fmtInt(x.orders);if(key==='spend')return fmtMoney(x.spend);if(key==='sales')return fmtMoney(x.sales);if(key==='acos')return fmtPct(x.acos);if(key==='cvr')return fmtPct(x.cvr);return '—';}
function openKeywordColumnManager(){const visible=new Set(keywordLibraryVisibleColumns());openModal('Keyword Library Columns',`<div class="mapping-list">${KEYWORD_LIBRARY_COLUMNS.map(([key,label])=>`<label class="mapping-row"><input type="checkbox" data-keyword-column="${key}" ${visible.has(key)?'checked':''}><b>${label}</b><span>Show in Keyword Library</span></label>`).join('')}</div>`,[{label:'Reset',action:()=>{state.keywordUi.columns=KEYWORD_LIBRARY_COLUMNS.map(x=>x[0]);save(STORAGE.keywordUi,state.keywordUi);closeModal();render();}},{label:'Save Columns',type:'primary',action:()=>{const selected=$$('[data-keyword-column]:checked').map(x=>x.dataset.keywordColumn);state.keywordUi.columns=selected.length?selected:KEYWORD_LIBRARY_COLUMNS.map(x=>x[0]);save(STORAGE.keywordUi,state.keywordUi);closeModal();render();}}]);}
function exportKeywordLibrary(rows){const visible=keywordLibraryVisibleColumns(),head=['Keyword',...visible.map(k=>KEYWORD_LIBRARY_COLUMNS.find(x=>x[0]===k)?.[1]||k)];const value=(x,k)=>k==='lifecycle'?classifyKeyword(x)[0]:k==='tags'?keywordTagsFor(x.name).join('|'):k==='protected'?(isProtected(x.name)?'Yes':'No'):k==='acos'?(x.acos==null?'':(x.acos*100).toFixed(2)+'%'):k==='cvr'?(x.cvr==null?'':(x.cvr*100).toFixed(2)+'%'):x[k]??'';const csv=[head.map(csvq).join(','),...rows.map(x=>[x.name,...visible.map(k=>value(x,k))].map(csvq).join(','))].join('\n');download(`KeywordOS_keyword_library_${today()}.csv`,csv,'text/csv;charset=utf-8');}
function renderKeywordLibrary(){const all=aggregateLevel(getRangeRows(),'searchterm'),items=filteredKeywordLibraryRows(),tags=allKeywordTags(),lifecycles=[...new Set(all.map(x=>classifyKeyword(x)[0]))].sort(),visible=keywordLibraryVisibleColumns(),display=items.slice(0,500);$('#content').innerHTML=`<div class="data-workspace"><div class="toolbar"><div class="toolbar-left"><div class="searchbox"><input id="kw-search" class="input" value="${esc(state.keywordUi.search||'')}" placeholder="Search keyword or tag"></div><select id="kw-lifecycle-filter" class="select"><option value="all">All lifecycles</option>${lifecycles.map(x=>`<option value="${esc(x)}" ${state.keywordUi.lifecycle===x?'selected':''}>${esc(x)}</option>`).join('')}</select><select id="kw-tag-filter" class="select"><option value="all">All tags</option>${tags.map(x=>`<option value="${esc(x)}" ${state.keywordUi.tag===x?'selected':''}>${esc(x)}</option>`).join('')}</select><span class="result-count">${fmtInt(items.length)} / ${fmtInt(all.length)} assets</span></div><div class="toolbar-right"><button class="btn" id="kw-columns">☷ Columns</button><button class="btn" id="kw-export">⇩ Export filtered</button><button class="btn primary" data-nav="cerebro">＋ Research Keywords</button></div></div><div class="table-scroll"><table class="data-table"><thead><tr><th class="left">Keyword Asset</th>${visible.map(k=>`<th class="${['lifecycle','tags'].includes(k)?'left':k==='protected'?'center':''}">${esc(KEYWORD_LIBRARY_COLUMNS.find(x=>x[0]===k)?.[1]||k)}</th>`).join('')}</tr></thead><tbody>${display.length?display.map(x=>`<tr><td class="left"><span class="entity-link" data-kw-detail="${encodeURIComponent(x.name)}">${esc(x.name)}</span></td>${visible.map(k=>`<td class="${['lifecycle','tags'].includes(k)?'left':k==='protected'?'center':k==='acos'?metricClassAcos(x.acos):k==='cvr'?metricClassCvr(x.cvr):''}">${keywordLibraryCell(x,k)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${visible.length+1}"><div class="empty-state"><h3>No keyword assets match</h3><p>Clear the search, lifecycle or tag filter.</p></div></td></tr>`}</tbody></table></div><div class="table-footer"><div>Showing ${fmtInt(display.length)} of ${fmtInt(items.length)} filtered assets · export includes all filtered rows</div></div></div>`;$$('[data-protect]').forEach(t=>t.addEventListener('click',()=>toggleProtect(decodeURIComponent(t.dataset.protect))));$$('[data-kw-detail]').forEach(a=>a.addEventListener('click',()=>openSearchTermDetail(decodeURIComponent(a.dataset.kwDetail),getRangeRows())));$$('[data-tag-edit]').forEach(b=>b.addEventListener('click',()=>openKeywordTagEditor(decodeURIComponent(b.dataset.tagEdit))));$('#kw-search')?.addEventListener('input',e=>{state.keywordUi.search=e.target.value;save(STORAGE.keywordUi,state.keywordUi);clearTimeout(keywordLibrarySearchTimer);keywordLibrarySearchTimer=setTimeout(()=>{render();requestAnimationFrame(()=>{const input=$('#kw-search');if(input){input.focus();const n=input.value.length;input.setSelectionRange(n,n);}});},120);});$('#kw-lifecycle-filter')?.addEventListener('change',e=>{state.keywordUi.lifecycle=e.target.value;save(STORAGE.keywordUi,state.keywordUi);render();});$('#kw-tag-filter')?.addEventListener('change',e=>{state.keywordUi.tag=e.target.value;save(STORAGE.keywordUi,state.keywordUi);render();});$('#kw-columns')?.addEventListener('click',openKeywordColumnManager);$('#kw-export')?.addEventListener('click',()=>exportKeywordLibrary(items));}
function toggleProtect(term){const k=term.toLowerCase();if(state.protected.has(k))state.protected.delete(k);else state.protected.add(k);save(STORAGE.protected,[...state.protected]);toast(state.protected.has(k)?'Keyword protected':'Protection removed','success');render();}'''

replace_app(
    r"function renderTracker\(\)\{.*?\n\nfunction classifyKeyword\(x\)\{.*?\}\nfunction renderKeywordLibrary\(\)\{.*?\}\nfunction toggleProtect\(term\)\{.*?\}",
    keyword_helpers_and_functions,
    'Tracker + Keyword Library block',
)

replace_ui(
    r"function isLocalTableSearch\(input\) \{.*?\n  \}",
    """function isLocalTableSearch(input) {
    return false;
  }""",
    'ui local table search ownership',
)

replace_ui(
    r"\n    if \(title === 'Keyword Tracker'\) \{.*?\n    \}\n\n    if \(title === 'Keyword Library'\) \{.*?\n    \}\n\n    if \(title === 'Change Log'\) \{.*?\n    \}\n\n    if \(title === 'Cerebro'\) \{.*?\n    \}\n",
    "\n",
    'remove obsolete disabled keyword/log/history controls',
)

for marker in (
    "keywordTags:'keywordos_v9_keyword_tags'",
    'kw-lifecycle-filter',
    'kw-tag-filter',
    'kw-columns',
    'tracker-tag-filter',
    'log-type-filter',
    'log-source-filter',
    'research-history',
    'data-research-history-run',
):
    if marker not in app:
        raise SystemExit(f'missing functional marker: {marker}')

for forbidden in (
    "disableButton(button, 'Keyword tags are not implemented",
    "disableButton(button, 'This library control is not implemented",
    "Advanced change-log filters are not implemented",
    "Research history is not persisted yet",
):
    if forbidden in ui:
        raise SystemExit(f'obsolete disabled-control marker remains: {forbidden}')

app_path.write_text(app, encoding='utf-8')
ui_path.write_text(ui, encoding='utf-8')
