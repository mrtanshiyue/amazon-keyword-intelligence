(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSUiCapabilityGuardTest=api;
  if(root){root.KeywordOSUiCapabilityGuard=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const LEGACY_BID_KEY='AI Bids';
const BID_LABELS=Object.freeze({
  en:'Rule-based Bids',
  zh:'规则化调价建议',
  bi:'规则化调价建议 / Rule-based Bids'
});
const BID_SETTINGS_LABELS=Object.freeze({
  en:'Bid Recommendation Settings',
  zh:'调价建议设置',
  bi:'调价建议设置 / Bid Recommendation Settings'
});
const RESEARCH_TRUTH_LABELS=Object.freeze({
  en:Object.freeze({phraseTab:'Phrase Filter',phraseTitle:'Filter loaded Ads terms by one phrase',phrasePlaceholder:'Enter one keyword phrase',wordFrequency:'Word Frequency'}),
  zh:Object.freeze({phraseTab:'短语筛选',phraseTitle:'按一个短语筛选已加载广告词',phrasePlaceholder:'输入一个关键词短语',wordFrequency:'词频'}),
  bi:Object.freeze({phraseTab:'短语筛选 / Phrase Filter',phraseTitle:'按一个短语筛选已加载广告词 / Filter loaded Ads terms by one phrase',phrasePlaceholder:'输入一个关键词短语 / Enter one keyword phrase',wordFrequency:'词频 / Word Frequency'})
});
const UNAVAILABLE_REASON='Unavailable: no implemented action is connected in this runtime.';
const DISABLED_REASON='Unavailable for the current data, selection, or runtime capability.';

function clean(value){return String(value??'').replace(/\s+/g,' ').trim();}
function languageMode(value){return ['en','zh','bi'].includes(value)?value:'en';}
function bidLabel(mode='en'){return BID_LABELS[languageMode(mode)];}
function bidSettingsLabel(mode='en'){return BID_SETTINGS_LABELS[languageMode(mode)];}
function researchTruthLabels(mode='en'){return RESEARCH_TRUTH_LABELS[languageMode(mode)];}
function currentPageId(locationLike,registry){return registry?.pageFromHash?.(locationLike?.hash||'')||'';}
function delegatedActionDescriptor({id='',text='',page='',bulk='' }={}){
  const label=clean(text);
  if(id==='apply-suggestion-changes')return true;
  if(bulk==='inspect')return true;
  if(!id&&/\bExport\b/i.test(label))return true;
  if(page==='negative-library'&&label==='Thresholds')return true;
  if(page==='conflicts'&&/^Risk:\s*/i.test(label))return true;
  return false;
}
function capabilityDecision({disabled=false,title='',direct=false,delegated=false,navigation=false}={}){
  if(disabled)return{enabled:false,reason:clean(title)||DISABLED_REASON,source:'disabled'};
  if(direct)return{enabled:true,reason:'',source:'direct'};
  if(delegated)return{enabled:true,reason:'',source:'delegated'};
  if(navigation)return{enabled:true,reason:'',source:'navigation'};
  return{enabled:false,reason:UNAVAILABLE_REASON,source:'unbound'};
}

if(!root?.document||!root?.HTMLButtonElement)return{
  LEGACY_BID_KEY,BID_LABELS,BID_SETTINGS_LABELS,RESEARCH_TRUTH_LABELS,UNAVAILABLE_REASON,DISABLED_REASON,
  clean,languageMode,bidLabel,bidSettingsLabel,researchTruthLabels,currentPageId,delegatedActionDescriptor,capabilityDecision
};

const doc=root.document;
const $=(selector,scope=doc)=>scope.querySelector(selector);
const $$=(selector,scope=doc)=>[...scope.querySelectorAll(selector)];
let auditTimer=0;

function installDirectClickTracking(){
  const proto=root.HTMLButtonElement.prototype;
  if(proto.__keywordosCapabilityPatched)return;
  const nativeAdd=proto.addEventListener;
  Object.defineProperty(proto,'__keywordosCapabilityPatched',{value:true,configurable:false});
  proto.addEventListener=function(type,listener,options){
    if(type==='click'){
      this.dataset.keywordosClickBound='1';
      if(this.dataset.keywordosGuardDisabled==='1'){
        this.disabled=false;
        this.removeAttribute('aria-disabled');
        if(this.title===UNAVAILABLE_REASON)this.removeAttribute('title');
        delete this.dataset.keywordosGuardDisabled;
      }
    }
    return nativeAdd.call(this,type,listener,options);
  };
}

function mode(){return languageMode(root.KeywordOSI18N?.getLanguage?.()||'en');}
function setLeadingText(button,text){
  if(!button)return;
  const node=[...button.childNodes].find(item=>item.nodeType===3);
  if(node){if(node.nodeValue!==text)node.nodeValue=text;}
  else button.prepend(doc.createTextNode(text));
}
function setText(node,text){if(node&&node.textContent!==text)node.textContent=text;}
function normalizeSuggestionLabels(){
  if(currentPageId(root.location,root.KeywordOSPageRegistry)!=='suggestions')return;
  const tab=$(`[data-suggestion-tab="${LEGACY_BID_KEY}"]`);
  if(tab){
    tab.setAttribute('data-no-i18n','');
    setLeadingText(tab,bidLabel(mode()));
    tab.title='Rule-based bid recommendation derived from configured thresholds and imported performance; no AI/ML model is used.';
  }
  const heading=$('.suggest-settings b');
  if(heading){
    heading.setAttribute('data-no-i18n','');
    heading.dataset.keywordosBidSettings='1';
    setText(heading,bidSettingsLabel(mode()));
  }
}

function normalizeKeywordResearchTruth(){
  if(currentPageId(root.location,root.KeywordOSPageRegistry)!=='cerebro')return;
  const labels=researchTruthLabels(mode());
  const analyzeTab=$('[data-research-mode="analyze"]');
  if(analyzeTab){
    analyzeTab.setAttribute('data-no-i18n','');
    setLeadingText(analyzeTab,labels.phraseTab);
    analyzeTab.title='Single phrase only: filters the currently loaded Amazon Ads search-term evidence. Batch analysis up to 200 keywords remains a Keyword Lab task.';
  }
  const commonWords=$('.utility-links .utility-link:nth-child(2)');
  if(commonWords){
    commonWords.setAttribute('data-no-i18n','');
    setLeadingText(commonWords,labels.wordFrequency);
    commonWords.title='Scrolls to literal word frequency for the currently filtered Ads terms; no Common Words exclusion manager is implemented yet.';
  }
  const savePreset=$('#r-save');
  if(savePreset){
    savePreset.hidden=true;
    savePreset.setAttribute('aria-hidden','true');
    savePreset.title='Saved filter presets are not implemented in the current Keyword Research workspace.';
  }
  if(analyzeTab?.classList.contains('active')){
    const heading=$('.cerebro-topline h2');
    if(heading){heading.setAttribute('data-no-i18n','');setText(heading,labels.phraseTitle);}
    const input=$('#research-query');
    if(input){
      input.setAttribute('data-no-i18n','');
      if(input.placeholder!==labels.phrasePlaceholder)input.placeholder=labels.phrasePlaceholder;
      input.setAttribute('aria-label',labels.phrasePlaceholder);
    }
  }
}

function bindKeywordResearchUtilities(){
  if(currentPageId(root.location,root.KeywordOSPageRegistry)!=='cerebro')return;
  const bindings=[
    ['.utility-links .utility-link:nth-child(2)',()=>$('.wordcloud')?.closest('.summary-card')?.scrollIntoView({block:'center',behavior:'smooth'})],
    ['.utility-links .utility-link:nth-child(3)',()=>$('#page-learn')?.click()],
    ['.data-workspace .toolbar-right button:nth-child(1)',()=>$('#research-query')?.focus()],
    ['.data-workspace .toolbar-right button:nth-child(2)',()=>{if(!$('#r-apply'))$('#research-toggle')?.click();$('#r-word-min')?.focus();}]
  ];
  bindings.forEach(([selector,action])=>{
    const button=$(selector);
    if(!button||button.dataset.keywordosStableResearchBound==='1')return;
    button.dataset.keywordosStableResearchBound='1';
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();action();});
  });
}

