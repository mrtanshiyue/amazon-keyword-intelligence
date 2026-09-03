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
  competitor:{required:[['ASIN','Child ASIN']],dates:[['Date','Snapshot Date']],numbers:[
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
  'reverse-asin':{required:[['ASIN','Child ASIN','Product ASIN'],['Keyword','Search Term','Query']],dates:[['Snapshot Date','Data Date','Date']],numbers:[
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
  if(kind==='reverse-asin'){
    const asin=clean(rawValue(row,map,['ASIN','Child ASIN','Product ASIN']));
    if(asin&&!/^[A-Z0-9]{10}$/i.test(asin))reasons.push('ASIN must be a 10-character alphanumeric identifier');
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

const THIRD_PARTY_PROFILE_VERSION='keywordos-third-party-v1';
const PROFILE_FIXED_HEADERS=Object.freeze(['ASIN','Keyword','Search Volume','Organic Rank','Sponsored Rank','Traffic Share','Conversion Rate','Marketplace','Provider','Report Type','Report Version','Snapshot Date','Source File']);
const THIRD_PARTY_PROFILES=Object.freeze([
  Object.freeze({
    id:'helium10-cerebro',provider:'Helium 10',reportType:'Cerebro',kind:'reverse-asin',
    signals:Object.freeze(['Cerebro IQ Score','Title Density','Sponsored ASINs','Competing Products','CPR','Keyword Sales','ABA Total Click Rate']),
    fields:Object.freeze({
      asin:Object.freeze(['ASIN','Product ASIN','Child ASIN']),
      keyword:Object.freeze(['Keyword Phrase','Keyword','Search Term','Phrase']),
      volume:Object.freeze(['Search Volume']),
      organicRank:Object.freeze(['Organic Rank','Position (Rank)','Position Rank']),
      sponsoredRank:Object.freeze(['Sponsored Rank']),
      trafficShare:Object.freeze([]),conversionRate:Object.freeze([]),
      marketplace:Object.freeze(['Marketplace','Market','Amazon Marketplace','Site']),
      reportVersion:Object.freeze(['Report Version','Export Version']),
      snapshotDate:Object.freeze(['Snapshot Date','Data Date','Date','Last Detected'])
    })
  }),
  Object.freeze({
    id:'sellersprite-reverse-asin',provider:'SellerSprite',reportType:'Reverse ASIN',kind:'reverse-asin',
    signals:Object.freeze(['SPR','DSR','ABA Rank/W','Searches/M','M. Searches','PPC Bid','Click Concentration','Related ASINs']),
    fields:Object.freeze({
      asin:Object.freeze(['ASIN','Product ASIN','Child ASIN']),
      keyword:Object.freeze(['Keyword','Search Term','Search Query']),
      volume:Object.freeze(['Searches/M','M. Searches','Monthly Searches','Monthly Search Volume','Search Volume']),
      organicRank:Object.freeze(['Organic Rank','Organic Position']),
      sponsoredRank:Object.freeze(['Sponsored Rank','Sponsored Position','SP Rank']),
      trafficShare:Object.freeze(['Impression Share','Traffic Share','Click Share']),
      conversionRate:Object.freeze(['Conversion','Conversion Rate','CVR','Purchase Rate']),
      marketplace:Object.freeze(['Marketplace','Market','Amazon Marketplace','Site']),
      reportVersion:Object.freeze(['Report Version','Export Version']),
      snapshotDate:Object.freeze(['Snapshot Date','Data Date','Date','Last Detected'])
    })
  })
]);

function sourceHeader(headers,index){return index==null?'':clean(headers[index]);}
function profileFieldIndexes(headers,profile){
  const map=headerMap(headers),indexes={};
  for(const [field,aliases] of Object.entries(profile.fields))indexes[field]=columnIndex(map,aliases);
  return indexes;
}
function detectThirdPartyProfile(kind,headers){
  if(kind!=='reverse-asin')return null;
  const normalized=new Set(headers.map(normalizeHeader));
  let best=null,bestScore=0;
  for(const profile of THIRD_PARTY_PROFILES){
    if(profile.kind!==kind)continue;
    const map=headerMap(headers),keywordIndex=columnIndex(map,profile.fields.keyword);
    if(keywordIndex==null)continue;
    const score=profile.signals.reduce((sum,signal)=>sum+(normalized.has(normalizeHeader(signal))?1:0),0);
    if(score>bestScore){best=profile;bestScore=score;}
  }
  return bestScore>0?best:null;
}
function wideAsinMetric(header){
  const label=clean(header);
  const exact=label.match(/^(?=[A-Z0-9]{10}$)(?=.*\d)([A-Z0-9]{10})$/i);
  if(exact)return{asin:exact[1].toUpperCase(),field:'organicRank'};
  const match=label.match(/^([A-Z0-9]{10})[\s_|:/-]+(organic rank|organic position|sponsored rank|sponsored position|sp rank|click share|traffic share|impression share|conversion|conversion rate|cvr)$/i);
  if(!match)return null;
  const metric=normalizeHeader(match[2]);
  const field=metric==='organic rank'||metric==='organic position'?'organicRank':metric==='sponsored rank'||metric==='sponsored position'||metric==='sp rank'?'sponsoredRank':metric==='click share'||metric==='traffic share'||metric==='impression share'?'trafficShare':'conversionRate';
  return{asin:match[1].toUpperCase(),field};
}
function consistentColumnValue(rows,index,normalizer=clean){
  if(index==null)return'';
  const values=[...new Set(rows.map(row=>normalizer(row[index]??'')).filter(Boolean))];
  return values.length===1?values[0]:'';
}
function profileThirdPartyCsv(kind,text,options={}){
  const rows=parseCSV(text);
  if(!rows.length)throw new Error('CSV is empty');
  const headerIndex=rows.findIndex(row=>row.some(value=>clean(value)));
  if(headerIndex<0)throw new Error('CSV is empty');
  const headers=rows[headerIndex],dataRows=rows.slice(headerIndex+1).filter(row=>row.some(value=>clean(value)));
  if(!dataRows.length)throw new Error('CSV contains no data rows');
  for(let index=0;index<dataRows.length;index+=1)if(dataRows[index].length!==headers.length)throw new Error(`Third-party CSV row ${headerIndex+index+2} has ${dataRows[index].length} columns; expected ${headers.length}`);
  const profile=detectThirdPartyProfile(kind,headers);
  if(!profile)return null;
  const indexes=profileFieldIndexes(headers,profile),usedIndexes=new Set(Object.values(indexes).filter(index=>index!=null));
  const wide=new Map();
  if(indexes.asin==null){
    headers.forEach((header,index)=>{const match=wideAsinMetric(header);if(!match)return;usedIndexes.add(index);const metrics=wide.get(match.asin)||{};metrics[match.field]=index;wide.set(match.asin,metrics);});
  }
  const unknownIndexes=[];
  headers.forEach((header,index)=>{if(clean(header)&&!usedIndexes.has(index))unknownIndexes.push(index);});
  const unknownHeaders=unknownIndexes.map(index=>clean(headers[index]));
  const fallbackAsin=clean(options.asin).toUpperCase(),fallbackMarketplace=clean(options.marketplace),fallbackSnapshot=clean(options.snapshotDate),fallbackVersion=clean(options.reportVersion),sourceFile=clean(options.sourceFile);
  if(fallbackAsin&&!/^[A-Z0-9]{10}$/i.test(fallbackAsin))throw new Error('Fallback ASIN must be a 10-character alphanumeric identifier');
  if(fallbackSnapshot&&!strictDate(fallbackSnapshot))throw new Error('Snapshot date must use a valid YYYY-MM-DD date');
  const detectedAsin=consistentColumnValue(dataRows,indexes.asin,value=>clean(value).toUpperCase());
  const detectedMarketplace=consistentColumnValue(dataRows,indexes.marketplace);
  const detectedSnapshotDate=consistentColumnValue(dataRows,indexes.snapshotDate,value=>strictDate(value)||clean(value));
  const detectedReportVersion=consistentColumnValue(dataRows,indexes.reportVersion);
  const defaults={asin:detectedAsin||fallbackAsin,marketplace:detectedMarketplace||fallbackMarketplace,snapshotDate:detectedSnapshotDate||fallbackSnapshot,reportVersion:detectedReportVersion||fallbackVersion};
  const outputRows=[],previewRows=[],missing=new Set();
  const value=(row,field)=>indexes[field]==null?'':row[indexes[field]]??'';
  const metadata=(row,field,fallback)=>clean(value(row,field))||fallback;
  const addOutput=(row,asin,metrics={})=>{
    const keyword=clean(value(row,'keyword'));
    const marketplace=metadata(row,'marketplace',fallbackMarketplace);
    const snapshotRaw=metadata(row,'snapshotDate',fallbackSnapshot),snapshotDate=snapshotRaw?(strictDate(snapshotRaw)||snapshotRaw):'';
    const reportVersion=metadata(row,'reportVersion',fallbackVersion);
    if(!asin)missing.add('asin');
    if(!marketplace)missing.add('marketplace');
    if(!snapshotDate)missing.add('snapshotDate');
    const fixed=[
      asin,keyword,value(row,'volume'),metrics.organicRank??value(row,'organicRank'),metrics.sponsoredRank??value(row,'sponsoredRank'),metrics.trafficShare??value(row,'trafficShare'),metrics.conversionRate??value(row,'conversionRate'),
      marketplace,profile.provider,profile.reportType,reportVersion,snapshotDate,sourceFile
    ];
    const extras=unknownIndexes.map(index=>row[index]??'');
    outputRows.push([...fixed,...extras]);
    if(previewRows.length<5)previewRows.push({asin,keyword,searchVolume:fixed[2],organicRank:fixed[3],sponsoredRank:fixed[4],marketplace,snapshotDate});
  };
  for(const row of dataRows){
    const explicitAsin=clean(value(row,'asin')).toUpperCase();
    if(explicitAsin){addOutput(row,explicitAsin);continue;}
    if(wide.size){
      let expanded=false;
      for(const [asin,metricIndexes] of wide){
        const metrics={};let hasMetric=false;
        for(const [field,index] of Object.entries(metricIndexes)){const raw=row[index]??'';metrics[field]=raw;if(clean(raw))hasMetric=true;}
        if(hasMetric){addOutput(row,asin,metrics);expanded=true;}
      }
      if(expanded)continue;
    }
    addOutput(row,fallbackAsin);
  }
  const normalizedHeaders=[...PROFILE_FIXED_HEADERS,...unknownHeaders];
  const normalizedCsv=[csvRow(normalizedHeaders),...outputRows.map(csvRow)].join('\n');
  const mapping={
    ASIN:indexes.asin!=null?sourceHeader(headers,indexes.asin):(wide.size?`${wide.size} ASIN rank column${wide.size===1?'':'s'}`:(fallbackAsin?'Fallback ASIN':'')),
    Keyword:sourceHeader(headers,indexes.keyword),
    'Search Volume':sourceHeader(headers,indexes.volume),
    'Organic Rank':sourceHeader(headers,indexes.organicRank)||(wide.size?'ASIN-specific rank columns':''),
    'Sponsored Rank':sourceHeader(headers,indexes.sponsoredRank),
    'Traffic Share':sourceHeader(headers,indexes.trafficShare),
    'Conversion Rate':sourceHeader(headers,indexes.conversionRate)
  };
  return{
    profiled:true,profileId:profile.id,profileVersion:THIRD_PARTY_PROFILE_VERSION,provider:profile.provider,reportType:profile.reportType,reportVersion:defaults.reportVersion,
    sourceHeaders:[...headers],unknownHeaders,mapping,wideAsins:[...wide.keys()],defaults,missingMetadata:[...missing],canProfile:missing.size===0,normalizedCsv,previewRows,sourceFile
  };
}

return{MAX_IMPORT_BYTES,SUPPORTED_KINDS,SCHEMAS,THIRD_PARTY_PROFILE_VERSION,PROFILE_FIXED_HEADERS,THIRD_PARTY_PROFILES,parseCSV,strictDate,strictNumber,detectThirdPartyProfile,profileThirdPartyCsv,validateGrowthCsv};
});