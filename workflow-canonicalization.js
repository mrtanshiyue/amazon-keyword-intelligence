(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;if(typeof globalThis!=='undefined')globalThis.KeywordOSWorkflowCanonicalizationTest=api;if(root){root.KeywordOSWorkflowCanonicalization=api;api.start?.();}})(typeof window!=='undefined'?window:null,function(root){
'use strict';
const registry=(root?.KeywordOSPageRegistry)||globalThis.KeywordOSPageRegistry;
const PAGE_ALIASES=Object.freeze({...registry?.ALIASES});
const LEGACY_PAGES=Object.freeze([...(registry?.LEGACY_PAGES||[])]);
function cleanPage(value){return String(value||'').trim();}
function canonicalPage(page){return registry?.canonicalPage?.(page)||cleanPage(page);}
function rawPageFromHash(hash){const match=String(hash||'').match(/^#page=([^&]+)$/);if(!match)return'';try{return decodeURIComponent(match[1]).trim()}catch{return''}}
function canonicalHash(hash){const raw=rawPageFromHash(hash);if(!raw)return String(hash||'');const canonical=canonicalPage(raw);return canonical===raw?String(hash||''):`#page=${encodeURIComponent(canonical)}`;}
function aliasTarget(page){const value=cleanPage(page);return PAGE_ALIASES[value]||'';}
function listingSuiteTarget(label){return cleanPage(label).toLowerCase()==='listing'?(registry?.suiteLanding?.('listing')||''):'';}
function shouldHidePage(page){return registry?.isLegacy?.(page)||false;}
if(!root?.document)return{PAGE_ALIASES,LEGACY_PAGES,canonicalPage,rawPageFromHash,canonicalHash,aliasTarget,listingSuiteTarget,shouldHidePage};
const doc=root.document;
const $=(selector,scope=doc)=>scope.querySelector(selector),$$=(selector,scope=doc)=>[...scope.querySelectorAll(selector)];
let scheduled=false;
function canonicalButton(page){return $$('[data-page]').find(button=>canonicalPage(button.dataset.page)===page&&!button.hidden&&!shouldHidePage(button.dataset.page))||null;}
function writeCanonicalHash(page){const canonical=canonicalPage(page),hash=`#page=${encodeURIComponent(canonical)}`;if(root.location.hash!==hash)root.history.replaceState({keywordOSPage:canonical},'',hash);}
function navigateCanonical(page,{replaceHash=true}={}){const canonical=canonicalPage(page),button=canonicalButton(canonical);if(!button)return false;if(replaceHash)writeCanonicalHash(canonical);button.click();return true;}
function hideLegacyEntries(){for(const legacy of LEGACY_PAGES){$$(`[data-page="${legacy}"],[data-suite-page="${legacy}"],[data-command-page="${legacy}"]`).forEach(element=>{element.hidden=true;element.setAttribute('aria-hidden','true');element.tabIndex=-1;});}$$('.keywordos-listing-nav-section').forEach(section=>{section.hidden=true;section.setAttribute('aria-hidden','true');});$$('.keywordos-suite-home').forEach(home=>{const count=$('.keywordos-suite-home-count',home),visible=$$('[data-suite-page]',home).filter(card=>!card.hidden).length;if(count)count.textContent=`${visible} TOOLS`;});}
function scheduleHide(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;hideLegacyEntries();});}
function redirectLegacyLocation(){const raw=rawPageFromHash(root.location.hash),target=aliasTarget(raw);if(!target)return false;writeCanonicalHash(target);let attempts=0;const retry=()=>{if(navigateCanonical(target,{replaceHash:false}))return;if(++attempts<20)root.setTimeout(retry,25);};retry();return true;}
function pageFromAction(element){if(!element)return'';return element.dataset.page||element.dataset.suitePage||element.dataset.commandPage||'';}
function interceptLegacyNavigation(event){const target=event.target instanceof root.Element?event.target:null;if(!target)return;const suite=target.closest('.suite-nav button'),suiteTarget=listingSuiteTarget(suite?.dataset.suite||suite?.textContent||'');const action=target.closest('[data-page],[data-suite-page],[data-command-page]'),legacyTarget=aliasTarget(pageFromAction(action));const canonical=suiteTarget||legacyTarget;if(!canonical)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(!navigateCanonical(canonical,{replaceHash:true})){writeCanonicalHash(canonical);root.setTimeout(()=>navigateCanonical(canonical,{replaceHash:false}),0);}}
function start(){doc.addEventListener('click',interceptLegacyNavigation,true);root.addEventListener('hashchange',redirectLegacyLocation);root.addEventListener('popstate',redirectLegacyLocation);const boot=()=>{hideLegacyEntries();redirectLegacyLocation();const body=doc.body;if(body)new MutationObserver(scheduleHide).observe(body,{childList:true,subtree:true});};doc.readyState==='loading'?doc.addEventListener('DOMContentLoaded',boot,{once:true}):boot();}
return{PAGE_ALIASES,LEGACY_PAGES,canonicalPage,rawPageFromHash,canonicalHash,aliasTarget,listingSuiteTarget,shouldHidePage,navigateCanonical,hideLegacyEntries,redirectLegacyLocation,start};
});
