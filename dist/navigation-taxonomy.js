(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(typeof globalThis!=='undefined')globalThis.KeywordOSNavigationTaxonomyTest=api;if(root){root.KeywordOSNavigationTaxonomy=api;api.start?.();}})(typeof window!=='undefined'?window:null,function(root){
'use strict';
const NAV_GROUPS={
  PRODUCTS:['product-master','product-360','competitor-snapshots','review-evidence'],
  KEYWORDS:['keyword-workflow','search-funnel','asin-comparison','rank-intelligence'],
  LISTING:['listing-optimizer'],
  MARKETING:['action-outcomes'],
  OPERATIONS:['inventory-risk'],
  ANALYTICS:['anomaly-center']
};
const ORDER=Object.keys(NAV_GROUPS);
function suiteForPage(page){for(const suite of ORDER)if(NAV_GROUPS[suite].includes(page))return suite;return'';}
function allGrowthPages(){return ORDER.flatMap(suite=>NAV_GROUPS[suite]);}
function sectionByTitle(nav,title){return[...nav.querySelectorAll(':scope > .nav-section')].find(section=>section.querySelector(':scope > .nav-section-title')?.textContent?.trim().toUpperCase()===title)||null;}
function createSection(nav,title,before){const section=root.document.createElement('div');section.className='nav-section';section.id=`growth-suite-${title.toLowerCase()}`;section.dataset.growthSuite=title;section.innerHTML=`<div class="nav-section-title">${title}</div>`;nav.insertBefore(section,before||null);return section;}
function organizeGrowthNavigation(){const nav=root?.document?.getElementById('sidebar-nav'),growth=nav?.querySelector(':scope > #growth-nav');if(!nav||!growth)return false;if(growth.dataset.taxonomyOrganized==='1')return true;const settings=sectionByTitle(nav,'SETTINGS');for(const suite of ORDER){let section=sectionByTitle(nav,suite);if(!section)section=createSection(nav,suite,settings);for(const page of NAV_GROUPS[suite]){const button=growth.querySelector(`[data-growth-page="${page}"]`);if(button)section.appendChild(button);}}const remaining=growth.querySelectorAll('[data-growth-page]');if(remaining.length)return false;growth.innerHTML='';growth.hidden=true;growth.setAttribute('aria-hidden','true');growth.dataset.taxonomyOrganized='1';return true;}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;organizeGrowthNavigation();},0);}
function start(){if(!root?.document)return;const boot=()=>{const nav=root.document.getElementById('sidebar-nav');if(!nav)return;schedule();new MutationObserver(schedule).observe(nav,{childList:true,subtree:false});};root.document.readyState==='loading'?root.document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();}
return{NAV_GROUPS,ORDER,suiteForPage,allGrowthPages,organizeGrowthNavigation,start};
});
