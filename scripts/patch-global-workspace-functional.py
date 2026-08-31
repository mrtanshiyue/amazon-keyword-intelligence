from pathlib import Path
import re

app_path = Path('app.js')
ui_path = Path('ui-actions.js')
app = app_path.read_text(encoding='utf-8')
ui = ui_path.read_text(encoding='utf-8')


def sub_app(pattern, replacement, label):
    global app
    app, count = re.subn(pattern, replacement, app, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')


old_storage = "protected:'keywordos_v9_protected', rules:'keywordos_v9_rules', logs:'keywordos_v9_logs', settings:'keywordos_v9_settings', presets:'keywordos_v9_presets', presetDefault:'keywordos_v9_preset_default', suggestionReviews:'keywordos_v9_suggestion_reviews', schedules:'keywordos_v9_schedules'"
new_storage = "protected:'keywordos_v9_protected', rules:'keywordos_v9_rules', logs:'keywordos_v9_logs', settings:'keywordos_v9_settings', presets:'keywordos_v9_presets', presetDefault:'keywordos_v9_preset_default', suggestionReviews:'keywordos_v9_suggestion_reviews', schedules:'keywordos_v9_schedules', globalUi:'keywordos_v9_global_ui'"
if app.count(old_storage) != 1:
    raise SystemExit('STORAGE marker not unique')
app = app.replace(old_storage, new_storage, 1)

old_state = "  presetDefault:load(STORAGE.presetDefault,''),\n  presets:load(STORAGE.presets,["
new_state = "  presetDefault:load(STORAGE.presetDefault,''),\n  globalUi:load(STORAGE.globalUi,{crossStoreView:'performance',keywordSearch:'',keywordStatus:'all',keywordSort:'sales_desc',keywordPageNo:1,keywordPageSize:25}),\n  presets:load(STORAGE.presets,["
if app.count(old_state) != 1:
    raise SystemExit('state marker not unique')
app = app.replace(old_state, new_state, 1)

old_state_end = "};\nif(!state.tracked.length){"
new_state_end = "};\nlet globalKeywordSearchTimer=null;\nif(!state.tracked.length){"
if app.count(old_state_end) != 1:
    raise SystemExit('state end marker not unique')
app = app.replace(old_state_end, new_state_end, 1)

sub_app(
    r"function renderCrossStore\(\)\{.*?\n\}\nfunction globalKeywordRows",
    """function crossStoreMetricCell(store,key,formatter){return store.m.hasData?formatter(store.m[key]):'<span class=\"muted\">—</span>';}
function renderCrossStorePerformance(stores){return `<div class=\"table-scroll\"><table class=\"data-table cross-table\"><thead><tr><th>Store</th><th>Connection</th><th>Status</th><th>Spend</th><th>Ad Sales</th><th>Orders</th><th>ACoS</th><th>ROAS</th><th>CVR</th><th>Action</th></tr></thead><tbody>${stores.map(s=>`<tr><td><button class=\"store-link\" data-switch-store=\"${s.id}\">${s.flag} <b>${esc(s.name)}</b>${s.demo?'<small>No business data</small>':''}</button></td><td><code>${esc(s.connection)}</code></td><td>${s.m.hasData?badge('Data loaded','blue'):badge('No data','gray')}</td><td>${crossStoreMetricCell(s,'spend',fmtMoney)}</td><td>${crossStoreMetricCell(s,'sales',fmtMoney)}</td><td>${crossStoreMetricCell(s,'orders',fmtInt)}</td><td class=\"${s.m.hasData?metricClassAcos(s.m.acos):''}\">${s.m.hasData?fmtPct(s.m.acos):'<span class=\"muted\">—</span>'}</td><td>${s.m.hasData?fmtDec(s.m.roas):'<span class=\"muted\">—</span>'}</td><td>${s.m.hasData?fmtPct(s.m.cvr):'<span class=\"muted\">—</span>'}</td><td><button class=\"btn ghost sm\" data-switch-store=\"${s.id}\">Open Store</button></td></tr>`).join('')}</tbody></table></div>`;}
function renderCrossStoreEfficiency(stores){return `<div class=\"table-scroll\"><table class=\"data-table cross-table\"><thead><tr><th>Store</th><th>Status</th><th>Spend</th><th>Clicks</th><th>CPC</th><th>Orders</th><th>CPA</th><th>ACoS</th><th>ROAS</th><th>CVR</th></tr></thead><tbody>${stores.map(s=>{const cpc=s.m.hasData&&s.m.clicks?s.m.spend/s.m.clicks:null,cpa=s.m.hasData&&s.m.orders?s.m.spend/s.m.orders:null;return `<tr><td><button class=\"store-link\" data-switch-store=\"${s.id}\">${s.flag} <b>${esc(s.name)}</b></button></td><td>${s.m.hasData?badge('Data loaded','blue'):badge('No data','gray')}</td><td>${crossStoreMetricCell(s,'spend',fmtMoney)}</td><td>${crossStoreMetricCell(s,'clicks',fmtInt)}</td><td>${cpc==null?'<span class=\"muted\">—</span>':fmtMoney(cpc)}</td><td>${crossStoreMetricCell(s,'orders',fmtInt)}</td><td>${cpa==null?'<span class=\"muted\">—</span>':fmtMoney(cpa)}</td><td>${s.m.hasData?fmtPct(s.m.acos):'<span class=\"muted\">—</span>'}</td><td>${s.m.hasData?fmtDec(s.m.roas):'<span class=\"muted\">—</span>'}</td><td>${s.m.hasData?fmtPct(s.m.cvr):'<span class=\"muted\">—</span>'}</td></tr>`;}).join('')}</tbody></table></div>`;}
function renderCrossStoreKeywords(stores){const keywords=globalKeywordRows(),conflicts=computeConflicts(state.currentRows||[]),core=keywords.filter(x=>x.globalStatus==='Core').length,protectedCount=keywords.filter(x=>x.globalStatus==='Protected').length,review=keywords.filter(x=>x.globalStatus==='Review').length,waste=keywords.filter(x=>x.orders===0&&x.clicks>=state.settings.negativeClicks&&x.spend>=state.settings.negativeSpend).length;return `<div class=\"table-scroll\"><table class=\"data-table cross-table\"><thead><tr><th>Store</th><th>Status</th><th>Keyword Assets</th><th>Core</th><th>Protected</th><th>Review</th><th>Zero-order Waste</th><th>Internal Conflicts</th><th>Action</th></tr></thead><tbody>${stores.map(s=>{const has=s.id==='store-a'&&s.m.hasData;return `<tr><td><button class=\"store-link\" data-switch-store=\"${s.id}\">${s.flag} <b>${esc(s.name)}</b></button></td><td>${has?badge('Data loaded','blue'):badge('No data','gray')}</td><td>${has?fmtInt(keywords.length):'<span class=\"muted\">—</span>'}</td><td>${has?fmtInt(core):'<span class=\"muted\">—</span>'}</td><td>${has?fmtInt(protectedCount):'<span class=\"muted\">—</span>'}</td><td>${has?fmtInt(review):'<span class=\"muted\">—</span>'}</td><td>${has?fmtInt(waste):'<span class=\"muted\">—</span>'}</td><td>${has?fmtInt(conflicts.length):'<span class=\"muted\">—</span>'}</td><td>${has?'<button class=\"btn ghost sm\" data-nav=\"global-keywords\">Open Keywords</button>':'<span class=\"muted\">Load a dataset first</span>'}</td></tr>`;}).join('')}</tbody></table></div>`;}
function renderCrossStore(){
  const stores=STORES.map(s=>({...s,m:storeMetricPreview(s)}));
  const view=['performance','efficiency','keywords'].includes(state.globalUi.crossStoreView)?state.globalUi.crossStoreView:'performance';
  const body=view==='efficiency'?renderCrossStoreEfficiency(stores):view==='keywords'?renderCrossStoreKeywords(stores):renderCrossStorePerformance(stores);
  $('#content').innerHTML=`${scopeBanner()}<div class=\"card\"><div class=\"card-head\"><div class=\"card-title\"><h3>Cross-store Intelligence</h3><small>Every numeric value below comes from a loaded Store dataset. Store 02 / 03 remain empty until real data exists.</small></div><div class=\"segmented\">${[['performance','Performance'],['efficiency','Efficiency'],['keywords','Keywords']].map(([key,label])=>`<button data-cross-view=\"${key}\" class=\"${view===key?'active':''}\" ${view===key?'aria-current=\"true\"':''}>${label}</button>`).join('')}</div></div>${body}</div>
  <div class=\"v8-grid equal top-gap\"><div class=\"card\"><div class=\"card-head\"><div class=\"card-title\"><h3>Dataset Coverage</h3><small>Cross-store intelligence grows only from actual Store datasets</small></div></div><div class=\"shared-model\"><div class=\"shared-core\">GLOBAL<br><b>Keyword Brain</b></div>${STORES.map(s=>`<div class=\"shared-store\"><span>${s.code}</span><b>${s.name}</b><small>${s.id==='store-a'?'Dataset loaded':'No data'}</small></div>`).join('')}</div></div><div class=\"card\"><div class=\"card-head\"><div class=\"card-title\"><h3>Decision Policy</h3></div></div><div class=\"policy-lines\"><p><b>Functional now:</b> Performance, efficiency and keyword-state views for every loaded Store.</p><p><b>Current coverage:</b> Store 01 loaded; Store 02 / 03 no data.</p><p><b>Never synthesize:</b> spend, sales, orders, ACoS, ROAS, CVR or keyword performance.</p><p><b>Execution:</b> Global remains analysis-only; actions stay Store-scoped.</p></div></div></div>`;
  $$('[data-cross-view]').forEach(button=>button.addEventListener('click',()=>{state.globalUi.crossStoreView=button.dataset.crossView;save(STORAGE.globalUi,state.globalUi);render();}));
}
function globalKeywordRows""",
    'renderCrossStore',
)

sub_app(
    r"function globalKeywordRows\(\)\{.*?\}\nfunction renderGlobalKeywords\(\)\{.*?\}\nfunction renderGlobalConflicts",
    """function globalKeywordRows(){return aggregateLevel(state.currentRows||[],'searchterm').filter(x=>x.clicks>=5).map(x=>{const term=x.name,protectedKeyword=isProtected(term);return {...x,term,protected:protectedKeyword,globalStatus:protectedKeyword?'Protected':x.orders>=5?'Core':x.orders===0?'Review':'Testing'};});}
function filteredGlobalKeywordRows(){let rows=globalKeywordRows();const q=String(state.globalUi.keywordSearch||'').trim().toLowerCase(),status=state.globalUi.keywordStatus||'all';if(q)rows=rows.filter(x=>x.term.toLowerCase().includes(q));if(status!=='all')rows=rows.filter(x=>x.globalStatus.toLowerCase()===status);const sort=state.globalUi.keywordSort||'sales_desc',map={sales_desc:['sales','desc'],orders_desc:['orders','desc'],spend_desc:['spend','desc'],clicks_desc:['clicks','desc'],acos_asc:['acos','asc']},[key,dir]=map[sort]||map.sales_desc;rows.sort((a,b)=>{const av=a[key],bv=b[key];if(av==null&&bv==null)return 0;if(av==null)return 1;if(bv==null)return -1;return dir==='asc'?av-bv:bv-av;});return rows;}
function exportGlobalKeywords(rows){const head=['Keyword','Status','Store 01 ACoS','Clicks','Orders','Spend','Sales','CVR','Store Coverage'];const csv=[head.map(csvq).join(','),...rows.map(x=>[x.term,x.globalStatus,x.acos==null?'':(x.acos*100).toFixed(2)+'%',x.clicks,x.orders,x.spend,x.sales,x.cvr==null?'':(x.cvr*100).toFixed(2)+'%','1/3'].map(csvq).join(','))].join('\\n');download(`KeywordOS_global_keywords_${today()}.csv`,csv,'text/csv;charset=utf-8');}
function renderGlobalKeywords(){const all=globalKeywordRows(),rows=filteredGlobalKeywordRows(),pageSize=[25,50,100].includes(+state.globalUi.keywordPageSize)?+state.globalUi.keywordPageSize:25,totalPages=Math.max(1,Math.ceil(rows.length/pageSize));state.globalUi.keywordPageNo=Math.min(Math.max(1,+state.globalUi.keywordPageNo||1),totalPages);const pageNo=state.globalUi.keywordPageNo,start=(pageNo-1)*pageSize,pageRows=rows.slice(start,start+pageSize);$('#content').innerHTML=`${scopeBanner()}<div class=\"toolbar\"><div class=\"toolbar-left\"><div class=\"searchbox\"><span>⌕</span><input id=\"global-keyword-search\" value=\"${esc(state.globalUi.keywordSearch||'')}\" placeholder=\"Search global keyword library\"></div><select id=\"global-keyword-status\" class=\"select\"><option value=\"all\" ${state.globalUi.keywordStatus==='all'?'selected':''}>All statuses</option><option value=\"protected\" ${state.globalUi.keywordStatus==='protected'?'selected':''}>Protected</option><option value=\"core\" ${state.globalUi.keywordStatus==='core'?'selected':''}>Core</option><option value=\"testing\" ${state.globalUi.keywordStatus==='testing'?'selected':''}>Testing</option><option value=\"review\" ${state.globalUi.keywordStatus==='review'?'selected':''}>Review</option></select><select id=\"global-keyword-sort\" class=\"select\"><option value=\"sales_desc\" ${state.globalUi.keywordSort==='sales_desc'?'selected':''}>Sales ↓</option><option value=\"orders_desc\" ${state.globalUi.keywordSort==='orders_desc'?'selected':''}>Orders ↓</option><option value=\"spend_desc\" ${state.globalUi.keywordSort==='spend_desc'?'selected':''}>Spend ↓</option><option value=\"clicks_desc\" ${state.globalUi.keywordSort==='clicks_desc'?'selected':''}>Clicks ↓</option><option value=\"acos_asc\" ${state.globalUi.keywordSort==='acos_asc'?'selected':''}>ACoS ↑</option></select></div><div class=\"toolbar-right\"><span class=\"muted\">${fmtInt(rows.length)} filtered · ${fmtInt(all.length)} total</span><button class=\"btn secondary\" id=\"global-keyword-export\">⇩ Export filtered</button></div></div><div class=\"notice-banner\">Only Store 01 currently has a loaded dataset. Store 02 / 03 remain empty until real data is loaded; Global status and filters are calculated from Store 01 evidence only.</div><div class=\"card flat\"><div class=\"table-scroll\"><table class=\"data-table\"><thead><tr><th>Keyword</th><th>Global Status</th><th>Store 01 ACoS</th><th>Store 02 ACoS</th><th>Store 03 ACoS</th><th>Clicks</th><th>Orders</th><th>Sales</th><th>Store Coverage</th><th>Decision</th></tr></thead><tbody>${pageRows.length?pageRows.map(x=>`<tr><td><b class=\"keyword-main\">${esc(x.term)}</b>${x.protected?'<small class=\"subline\">Protected core asset</small>':''}</td><td>${badge(x.globalStatus,x.globalStatus==='Protected'?'blue':x.globalStatus==='Core'?'green':x.globalStatus==='Review'?'amber':'gray')}</td><td class=\"${metricClassAcos(x.acos)}\">${fmtPct(x.acos)}</td><td><span class=\"muted\">— · no data</span></td><td><span class=\"muted\">— · no data</span></td><td>${fmtInt(x.clicks)}</td><td>${fmtInt(x.orders)}</td><td>${fmtMoney(x.sales)}</td><td><span class=\"coverage-dots\" title=\"1 of 3 stores has data\"><i class=\"on\"></i><i></i><i></i></span></td><td><button class=\"btn ghost sm\" data-switch-store=\"store-a\">Open Store 01</button></td></tr>`).join(''):`<tr><td colspan=\"10\"><div class=\"empty-state\"><h3>No keywords match the current filters</h3><p>Clear the search or change the status filter.</p></div></td></tr>`}</tbody></table></div><div class=\"table-footer\"><div>Showing ${rows.length?start+1:0}–${Math.min(start+pageSize,rows.length)} of ${fmtInt(rows.length)}</div><div class=\"pager\"><select id=\"global-keyword-page-size\" class=\"select\"><option value=\"25\" ${pageSize===25?'selected':''}>25 / page</option><option value=\"50\" ${pageSize===50?'selected':''}>50 / page</option><option value=\"100\" ${pageSize===100?'selected':''}>100 / page</option></select><button class=\"btn sm\" id=\"global-keyword-prev\" ${pageNo<=1?'disabled':''}>← Prev</button><span class=\"muted\">Page ${pageNo} / ${totalPages}</span><button class=\"btn sm\" id=\"global-keyword-next\" ${pageNo>=totalPages?'disabled':''}>Next →</button></div></div></div>`;
  $('#global-keyword-search')?.addEventListener('input',e=>{state.globalUi.keywordSearch=e.target.value;save(STORAGE.globalUi,state.globalUi);clearTimeout(globalKeywordSearchTimer);globalKeywordSearchTimer=setTimeout(()=>{state.globalUi.keywordPageNo=1;save(STORAGE.globalUi,state.globalUi);render();requestAnimationFrame(()=>{const input=$('#global-keyword-search');if(input){input.focus();const n=input.value.length;input.setSelectionRange(n,n);}});},120);});
  $('#global-keyword-status')?.addEventListener('change',e=>{state.globalUi.keywordStatus=e.target.value;state.globalUi.keywordPageNo=1;save(STORAGE.globalUi,state.globalUi);render();});
  $('#global-keyword-sort')?.addEventListener('change',e=>{state.globalUi.keywordSort=e.target.value;state.globalUi.keywordPageNo=1;save(STORAGE.globalUi,state.globalUi);render();});
  $('#global-keyword-page-size')?.addEventListener('change',e=>{state.globalUi.keywordPageSize=+e.target.value;state.globalUi.keywordPageNo=1;save(STORAGE.globalUi,state.globalUi);render();});
  $('#global-keyword-prev')?.addEventListener('click',()=>{if(state.globalUi.keywordPageNo>1){state.globalUi.keywordPageNo--;save(STORAGE.globalUi,state.globalUi);render();}});
  $('#global-keyword-next')?.addEventListener('click',()=>{if(state.globalUi.keywordPageNo<totalPages){state.globalUi.keywordPageNo++;save(STORAGE.globalUi,state.globalUi);render();}});
  $('#global-keyword-export')?.addEventListener('click',()=>exportGlobalKeywords(rows));
}
function renderGlobalConflicts""",
    'Global Keyword block',
)

app = app.replace("['Data Workspaces','1 / 3','Store 01 imported data · Store 02/03 preview','amber']", "['Data Workspaces','1 / 3','Store 01 loaded · Store 02/03 no data','amber']")
app = app.replace("<div><span>Cross-store comparison</span><b>Preview</b></div>", "<div><span>Cross-store comparison</span><b>1 store loaded</b></div>")

old_search = "if (input.id === 'log-search' || input.id === 'kw-search' || input.id === 'global-keyword-search') return true;"
new_search = "if (input.id === 'log-search' || input.id === 'kw-search') return true;"
if ui.count(old_search) != 1:
    raise SystemExit('ui global search ownership marker not unique')
ui = ui.replace(old_search, new_search, 1)

for marker in (
    'data-cross-view',
    'global-keyword-status',
    'global-keyword-sort',
    'global-keyword-page-size',
    'global-keyword-export',
    "globalUi:'keywordos_v9_global_ui'",
):
    if marker not in app:
        raise SystemExit(f'missing functional marker: {marker}')

for forbidden in (
    'Efficiency · Coming next',
    'Keywords · Coming next',
    'Filter Library · Coming next',
):
    if forbidden in app:
        raise SystemExit(f'old disabled Global marker remains: {forbidden}')

app_path.write_text(app, encoding='utf-8')
ui_path.write_text(ui, encoding='utf-8')
