(function(root,factory){
  const api=factory(root);
  if(typeof globalThis!=='undefined')globalThis.KeywordOSGrowthImportGateTest=api;
  if(root){root.KeywordOSGrowthImportGate=api;api.start?.();}
})(typeof window!=='undefined'?window:null,function(root){
'use strict';

const INPUT_PREFIX='growth-file-';
let latestReport=null;

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
function renderReport(){
  if(!root?.document)return;
  document.getElementById('keywordos-growth-validation-report')?.remove();
  if(!latestReport)return;
  const content=document.getElementById('content');
  if(!content)return;
  const card=document.createElement('div');
  card.id='keywordos-growth-validation-report';
  card.className='notice-banner';
  const rejected=latestReport.rejectedCount>0
    ?` <button type="button" class="btn sm" id="keywordos-download-rejected-growth">Download rejected rows</button>`:'';
  card.innerHTML=`<b>Growth CSV validation:</b> ${escapeHtml(summaryText(latestReport))}. Only accepted rows are forwarded to the workspace parser.${rejected}`;
  const readiness=content.querySelector('.keywordos-import-readiness');
  if(readiness)readiness.insertAdjacentElement('afterend',card);else content.prepend(card);
  card.querySelector('#keywordos-download-rejected-growth')?.addEventListener('click',()=>downloadRejected(latestReport));
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
async function validateAndForward(input,kind,file){
  const validator=root?.KeywordOSGrowthImportValidation;
  if(!validator?.validateGrowthCsv){toast('Growth CSV validator is unavailable; import blocked.','error');return;}
  try{
    const text=await file.text();
    const report=validator.validateGrowthCsv(kind,text,{byteLength:file.size});
    latestReport=report;renderReport();
    if(!report.canImport){
      toast(`Growth CSV blocked: ${summaryText(report)}. Fix the rejected rows and re-import.`,'error');
      return;
    }
    input.files=sanitizedFile(file,report.acceptedCsv);
    input.dataset.keywordosGrowthValidated='1';
    if(report.rejectedCount)toast(`Growth CSV partially accepted: ${summaryText(report)}.`,'warn');
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }catch(error){
    latestReport={kind,acceptedCount:0,rejectedCount:0,skippedCount:0,rejectedCsv:'',error:String(error?.message||error)};
    renderReport();
    toast(`Growth CSV blocked: ${latestReport.error}`,'error');
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
