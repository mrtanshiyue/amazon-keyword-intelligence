(function(root,factory){
  const built=factory(root),registry=built.registry,api=built.navigation;
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof globalThis!=='undefined'){globalThis.KeywordOSPageRegistry=registry;globalThis.KeywordOSPageRegistryTest=registry;globalThis.KeywordOSNavigationTaxonomyTest=api;}
  if(root){root.KeywordOSPageRegistry=registry;root.KeywordOSNavigationTaxonomy=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const SUITE_ORDER=Object.freeze(['products','keywords','listing','marketing','operations','analytics']);
const SIDEBAR_ORDER=Object.freeze(['products','keywords','listing','marketing','operations','analytics','settings']);
const SUITES=Object.freeze({
  products:Object.freeze({id:'products',label:'Products',i18nKey:'suite.products',home:'suite-products',landing:'product-master',title:'Products Workspace',subtitle:'Store-scoped product and workspace operations',notice:'Product catalog editing and Amazon listing mutation are not connected in this runtime.'}),
  keywords:Object.freeze({id:'keywords',label:'Keywords',i18nKey:'suite.keywords',home:'suite-keywords',landing:'search-funnel',title:'Keywords Workspace',subtitle:'Research, library, tracking and conflict intelligence',notice:'Keyword analysis uses loaded/local data. Amazon keyword writes remain disabled.'}),
  listing:Object.freeze({id:'listing',label:'Listing',i18nKey:'suite.listing',home:'',landing:'listing-optimizer',title:'Listing Workspace',subtitle:'Keyword-backed listing preparation without Amazon write access',notice:'Listing publishing is not connected. Existing evidence can be prepared locally without creating Amazon write actions.'}),
  marketing:Object.freeze({id:'marketing',label:'Marketing',i18nKey:'suite.marketing',home:'suite-marketing',landing:'overview',title:'Marketing Workspace',subtitle:'Advertising analysis, recommendations and controlled local actions',notice:'Amazon execution remains disabled. Marketing actions stay local and review-only unless separately authorized.'}),
  operations:Object.freeze({id:'operations',label:'Operations',i18nKey:'suite.operations',home:'suite-operations',landing:'data-health',title:'Operations Workspace',subtitle:'Finance, imports, synchronization status and data health',notice:'Operations are limited to loaded/local data and read-only runtime status. No anonymous mutable Worker API is exposed.'}),
  analytics:Object.freeze({id:'analytics',label:'Analytics',i18nKey:'suite.analytics',home:'suite-analytics',landing:'portfolio-overview',title:'Analytics Workspace',subtitle:'Portfolio, cross-store and advertising performance analysis',notice:'Analytics is read-only and operates on the currently loaded Store/local datasets.'})
});

const RAW_PAGES=[
  ['product-master','products','products','▣','Product Master','Product Master','Explicit Store-scoped identifiers used for trustworthy product joins.','growth',10],
  ['product-360','products','products','◉','Product 360','Product 360','Join advertising, finance, cost and inventory evidence by product.','growth',20],
  ['competitor-snapshots','products','products','◌','Competitors','Competitor Snapshots','Review imported point-in-time competitor listing evidence without estimating missing values.','growth',30],
  ['review-evidence','products','products','☷','Reviews','Review Evidence','Read imported review samples and rating distribution without inferred sentiment.','growth',40],
  ['store-workspace','products','products','◫','Store Workspace','Store Workspace','Operate inside one isolated Store → Connection → Advertiser → Marketplace boundary.','core',50],
  ['keyword-workflow','keywords','keywords','◎','Keyword Workflow','Keyword Workflow','Follow each shared keyword asset from imported evidence to local decisions and measured outcomes.','growth',10],
  ['search-funnel','keywords','keywords','⌁','Search Funnel','Search Query Funnel','Analyze imported SQP or ABA query demand, funnel share and conversion gaps.','growth',20],
  ['asin-comparison','keywords','keywords','⇄','ASIN Compare','ASIN Keyword Comparison','Compare imported reverse-ASIN keyword evidence across 2–20 ASINs without synthesizing unavailable metrics.','growth',30],
  ['rank-intelligence','keywords','keywords','↗','Rank & Index','Rank & Index Tracker','Track imported organic rank, sponsored rank and index status.','growth',40],
  ['global-keywords','keywords','keywords','⌕','Global Keyword Library','Global Keyword Library','Shared keyword knowledge across stores. Amazon execution remains store-scoped.','core',50],
  ['global-conflicts','keywords','keywords','⚠','Global Conflict Center','Global Conflict Center','Identify cross-store keyword conflicts before creating store-scoped negative actions.','core',60],
  ['cerebro','keywords','keywords','⌕','Keyword Lab','Keyword Lab','Discover, batch-analyze, and compare loaded keyword evidence through one source-aware result model.','core',70],
  ['keyword-library','keywords','keywords','≡','Keyword Library','Keyword Library','Store-scoped keyword assets with lifecycle, protection and performance status.','core',80],
  ['negative-library','keywords','keywords','⊖','Negative Library','Negative Library','Manage suggested and active negative targets with store-level scope and risk controls.','core',90],
  ['conflicts','keywords','keywords','⚠','Store Conflict Guard','Store Conflict Guard','Detect terms that are profitable for one product but wasteful for another within the selected store.','core',100],
  ['listing-optimizer','listing','listing','✎','Listing Optimizer','Listing Optimizer 2.0','Measure keyword coverage, repetition and backend search-term byte usage.','growth',10],
  ['overview','marketing','marketing','◫','Dashboard','Dashboard','High-level advertising performance for the selected Amazon advertising profile.','core',10],
  ['suggestions','marketing','marketing','✦','Suggestions','Suggestions','Review bid, keyword, negative-targeting and budget recommendations before applying changes.','core',20],
  ['ad-manager','marketing','marketing','▦','Ad Manager','Ad Manager','Manage campaigns and drill down from campaign to ad group, target and search term.','core',30],
  ['rules','marketing','marketing','⚡','Rules & Automation','Rules & Automation','Create repeatable bid, harvest, negative-targeting and budget decision rules.','core',40],
  ['schedules','marketing','marketing','◷','Dayparting Schedules','Dayparting Schedules','Analyze hourly performance and define controlled campaign schedules.','core',50],
  ['actions','marketing','marketing','✓','Action Center','Action Center','Review proposed advertising changes inside one verified store execution boundary.','core',60],
  ['change-log','marketing','marketing','↺','Change Log','Change Log','Audit imported data and every keyword, negative and rule action.','core',70],
  ['action-outcomes','marketing','marketing','◎','Action Outcomes','Action Outcomes','Measure approved local actions against later imported advertising evidence.','growth',80],
  ['unified-report','operations','operations','▧','Unified Report','Unified Transaction Analytics','Analyze income, refunds, fees, advertising charges, settlements and transaction-level cash flow.','core',10],
  ['import','operations','operations','⇧','Import Center','Import Center','Validate, map and merge Amazon Ads and Unified Transaction reports.','core',20],
  ['sync-center','operations','operations','⟳','Sync Center','Sync Center','Monitor independent synchronization jobs for every Amazon connection.','core',30],
  ['data-health','operations','operations','♡','Data Health','Data Health','Inspect freshness, schema, coverage and connection status before decisions are generated.','core',40],
  ['inventory-risk','operations','operations','▦','Inventory','Inventory & Replenishment','Assess days of cover and stock risk from imported inventory snapshots.','growth',50],
  ['portfolio-overview','analytics','analytics','▥','Portfolio Overview','Portfolio Overview','Consolidated intelligence across stores. Global mode is analytics-only and cannot write to Amazon.','core',10],
  ['cross-store','analytics','analytics','⇄','Cross-store Intelligence','Cross-store Intelligence','Compare store performance and transfer learnings without sharing Amazon credentials or write actions.','core',20],
  ['analytics','analytics','analytics','▤','Advertising Analytics','Analytics','Analyze advertising performance across portfolio, campaign, ad group, target, search term and product levels.','core',30],
  ['anomaly-center','analytics','analytics','⚠','Anomaly Center','Anomaly Center','Surface deterministic advertising, finance, inventory and data freshness risks.','growth',40],
  ['stores-settings','products','settings','▣','Stores','Stores','Manage KeywordOS store workspaces independently from Amazon authorization.','core',10],
  ['amazon-connections','','settings','⌁','Amazon Connections','Amazon Connections','One store, one OAuth connection, one explicit advertiser binding.','core',20],
  ['users-permissions','','settings','♙','Users & Permissions','Users & Permissions','Role-based access with explicit allowed-store boundaries.','core',30],
  ['settings','','settings','⚙','Workspace Settings','Workspace Settings','Configure target ACoS, decision thresholds and keyword protection policies.','core',40]
];
const PAGES=Object.freeze(RAW_PAGES.map(([id,suite,sidebarGroup,icon,navLabel,title,subtitle,source,order])=>Object.freeze({id,suite,sidebarGroup,icon,navLabel,title,subtitle,source,order,eyebrow:sidebarGroup==='settings'?'SETTINGS':String(suite||sidebarGroup).toUpperCase(),i18nKey:`page.${id}`,command:true,nav:true,legacy:false,virtual:false})));
const PAGE_MAP=new Map(PAGES.map(page=>[page.id,page]));
const ALIASES=Object.freeze({tracker:'rank-intelligence','listing-workspace':'listing-optimizer'});
const LEGACY_PAGES=Object.freeze(Object.keys(ALIASES));
const VIRTUAL_PAGES=Object.freeze(SUITE_ORDER.filter(suite=>SUITES[suite].home).map(suite=>Object.freeze({id:SUITES[suite].home,suite,sidebarGroup:'',icon:'',navLabel:SUITES[suite].title,title:SUITES[suite].title,subtitle:SUITES[suite].subtitle,source:'virtual',order:0,eyebrow:suite.toUpperCase(),i18nKey:`page.${SUITES[suite].home}`,command:true,nav:false,legacy:false,virtual:true})));
const VIRTUAL_MAP=new Map(VIRTUAL_PAGES.map(page=>[page.id,page]));
function clean(value){return String(value||'').trim();}
function canonicalPage(value){const id=clean(value);return ALIASES[id]||id;}
function isLegacy(value){return LEGACY_PAGES.includes(clean(value));}
function page(value,{resolveAlias=true}={}){const id=resolveAlias?canonicalPage(value):clean(value);return PAGE_MAP.get(id)||VIRTUAL_MAP.get(id)||null;}
function suite(value){return SUITES[clean(value).toLowerCase()]||null;}
function suiteForPage(value){return page(value)?.suite||'';}
function suiteLanding(value){return suite(value)?.landing||'';}
function suiteHomePage(value){return suite(value)?.home||'';}
function suiteFromHomePage(value){const id=clean(value);return SUITE_ORDER.find(name=>SUITES[name].home===id)||'';}
function pagesForSuite(value,{includeVirtual=false}={}){const name=clean(value).toLowerCase();const rows=PAGES.filter(item=>item.suite===name).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));return includeVirtual&&SUITES[name]?.home?[VIRTUAL_MAP.get(SUITES[name].home),...rows]:rows;}
function growthPages(){return PAGES.filter(item=>item.source==='growth').sort((a,b)=>SUITE_ORDER.indexOf(a.suite)-SUITE_ORDER.indexOf(b.suite)||a.order-b.order);}
function sidebarGroups(){return SIDEBAR_ORDER.map(group=>({group,label:group.toUpperCase(),i18nKey:`sidebar.${group}`,pages:PAGES.filter(page=>page.sidebarGroup===group).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id))}));}
function commandEntries(){return [...PAGES,...VIRTUAL_PAGES].filter(item=>item.command&&!item.legacy).map(item=>({page:item.id,label:item.navLabel||item.title,section:item.virtual?'WORKSPACES':item.sidebarGroup.toUpperCase(),i18nKey:item.i18nKey,suite:item.suite}));}
function metadata(value){const record=page(value);return record?[record.eyebrow,record.title,record.subtitle]:null;}
function pageHash(value){const id=canonicalPage(value);return page(id)?`#page=${encodeURIComponent(id)}`:'';}
function pageFromHash(hash){const match=String(hash||'').match(/^#page=([^&]+)$/);if(!match)return'';try{return canonicalPage(decodeURIComponent(match[1]).trim())}catch{return''}}
function registrySnapshot(){return Object.freeze({suites:SUITE_ORDER.map(name=>SUITES[name]),pages:[...PAGES,...VIRTUAL_PAGES],aliases:ALIASES});}
function validate(){const all=[...PAGES,...VIRTUAL_PAGES],ids=all.map(item=>item.id),keys=all.map(item=>item.i18nKey),unknownSuites=PAGES.filter(item=>item.suite&&!SUITES[item.suite]),unknownGroups=PAGES.filter(item=>!SIDEBAR_ORDER.includes(item.sidebarGroup)),invalidAliases=Object.entries(ALIASES).filter(([,target])=>!PAGE_MAP.has(target)),invalidSuiteRefs=SUITE_ORDER.filter(name=>{const config=SUITES[name];return!PAGE_MAP.has(config.landing)||(config.home&&!VIRTUAL_MAP.has(config.home));});const duplicateIds=ids.filter((id,index)=>ids.indexOf(id)!==index),duplicateI18nKeys=keys.filter((key,index)=>keys.indexOf(key)!==index);return{ok:!duplicateIds.length&&!duplicateI18nKeys.length&&!unknownSuites.length&&!unknownGroups.length&&!invalidAliases.length&&!invalidSuiteRefs.length,duplicateIds,duplicateI18nKeys,unknownSuites:unknownSuites.map(item=>item.id),unknownGroups:unknownGroups.map(item=>item.id),invalidAliases:invalidAliases.map(([alias,target])=>`${alias}->${target}`),invalidSuiteRefs};}
const registry={SUITE_ORDER,SIDEBAR_ORDER,SUITES,PAGES,VIRTUAL_PAGES,ALIASES,LEGACY_PAGES,canonicalPage,isLegacy,page,suite,suiteForPage,suiteLanding,suiteHomePage,suiteFromHomePage,pagesForSuite,growthPages,sidebarGroups,commandEntries,metadata,pageHash,pageFromHash,registrySnapshot,validate};
const ORDER=Object.freeze(registry.SUITE_ORDER.map(value=>value.toUpperCase()));
const NAV_SIDEBAR_ORDER=Object.freeze([...registry.SIDEBAR_ORDER]);
const NAV_GROUPS=Object.freeze(Object.fromEntries(ORDER.map(label=>[label,Object.freeze(registry.growthPages().filter(page=>page.suite===label.toLowerCase()).map(page=>page.id))])));
function navSuiteForPage(page){return String(registry.suiteForPage(page)||'').toUpperCase();}
function allGrowthPages(){return registry.growthPages().map(page=>page.id);}
function sectionByGroup(nav,group){return[...nav.querySelectorAll(':scope > .nav-section')].find(section=>section.dataset.registrySection===group)||null;}
function createSection(nav,group,before){const section=root.document.createElement('div');section.className='nav-section';section.dataset.registrySection=group;section.id=`page-registry-${group}`;section.innerHTML=`<div class="nav-section-title" data-i18n-key="sidebar.${group}">${group.toUpperCase()}</div>`;nav.insertBefore(section,before||null);return section;}
function sectionMap(nav){const map=new Map();for(const group of NAV_SIDEBAR_ORDER){let section=sectionByGroup(nav,group);if(!section)section=createSection(nav,group,null);map.set(group,section);}return map;}
function hideLegacyButton(button){button.hidden=true;button.setAttribute('aria-hidden','true');button.tabIndex=-1;}
function decorateButton(button,record){button.hidden=false;button.removeAttribute('aria-hidden');if(button.tabIndex<0)button.tabIndex=0;button.dataset.pageRegistryKey=record.id;button.dataset.i18nKey=record.i18nKey;button.dataset.suite=record.suite||'';const label=button.querySelector('.nav-label');if(label&&label.textContent.trim()!==record.navLabel)label.textContent=record.navLabel;if(record.navLabel)button.title=record.navLabel;}
function organizeGrowthNavigation(){const nav=root?.document?.getElementById('sidebar-nav');if(!nav)return false;const sections=sectionMap(nav),buttons=[...nav.querySelectorAll('[data-page]')],seenPages=new Set();for(const button of buttons){const raw=button.dataset.page||'';if(registry.isLegacy(raw)){hideLegacyButton(button);continue;}const record=registry.page(raw);if(!record||!record.nav||!record.sidebarGroup)continue;if(seenPages.has(record.id)){button.remove();continue;}seenPages.add(record.id);decorateButton(button,record);const section=sections.get(record.sidebarGroup);if(section&&button.parentElement!==section)section.appendChild(button);}for(const group of NAV_SIDEBAR_ORDER){const section=sections.get(group);if(!section)continue;for(const record of registry.sidebarGroups().find(item=>item.group===group)?.pages||[]){const button=[...section.querySelectorAll(':scope > [data-page]')].find(item=>!registry.isLegacy(item.dataset.page)&&registry.canonicalPage(item.dataset.page)===record.id);if(button)section.appendChild(button);}}for(const section of [...nav.querySelectorAll(':scope > .nav-section')]){if(section.dataset.registrySection)continue;const hasVisibleCanonical=[...section.querySelectorAll('[data-page]')].some(button=>!button.hidden&&!registry.isLegacy(button.dataset.page));if(!hasVisibleCanonical)section.remove();}for(const group of NAV_SIDEBAR_ORDER){const section=sections.get(group);if(!section)continue;const title=section.querySelector(':scope > .nav-section-title');if(title){title.textContent=group.toUpperCase();title.dataset.i18nKey=`sidebar.${group}`;}}const desired=NAV_SIDEBAR_ORDER.map(group=>sections.get(group)).filter(Boolean),current=[...nav.children].filter(section=>section.dataset?.registrySection);if(desired.some((section,index)=>current[index]!==section))for(const section of desired)nav.appendChild(section);root?.KeywordOSI18N?.apply?.(nav);root?.KeywordOSProductLanguage?.apply?.(nav);return true;}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;organizeGrowthNavigation();},0);}
function start(){if(!root?.document)return;const boot=()=>{const nav=root.document.getElementById('sidebar-nav');if(!nav)return;schedule();};root.document.readyState==='loading'?root.document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();}
const navigation={NAV_GROUPS,ORDER,SIDEBAR_ORDER:NAV_SIDEBAR_ORDER,suiteForPage:navSuiteForPage,allGrowthPages,organizeGrowthNavigation,start};
return{registry,navigation};
});