function descriptorFor(button){
  return{
    id:button.id||'',
    text:button.textContent||'',
    page:currentPageId(root.location,root.KeywordOSPageRegistry),
    bulk:button.dataset.bulk||''
  };
}
function isNavigationButton(button){
  return button.matches('[data-page],[data-suite-page],[data-command-page],[data-lang]');
}
function auditButton(button){
  if(!(button instanceof root.HTMLButtonElement)||button.hidden||button.closest('[hidden]'))return;
  const direct=button.dataset.keywordosClickBound==='1'||typeof button.onclick==='function';
  const delegated=delegatedActionDescriptor(descriptorFor(button));
  const decision=capabilityDecision({disabled:button.disabled,title:button.title,direct,delegated,navigation:isNavigationButton(button)});
  if(button.disabled){
    button.setAttribute('aria-disabled','true');
    if(!clean(button.title))button.title=decision.reason;
    return;
  }
  if(decision.enabled){
    if(button.dataset.keywordosGuardDisabled==='1'){
      button.disabled=false;
      button.removeAttribute('aria-disabled');
      if(button.title===UNAVAILABLE_REASON)button.removeAttribute('title');
      delete button.dataset.keywordosGuardDisabled;
    }
    return;
  }
  button.disabled=true;
  button.setAttribute('aria-disabled','true');
  button.title=decision.reason;
  button.dataset.keywordosGuardDisabled='1';
}
function audit(){
  auditTimer=0;
  normalizeSuggestionLabels();
  normalizeKeywordResearchTruth();
  bindKeywordResearchUtilities();
  $$('button').forEach(auditButton);
}
function scheduleAudit(){
  if(auditTimer)return;
  auditTimer=root.setTimeout(audit,20);
}
function start(){
  installDirectClickTracking();
  const boot=()=>{
    scheduleAudit();
    const targets=[doc.body,$('#content'),$('#modal-root'),$('#drawer-root')].filter(Boolean);
    const observer=new MutationObserver(scheduleAudit);
    targets.forEach(target=>observer.observe(target,{childList:true,subtree:true}));
    doc.addEventListener('click',event=>{if(event.target instanceof root.Element&&event.target.closest('[data-lang]'))root.setTimeout(()=>{normalizeSuggestionLabels();normalizeKeywordResearchTruth();scheduleAudit();},0);},true);
    root.addEventListener('hashchange',scheduleAudit);
    root.addEventListener('popstate',scheduleAudit);
  };
  doc.readyState==='loading'?doc.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
}

return{
  LEGACY_BID_KEY,BID_LABELS,BID_SETTINGS_LABELS,RESEARCH_TRUTH_LABELS,UNAVAILABLE_REASON,DISABLED_REASON,
  clean,languageMode,bidLabel,bidSettingsLabel,researchTruthLabels,currentPageId,delegatedActionDescriptor,capabilityDecision,
  normalizeSuggestionLabels,normalizeKeywordResearchTruth,bindKeywordResearchUtilities,auditButton,audit,start
};
});
