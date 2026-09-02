(function(root,factory){
  const api=factory();
  if(typeof globalThis!=='undefined')globalThis.KeywordOSGrowthImportValidationTest=api;
  if(root)root.KeywordOSGrowthImportValidation=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';

const MAX_IMPORT_BYTES=16*1024*1024;
const SUPPORTED_KINDS=new Set(['sqp','costs','inventory','ranks','product-master','competitor','reviews','reverse-asin']);
const SCHEMAS={
  sqp:{required:[['Search Query','Query','Search Term']],dates:[['Date','Reporting Date','Week Start','Start Date']],numbers:[
    [['Search Query Score','Search Frequency Rank','Query Rank'],'nonnegative'],
    [['Search Query Volume','Search Volume','Query Volume'],'nonnegative'],
    [['Impressions Total Count','Impressions','Total Impressions'],'nonnegative'],
    [['Clicks Total Count','Clicks','Total Clicks'],'nonnegative'],
    [['Cart Adds Total Count','Cart Adds','Add To Cart'],'nonnegative'],
    [['Purchases Total Count','Purchases','Orders'],'nonnegative'],
    [['Brand Impression Share','Impression Share'],'ratio'],
    [['Brand Click Share','Click Share'],'ratio'],
    [['Brand Purchase Share','Purchase Share','Conversion Share'],'ratio']
  ]},
  costs:{required:[['SKU','Seller SKU']],numbers:[
    [['Unit Cost','COGS','Product Cost'],'nonnegative'],
    [['Inbound Cost','Shipping Cost','Freight Per Unit'],'nonnegative']
  ]},
  inventory:{required:[['SKU','Seller SKU']],dates:[['Date','Snapshot Date']],numbers:[
    [['Available','Fulfillable','afn fulfillable quantity'],'nonnegative'],
    [['Inbound','Inbound Working','afn inbound working quantity'],'nonnegative'],
    [['Reserved','afn reserved quantity'],'nonnegative'],
    [['Unfulfillable','afn unsellable quantity'],'nonnegative']
  ]},
  ranks:{required:[['Date','Snapshot Date'],['Keyword','Search Term','Query'],['ASIN','Child ASIN']],requiredDates:[['Date','Snapshot Date']],numbers:[
    [['Organic Rank','Natural Rank'],'nonnegative'],
    [['Sponsored Rank','Ad Rank'],'nonnegative']
  ]},
  'product-master':{required:[['Product ID','Product Code','Product']],requiredAny:[[['SKU','Seller SKU'],['ASIN','Child ASIN']]]},
  competitor:{required:[['Date','Snapshot Date'],['ASIN','Child ASIN']],requiredDates:[['Date','Snapshot Date']],numbers:[
    [['Price','Current Price'],'nonnegative'],
    [['BSR','Best Sellers Rank'],'nonnegative'],
    [['Rating','Star Rating'],'rating'],
    [['Review Count','Reviews'],'nonnegative'],
    [['Estimated Sales','Sales Estimate'],'nonnegative'],
    [['Variants','Variant Count'],'nonnegative']
  ]},
  reviews:{required:[['Date','Review Date'],['ASIN','Child ASIN'],['Rating','Star Rating'],['Title','Review Title'],['Body','Review Body','Review Text']],requiredDates:[['Date','Review Date']],numbers:[
    [['Rating','Star Rating'],'rating-required']
  ]},
  'reverse-asin':{required:[['ASIN','Child ASIN','Product ASIN'],['Keyword','Search Term','Query']],numbers:[
    [['Search Volume','Volume','Search Query Volume'],'nonnegative'],
    [['Organic Rank','Natural Rank'],'nonnegative'],
    [['Sponsored Rank','Ad Rank'],'nonnegative'],
    [['Traffic Share','Click Share'],'ratio'],
    [['Conversion Rate','CVR'],'ratio']
  ]}
};

function normalizeHeader(value){return String(value??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');}
function clean(value){return String(value??'').trim();}
function csvCell(value){const text=String(value??'');return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
function csvRow(values){return values.map(csvCell).join(',');}

function parseCSV(text){
  const source=String(text??'').replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<source.length;i+=1){
    const char=source[i],next=source[i+1];
    if(char==='"'&&quoted&&next==='"'){field+='"';i+=1;continue;}
    if(char==='"'){quoted=!quoted;continue;}
    if(char===','&&!quoted){row.push(field);field='';continue;}
    if((char==='\n'||char==='\r')&&!quoted){
      if(char==='\r'&&next==='\n')i+=1;
      row.push(field);rows.push(row);row=[];field='';continue;
    }
    field+=char;
  }
  if(quoted)throw new Error('CSV contains an unclosed quoted field');
  row.push(field);
  if(row.some(value=>value!==''))rows.push(row);
  return rows;
}

function strictDate(value){
  const raw=clean(value);
  if(!raw)return null;
  const match=raw.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[T\s].*)?$/);
  if(!match)return null;
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  return `${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function strictNumber(value){
  const raw=clean(value);
  if(!raw)return{blank:true,value:null};
  const stripped=raw.replace(/[$,%\s,]/g,'');
  if(!stripped||!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(stripped))return{blank:false,value:null};
  const number=Number(stripped);
  return{blank:false,value:Number.isFinite(number)?number:null};
}

function headerMap(headers){
  const map=new Map();
  headers.forEach((header,index)=>map.set(normalizeHeader(header),index));
  return map;
}
function columnIndex(map,aliases){
  for(const alias of aliases){const index=map.get(normalizeHeader(alias));if(index!=null)return index;}
  return null;
}
function rawValue(row,map,aliases){const index=columnIndex(map,aliases);return index==null?'':row[index]??'';}
function labelFor(aliases){return aliases[0];}
function hasColumn(map,aliases){return columnIndex(map,aliases)!=null;}

function validateHeaders(kind,map){
  const schema=SCHEMAS[kind],errors=[];
  for(const aliases of schema.required||[]){if(!hasColumn(map,aliases))errors.push(`Missing required column: ${labelFor(aliases)}`);}
  for(const groups of schema.requiredAny||[]){if(!groups.some(aliases=>hasColumn(map,aliases)))errors.push(`Missing required column: one of ${groups.map(labelFor).join(' / ')}`);}
  return errors;
}

function validateNumber(raw,mode,label,reasons){
  const parsed=strictNumber(raw);
  if(parsed.blank){if(mode==='rating-required')reasons.push(`${label} is required`);return;}
  if(parsed.value==null){reasons.push(`${label} is not a valid number`);return;}
  if(mode==='nonnegative'&&parsed.value<0)reasons.push(`${label} must be 0 or greater`);
  if((mode==='rating'||mode==='rating-required')&&(parsed.value<1||parsed.value>5))reasons.push(`${label} must be between 1 and 5`);
  if(mode==='ratio'&&(parsed.value<0||parsed.value>100))reasons.push(`${label} must be between 0 and 1, or 0% and 100%`);
}

function validateRow(kind,row,map,rowNumber){
  const schema=SCHEMAS[kind],reasons=[];
  if(!row.some(value=>clean(value)))return{state:'skipped',rowNumber,reasons:['Blank row']};
  for(const aliases of schema.required||[]){
    const raw=rawValue(row,map,aliases);
    if(!clean(raw))reasons.push(`${labelFor(aliases)} is required`);
  }
  for(const groups of schema.requiredAny||[]){
    if(!groups.some(aliases=>clean(rawValue(row,map,aliases))))reasons.push(`One of ${groups.map(labelFor).join(' / ')} is required`);
  }
  for(const aliases of schema.requiredDates||[]){
    const raw=rawValue(row,map,aliases);
    if(clean(raw)&&!strictDate(raw))reasons.push(`${labelFor(aliases)} is not a valid ISO-style date`);
  }
  for(const aliases of schema.dates||[]){
    const raw=rawValue(row,map,aliases);
    if(clean(raw)&&!strictDate(raw))reasons.push(`${labelFor(aliases)} is not a valid ISO-style date`);
  }
  for(const [aliases,mode] of schema.numbers||[]){
    if(!hasColumn(map,aliases))continue;
    validateNumber(rawValue(row,map,aliases),mode,labelFor(aliases),reasons);
  }
  return{state:reasons.length?'rejected':'accepted',rowNumber,reasons};
}

function rejectedCsv(headers,rejected){
  if(!rejected.length)return'';
  return [csvRow(['CSV Row','Reason',...headers]),...rejected.map(item=>csvRow([item.rowNumber,item.reasons.join('; '),...item.row]))].join('\n');
}

function validateGrowthCsv(kind,text,{byteLength=null}={}){
  if(!SUPPORTED_KINDS.has(kind))throw new Error(`Unsupported growth CSV kind: ${kind}`);
  const bytes=byteLength==null?new TextEncoder().encode(String(text??'')).byteLength:Number(byteLength);
  if(!Number.isFinite(bytes)||bytes<0)throw new Error('CSV byte length is invalid');
  if(bytes>MAX_IMPORT_BYTES)throw new Error('Growth CSV exceeds the 16 MiB browser import limit');
  const rows=parseCSV(text);
  if(!rows.length)throw new Error('CSV is empty');
  const headerIndex=rows.findIndex(row=>row.some(value=>clean(value)));
  if(headerIndex<0)throw new Error('CSV is empty');
  const headers=rows[headerIndex],map=headerMap(headers),headerErrors=validateHeaders(kind,map);
  if(headerErrors.length)throw new Error(headerErrors.join('; '));
  const accepted=[],rejected=[];let skippedCount=0;
  for(let index=headerIndex+1;index<rows.length;index+=1){
    const row=rows[index],rowNumber=index+1;
    if(!row.some(value=>clean(value))){skippedCount+=1;continue;}
    if(row.length!==headers.length){rejected.push({rowNumber,row,reasons:[`Expected ${headers.length} columns but found ${row.length}`]});continue;}
    const result=validateRow(kind,row,map,rowNumber);
    if(result.state==='skipped'){skippedCount+=1;continue;}
    if(result.state==='rejected'){rejected.push({...result,row});continue;}
    accepted.push(row);
  }
  if(kind==='reverse-asin'&&accepted.length){
    const asinAliases=['ASIN','Child ASIN','Product ASIN'],asinIndex=columnIndex(map,asinAliases);
    const asins=new Set(accepted.map(row=>clean(row[asinIndex])).filter(Boolean));
    if(asins.size>20)throw new Error('Reverse-ASIN comparison supports at most 20 ASINs per import');
  }
  const acceptedCsv=[csvRow(headers),...accepted.map(csvRow)].join('\n');
  return{
    kind,
    acceptedCount:accepted.length,
    rejectedCount:rejected.length,
    skippedCount,
    acceptedCsv,
    rejectedCsv:rejectedCsv(headers,rejected),
    rejectedRows:rejected,
    canImport:accepted.length>0,
    partial:accepted.length>0&&rejected.length>0
  };
}

return{MAX_IMPORT_BYTES,SUPPORTED_KINDS,SCHEMAS,parseCSV,strictDate,strictNumber,validateGrowthCsv};
});