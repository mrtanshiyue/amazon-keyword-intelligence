(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSGrowthImportGateTest=api;
  if(root){root.KeywordOSGrowthImportGate=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const INPUT_PREFIX='growth-file-';
let latestReport=null;
let pendingThirdParty=null;

function kindForInputId(id){
  const value=String(id||'');
  return value.startsWith(INPUT_PREFIX)?value.slice(INPUT_PREFIX.length):'';
}
function summaryText(report){
  if(!report)return'';
  return `${report.acceptedCount} accepted · ${report.rejectedCount} rejected · ${report.skippedCount} skipped`;
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function downloadRejected(report){
  if(!root?.document||!report?.rejectedCsv)return false;
  const blob=new Blob(['\uFEFF',report.rejectedCsv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`KeywordOS_${report.kind}_rejected_rows_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);return true;
}
function compactList(values,limit=10){const list=Array.isArray(values)?values.filter(Boolean):[];return list.length>limit?`${list.slice(0,limit).join(', ')} +${list.length-limit} more`:list.join(', ')||'None';}
function renderReport(){
  if(!root?.document)return;
  document.getElementById('keywordos-growth-validation-report')?.remove();
  if(!latestReport)return;
  const content=document.getElementById('content');
  if(!content)return;
  const card=document.createElement('div');
  card.id='keywordos-growth-validation-report';
  card.className='notice-banner';
  const profile=latestReport.profile;
  if(latestReport.pending&&profile){
    const mappings=Object.entries(profile.mapping||{}).filter(([,source])=>source).map(([target,source])=>`${target} ← ${source}`);
    const previews=(profile.previewRows||[]).slice(0,3).map(row=>`${row.asin||'ASIN required'} · ${row.keyword||'Keyword missing'} · volume ${row.searchVolume||'—'} · organic ${row.organicRank||'—'} · sponsored ${row.sponsoredRank||'—'}`);
    const missing=profile.missingMetadata?.length?`<div><b>Required before import:</b> ${escapeHtml(profile.missingMetadata.join(', '))}</div>`:'';
    card.innerHTML=`<b>Third-party CSV profile:</b> ${escapeHtml(profile.provider)} · ${escapeHtml(profile.reportType)} · ${escapeHtml(profile.profileVersion)}<div><small>Mapped: ${escapeHtml(compactList(mappings,8))}</small></div><div><small>Preserved vendor columns: ${escapeHtml(compactList(profile.unknownHeaders,10))}</small></div>${missing}<div><small>Preview: ${escapeHtml(previews.join(' | ')||'No preview rows')}</small></div><div class="top-gap"><label>Fallback ASIN <input id="keywordos-profile-asin" value="${escapeHtml(profile.defaults?.asin||'')}" placeholder="10-character ASIN"></label> <label>Marketplace <input id="keywordos-profile-marketplace" value="${escapeHtml(profile.defaults?.marketplace||'')}" placeholder="US"></label> <label>Snapshot Date <input id="keywordos-profile-snapshot" type="date" value="${escapeHtml(profile.defaults?.snapshotDate||'')}"></label> <label>Report Version <input id="keywordos-profile-version" value="${escapeHtml(profile.defaults?.reportVersion||'')}" placeholder="optional"></label> <button type="button" class="btn primary" id="keywordos-confirm-third-party">Validate & import</button></div>`;
  }else{
    const rejected=latestReport.rejectedCount>0?` <button type="button" class="btn sm" id="keywordos-download-rejected-growth">Download rejected rows</button>`:'';
    const source=profile?` <small>Profile: ${escapeHtml(profile.provider)} · ${escapeHtml(profile.reportType)}; ${profile.unknownHeaders.length} vendor columns preserved.</small>`:'';
    card.innerHTML=`<b>Growth CSV validation:</b> ${escapeHtml(summaryText(latestReport))}. Only accepted rows are forwarded to the workspace parser.${rejected}${source}`;
  }
  const readiness=content.querySelector('.keywordos-import-readiness');
  if(readiness)readiness.insertAdjacentElement('afterend',card);else content.prepend(card);
  card.querySelector('#keywordos-download-rejected-growth')?.addEventListener('click',()=>downloadRejected(latestReport));
  card.querySelector('#keywordos-confirm-third-party')?.addEventListener('click',confirmThirdParty);
}
function toast(message,type='info'){
  root?.KeywordOSUIBridge?.toast?.(message,type);
}
function sanitizedFile(file,acceptedCsv){
  if(typeof DataTransfer!=='function'||typeof File!=='function')throw new Error('This browser cannot create a validated CSV handoff');
  const transfer=new DataTransfer();
  transfer.items.add(new File([acceptedCsv],file.name||'growth-import.csv',{type:file.type||'text/csv',lastModified:file.lastModified||Date.now()}));
  return transfer.files;
}
async function confirmThirdParty(){
  const pending=pendingThirdParty,validator=root?.KeywordOSGrowthImportValidation;
  if(!pending||!validator?.profileThirdPartyCsv)return;
  try{
    const metadata={
      asin:document.getElementById('keywordos-profile-asin')?.value||'',
      marketplace:document.getElementById('keywordos-profile-marketplace')?.value||'',
      snapshotDate:document.getElementById('keywordos-profile-snapshot')?.value||'',
      reportVersion:document.getElementById('keywordos-profile-version')?.value||'',
      sourceFile:pending.file.name||''
    };
    const profile=validator.profileThirdPartyCsv(pending.kind,pending.text,metadata);
    if(!profile?.canProfile){
      latestReport={kind:pending.kind,acceptedCount:0,rejectedCount:0,skippedCount:0,rejectedCsv:'',pending:true,profile};renderReport();
      toast(`Third-party CSV blocked: add ${profile?.missingMetadata?.join(', ')||'required metadata'}.`,'error');return;
    }
    const bytes=new TextEncoder().encode(profile.normalizedCsv).byteLength;
    const report=validator.validateGrowthCsv(pending.kind,profile.normalizedCsv,{byteLength:bytes});
    report.profile=profile;latestReport=report;
    if(!report.canImport){renderReport();toast(`Growth CSV blocked: ${summaryText(report)}. Fix the rejected rows and re-import.`,'error');return;}
    const {input,file}=pending;pendingThirdParty=null;
    input.files=sanitizedFile(file,report.acceptedCsv);input.dataset.keywordosGrowthValidated='1';
    if(report.rejectedCount)toast(`Growth CSV partially accepted: ${summaryText(report)}.`,'warn');
    input.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(renderReport,0);
  }catch(error){
    latestReport={kind:pending.kind,acceptedCount:0,rejectedCount:0,skippedCount:0,rejectedCsv:'',error:String(error?.message||error),pending:true,profile:pending.profile};renderReport();toast(`Third-party CSV blocked: ${latestReport.error}`,'error');
  }
}
async function validateAndForward(input,kind,file){
  const validator=root?.KeywordOSGrowthImportValidation;
  if(!validator?.validateGrowthCsv){toast('Growth CSV validator is unavailable; import blocked.','error');return;}
  try{
    if(file.size>validator.MAX_IMPORT_BYTES)throw new Error('Growth CSV exceeds the 16 MiB browser import limit');
    const text=await file.text();
    const profile=validator.profileThirdPartyCsv?.(kind,text,{sourceFile:file.name||''});
    if(profile){
      pendingThirdParty={input,kind,file,text,profile};
      latestReport={kind,acceptedCount:0,rejectedCount:0,skippedCount:0,rejectedCsv:'',pending:true,profile};renderReport();
      toast(`${profile.provider} CSV detected. Review mapped fields and source metadata before import.`,'info');return;
    }
    const report=validator.validateGrowthCsv(kind,text,{byteLength:file.size});
    latestReport=report;renderReport();
    if(!report.canImport){toast(`Growth CSV blocked: ${summaryText(report)}. Fix the rejected rows and re-import.`,'error');return;}
    input.files=sanitizedFile(file,report.acceptedCsv);input.dataset.keywordosGrowthValidated='1';
    if(report.rejectedCount)toast(`Growth CSV partially accepted: ${summaryText(report)}.`,'warn');
    input.dispatchEvent(new Event('change',{bubbles:true}));setTimeout(renderReport,0);
  }catch(error){
    pendingThirdParty=null;latestReport={kind,acceptedCount:0,rejectedCount:0,skippedCount:0,rejectedCsv:'',error:String(error?.message||error)};renderReport();toast(`Growth CSV blocked: ${latestReport.error}`,'error');
  }
}
function handleChange(event){
  const input=event.target;
  if(!(input instanceof HTMLInputElement)||input.type!=='file')return;
  const kind=kindForInputId(input.id);
  if(!kind)return;
  if(input.dataset.keywordosGrowthValidated==='1'){
    delete input.dataset.keywordosGrowthValidated;
    return;
  }
  const file=input.files?.[0];
  if(!file)return;
  event.stopImmediatePropagation();
  void validateAndForward(input,kind,file);
}
function start(){
  if(!root?.document)return;
  const boot=()=>document.addEventListener('change',handleChange,true);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
}

return{INPUT_PREFIX,kindForInputId,summaryText,start};
});
