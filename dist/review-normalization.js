(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSReviewNormalizationTest=api;
  if(root){root.KeywordOSReviewNormalization=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const STORAGE_KEY='keywordos_growth_reviews_v1';
const MARKET_ALIASES=Object.freeze({
  'us':'US','usa':'US','united states':'US','amazon.com':'US',
  'ca':'CA','canada':'CA','amazon.ca':'CA',
  'mx':'MX','mexico':'MX','amazon.com.mx':'MX',
  'br':'BR','brazil':'BR','amazon.com.br':'BR',
  'gb':'GB','uk':'GB','united kingdom':'GB','amazon.co.uk':'GB',
  'de':'DE','germany':'DE','amazon.de':'DE',
  'fr':'FR','france':'FR','amazon.fr':'FR',
  'it':'IT','italy':'IT','amazon.it':'IT',
  'es':'ES','spain':'ES','amazon.es':'ES',
  'nl':'NL','netherlands':'NL','amazon.nl':'NL',
  'se':'SE','sweden':'SE','amazon.se':'SE',
  'pl':'PL','poland':'PL','amazon.pl':'PL',
  'be':'BE','belgium':'BE','amazon.com.be':'BE',
  'jp':'JP','japan':'JP','amazon.co.jp':'JP',
  'au':'AU','australia':'AU','amazon.com.au':'AU',
  'in':'IN','india':'IN','amazon.in':'IN',
  'sg':'SG','singapore':'SG','amazon.sg':'SG',
  'ae':'AE','united arab emirates':'AE','amazon.ae':'AE',
  'sa':'SA','saudi arabia':'SA','amazon.sa':'SA',
  'tr':'TR','turkey':'TR','amazon.com.tr':'TR',
  'eg':'EG','egypt':'EG','amazon.eg':'EG'
});
const LANGUAGE_ALIASES=Object.freeze({
  'english':'en','spanish':'es','french':'fr','german':'de','italian':'it','japanese':'ja',
  'chinese':'zh','portuguese':'pt','dutch':'nl','swedish':'sv','polish':'pl','arabic':'ar',
  'turkish':'tr','hindi':'hi','korean':'ko'
});

function clean(value){return String(value??'').trim();}
function normalizedRawKey(value){return clean(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
function marketplaceToken(value){return clean(value).toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/$/,'').trim();}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}

function normalizeMarketplace(value){
  const raw=clean(value);
  if(!raw)return{raw:'',key:'unspecified',label:'Unspecified',recognized:false};
  const token=marketplaceToken(raw);
  const canonical=MARKET_ALIASES[token]||'';
  if(canonical)return{raw,key:canonical,label:canonical,recognized:true};
  const fallback=normalizedRawKey(raw)||raw.toLowerCase();
  return{raw,key:`raw:${fallback}`,label:raw,recognized:false};
}
function canonicalLanguageTag(value){
  const raw=clean(value);
  if(!raw)return'';
  const lower=raw.toLowerCase();
  if(LANGUAGE_ALIASES[lower])return LANGUAGE_ALIASES[lower];
  const candidate=raw.replace(/_/g,'-').trim();
  if(!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(candidate))return'';
  return candidate.split('-').map((part,index)=>{
    if(index===0)return part.toLowerCase();
    if(/^[A-Za-z]{4}$/.test(part))return part[0].toUpperCase()+part.slice(1).toLowerCase();
    if(/^[A-Za-z]{2}$/.test(part)||/^\d{3}$/.test(part))return part.toUpperCase();
    return part.toLowerCase();
  }).join('-');
}
function normalizeLanguage(value){
  const raw=clean(value);
  if(!raw)return{raw:'',key:'unspecified',tag:'',label:'Unspecified',recognized:false};
  const tag=canonicalLanguageTag(raw);
  if(tag)return{raw,key:tag.split('-')[0],tag,label:tag,recognized:true};
  const fallback=normalizedRawKey(raw)||raw.toLowerCase();
  return{raw,key:`raw:${fallback}`,tag:'',label:raw,recognized:false};
}
function normalizedReviewRows(rows=[]){
  return (Array.isArray(rows)?rows:[]).map(row=>({
    ...row,
    _normalization:{marketplace:normalizeMarketplace(row?.marketplace),language:normalizeLanguage(row?.language)}
  }));
}
function reviewNormalizationSummary(rows=[]){
  const normalized=normalizedReviewRows(rows),groups=new Map();
  let missingMarketplace=0,missingLanguage=0,recognizedMarketplaceRows=0,recognizedLanguageRows=0;
  for(const row of normalized){
    const market=row._normalization.marketplace,language=row._normalization.language;
    if(!market.raw)missingMarketplace+=1;
    if(!language.raw)missingLanguage+=1;
    if(market.recognized)recognizedMarketplaceRows+=1;
    if(language.recognized)recognizedLanguageRows+=1;
    const key=`${market.key}|${language.key}`;
    const current=groups.get(key)||{
      marketplaceKey:market.key,marketplaceLabel:market.label,languageKey:language.key,rows:0,rated:0,ratingTotal:0,
      rawMarketplaces:new Set(),rawLanguages:new Set(),languageTags:new Set()
    };
    current.rows+=1;
    const rating=Number(row.rating);
    if(Number.isFinite(rating)&&rating>0){current.rated+=1;current.ratingTotal+=rating;}
    if(market.raw)current.rawMarketplaces.add(market.raw);
    if(language.raw)current.rawLanguages.add(language.raw);
    if(language.tag)current.languageTags.add(language.tag);
    groups.set(key,current);
  }
  const output=[...groups.values()].map(group=>({
    marketplaceKey:group.marketplaceKey,
    marketplaceLabel:group.marketplaceLabel,
    languageKey:group.languageKey,
    rows:group.rows,
    average:group.rated?group.ratingTotal/group.rated:null,
    rawMarketplaces:[...group.rawMarketplaces].sort((a,b)=>a.localeCompare(b)),
    rawLanguages:[...group.rawLanguages].sort((a,b)=>a.localeCompare(b)),
    languageTags:[...group.languageTags].sort((a,b)=>a.localeCompare(b))
  })).sort((a,b)=>b.rows-a.rows||a.marketplaceLabel.localeCompare(b.marketplaceLabel)||a.languageKey.localeCompare(b.languageKey));
  return{rows:normalized.length,missingMarketplace,missingLanguage,recognizedMarketplaceRows,recognizedLanguageRows,groups:output,normalized};
}
function labels(values){return values.length?values.join(', '):'—';}
function panelHtml(rows=[]){
  const summary=reviewNormalizationSummary(rows);
  const table=summary.groups.length
    ?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Normalized marketplace</th><th>Language key</th><th>Samples</th><th>Average rating</th><th>Original marketplace labels</th><th>Original language labels / tags</th></tr></thead><tbody>${summary.groups.map(group=>`<tr><td>${escapeHtml(group.marketplaceLabel)}</td><td>${escapeHtml(group.languageKey)}</td><td>${group.rows}</td><td>${group.average==null?'—':group.average.toFixed(2)}</td><td class="left">${escapeHtml(labels(group.rawMarketplaces))}</td><td class="left">${escapeHtml(labels(group.rawLanguages))}${group.languageTags.length?`<small>Canonical tags: ${escapeHtml(group.languageTags.join(', '))}</small>`:''}</td></tr>`).join('')}</tbody></table></div>`
    :'<div class="card-body"><span class="muted">No imported review rows are available for normalization.</span></div>';
  return `<div class="card top-gap" id="keywordos-review-normalization-panel"><div class="card-head"><div class="card-title"><h3>Marketplace & language normalization</h3><small>Deterministic grouping labels over imported review metadata.</small></div></div><div class="card-body"><div class="growth-kpis"><div class="growth-kpi"><span>Review samples</span><b>${summary.rows}</b><small>Original title/body unchanged</small></div><div class="growth-kpi"><span>Missing language</span><b>${summary.missingLanguage}</b><small>No language is inferred from text or marketplace</small></div><div class="growth-kpi"><span>Recognized language labels</span><b>${summary.recognizedLanguageRows}</b><small>Explicit imported labels only</small></div></div><div class="notice-banner"><b>Normalization boundary.</b> Marketplace aliases and explicit language labels/tags are normalized only for grouping. Original marketplace, language, title and review body remain unchanged. No translation or language detection is performed, and phrases are never merged across languages.</div></div>${table}</div>`;
}
function isReviewPage(){
  return root?.location?.hash==='#page=review-evidence'||clean(document.querySelector('#page-title')?.textContent)==='Review Evidence';
}
async function readRows(){
  try{const record=await root?.KeywordOSDatasetRegistry?.get?.('reviews','store-a');if(Array.isArray(record?.rows))return record.rows;}catch(error){console.warn('KeywordOS review normalization registry read skipped',error);}
  try{const rows=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(rows)?rows:[];}catch{return[];}
}
async function inject(){
  if(!isReviewPage())return;
  const content=document.querySelector('#content');
  if(!content||document.querySelector('#keywordos-review-normalization-panel'))return;
  const rows=await readRows();
  if(!isReviewPage()||document.querySelector('#keywordos-review-normalization-panel'))return;
  const holder=document.createElement('div');holder.innerHTML=panelHtml(rows);const panel=holder.firstElementChild;if(panel)content.appendChild(panel);
}
function start(){
  if(!root?.document)return;
  const run=()=>inject().catch(error=>console.warn('KeywordOS review normalization panel skipped',error));
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',run,{once:true}):run();
  root.addEventListener?.('hashchange',run);
  const content=document.querySelector('#content');if(content)new MutationObserver(run).observe(content,{childList:true});
}

return{MARKET_ALIASES,LANGUAGE_ALIASES,normalizeMarketplace,canonicalLanguageTag,normalizeLanguage,normalizedReviewRows,reviewNormalizationSummary,panelHtml,start};
});
