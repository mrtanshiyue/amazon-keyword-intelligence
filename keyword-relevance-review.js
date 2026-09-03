(function(root,factory){
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
