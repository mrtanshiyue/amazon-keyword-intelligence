(function(root){
  'use strict';

  const registry=(root?.KeywordOSPageRegistry)||globalThis.KeywordOSPageRegistry;
  const LEGACY_KEYWORD_ROUTE='cerebro';
  const LEGACY_KEYWORD_LABEL='Cerebro';
  const KEYWORD_RESEARCH_LABEL='Keyword Research';

  const SUITE_ZH=Object.freeze({products:'产品',keywords:'关键词',listing:'Listing',marketing:'营销',operations:'运营',analytics:'数据分析'});
  const SUITE_DETAIL_ZH=Object.freeze({products:['产品工作区','店铺级产品与工作区运营'],keywords:['关键词工作区','关键词研究、词库、排名追踪与冲突分析'],listing:['Listing 工作区','基于关键词证据准备 Listing，不写入 Amazon'],marketing:['营销工作区','广告分析、优化建议与受控本地操作'],operations:['运营工作区','财务、导入、同步状态与数据健康'],analytics:['数据分析工作区','组合、跨店铺与广告表现分析']});
  const SIDEBAR_ZH=Object.freeze({products:'产品',keywords:'关键词',listing:'Listing',marketing:'营销',operations:'运营',analytics:'数据分析',settings:'设置',workspaces:'工作区'});
  const PAGE_ZH=Object.freeze({
    'product-master':['产品主数据','产品主数据','使用明确的店铺级标识，确保产品关联可追溯'],
    'product-360':['产品 360','产品 360','按产品关联广告、财务、成本与库存证据'],
    'competitor-snapshots':['竞品','竞品快照','查看导入的竞品时点证据，不估算缺失值'],
    'review-evidence':['评论','评论证据','查看导入的评论样本与评分分布，不推断未提供的情绪'],
    'store-workspace':['店铺工作区','店铺工作区','在独立的店铺、连接、广告主与站点边界内工作'],
    'keyword-workflow':['关键词工作流','关键词工作流','从导入证据跟踪共享关键词资产到本地决策与结果复盘'],
    'search-funnel':['搜索漏斗','搜索查询漏斗','分析导入的 SQP 或 ABA 查询需求、漏斗份额与转化缺口'],
    'asin-comparison':['ASIN 对比','ASIN 关键词对比','对比 2–20 个 ASIN 的导入关键词证据，不补造缺失指标'],
    'rank-intelligence':['排名与收录','排名与收录追踪','追踪导入的自然排名、广告排名与收录状态快照'],
    'global-keywords':['全局关键词库','全局关键词库','跨店铺共享关键词知识；Amazon 执行仍限定在单个店铺'],
    'global-conflicts':['全局冲突中心','全局冲突中心','在创建店铺级否定动作前识别跨店铺关键词冲突'],
    'cerebro':['关键词研究','关键词研究','使用 Amazon 广告搜索词数据研究并筛选关键词机会'],
    'keyword-library':['关键词库','关键词库','管理店铺级关键词资产的生命周期、保护与表现状态'],
    'negative-library':['否定词库','否定词库','管理建议与已启用的否定目标，并控制店铺级范围与风险'],
    'conflicts':['店铺冲突保护','店铺冲突保护','识别同一店铺内对一个产品盈利、对另一个产品浪费的搜索词'],
    'listing-optimizer':['Listing 优化器','Listing 优化器 2.0','检查关键词覆盖、重复与后台搜索词 UTF-8 字节占用'],
    'overview':['广告仪表盘','广告仪表盘','查看当前 Amazon 广告档案的整体广告表现'],
    'suggestions':['优化建议','优化建议','在执行前审核竞价、关键词、否定投放与预算建议'],
    'ad-manager':['广告管理器','广告管理器','从广告活动下钻到广告组、投放目标与搜索词'],
    'rules':['规则与自动化','规则与自动化','创建可重复的竞价、收割、否定投放与预算决策规则'],
    'schedules':['分时投放计划','分时投放计划','分析小时级表现并定义受控的广告活动计划'],
    'actions':['操作中心','操作中心','在已验证的店铺执行边界内审核建议的广告变更'],
    'change-log':['变更记录','变更记录','审计导入数据及所有关键词、否定词和规则动作'],
    'action-outcomes':['操作效果','操作效果','使用后续导入的广告证据复盘已批准本地动作'],
    'unified-report':['联合报告','联合交易分析','分析收入、退款、费用、广告扣费、结算与交易级现金流'],
    'import':['导入中心','导入中心','校验、映射并合并 Amazon Ads 与联合交易报表'],
    'sync-center':['同步中心','同步中心','查看每个 Amazon 连接的独立同步任务状态'],
    'data-health':['数据健康','数据健康','在生成决策前检查新鲜度、字段、覆盖范围与连接状态'],
    'inventory-risk':['库存','库存与补货','根据导入的库存快照评估可售天数与缺货风险'],
    'portfolio-overview':['组合概览','组合概览','汇总多个店铺的情报；全局模式仅分析，不能写入 Amazon'],
    'cross-store':['跨店铺分析','跨店铺分析','比较店铺表现并迁移经验，不共享 Amazon 凭证或写入动作'],
    'analytics':['广告分析','广告分析','按组合、广告活动、广告组、目标、搜索词与产品层级分析广告表现'],
    'anomaly-center':['异常中心','异常中心','识别确定性的广告、财务、库存与数据新鲜度风险'],
    'stores-settings':['店铺','店铺','管理 KeywordOS 店铺工作区，与 Amazon 授权相互独立'],
    'amazon-connections':['Amazon 连接','Amazon 连接','每个店铺使用独立 OAuth 连接与明确广告主绑定'],
    'users-permissions':['用户与权限','用户与权限','按允许访问的店铺边界管理角色权限'],
    'settings':['工作区设置','工作区设置','配置目标 ACoS、决策阈值与关键词保护策略']
  });
  function clean(value){return String(value||'').trim();}
  function modeValue(value){return ['zh','en','bi'].includes(value)?value:'en';}
  function bilingual(en,zh,mode){const m=modeValue(mode);if(m==='zh')return zh||en;if(m==='bi')return zh&&zh!==en?`${zh} / ${en}`:en;return en;}
  function productLabel(page,label){const value=String(label??'');if(clean(page)===LEGACY_KEYWORD_ROUTE&&value.trim()===LEGACY_KEYWORD_LABEL)return KEYWORD_RESEARCH_LABEL;return value;}
  function replaceLegacyKeywordLabel(value){return String(value??'').replace(/\bCerebro\b/g,KEYWORD_RESEARCH_LABEL);}
  function pageLanguage(pageId,mode='en'){const record=registry?.page?.(pageId);if(!record)return null;if(record.virtual){const localized=suiteLanguage(record.suite,mode);return{...record,navLabel:localized?.title||record.navLabel,title:localized?.title||record.title,subtitle:localized?.subtitle||record.subtitle};}const zh=PAGE_ZH[record.id]||[];return{...record,navLabel:bilingual(record.navLabel,zh[0],mode),title:bilingual(record.title,zh[1]||zh[0],mode),subtitle:bilingual(record.subtitle,zh[2],mode)};}
  function suiteLanguage(suiteId,mode='en'){const record=registry?.suite?.(suiteId);if(!record)return null;const label=bilingual(record.label,SUITE_ZH[record.id],mode),detail=SUITE_DETAIL_ZH[record.id]||[],title=bilingual(record.title,detail[0]||`${SUITE_ZH[record.id]||record.label}工作区`,mode),subtitle=bilingual(record.subtitle,detail[1],mode);return{...record,label,title,subtitle};}
  function sidebarLabel(group,mode='en'){const en=clean(group).toUpperCase()||'',zh=SIDEBAR_ZH[clean(group).toLowerCase()]||en;return bilingual(en,zh,mode);}
  function toolWorkspaceLabel(mode='en'){return suiteLanguage('marketing',mode)?.label||bilingual('Marketing','营销',mode);}
  function activePage(doc){const active=doc?.querySelector?.('#sidebar-nav [data-page].active');if(active?.dataset?.page)return registry?.canonicalPage?.(active.dataset.page)||active.dataset.page;return registry?.pageFromHash?.(root?.location?.hash||'')||'';}
  function storeSuffix(doc){const text=doc?.getElementById?.('breadcrumb')?.textContent||'';return text.match(/( · .+)$/)?.[1]||'';}
  function setText(element,value){if(element&&value&&element.textContent!==value)element.textContent=value;}
  function localizeRemainingLegacyText(scope,mode){const doc=scope?.ownerDocument||scope;if(!doc?.createTreeWalker||typeof NodeFilter==='undefined')return 0;const rootNode=scope===doc?doc.body:scope;if(!rootNode)return 0;const walker=doc.createTreeWalker(rootNode,NodeFilter.SHOW_TEXT);let node,changed=0;while(node=walker.nextNode()){const parent=node.parentElement;if(!parent||parent.closest?.('script,style,[data-provider-label],[data-no-product-language]'))continue;const before=node.nodeValue||'';if(!before.includes(LEGACY_KEYWORD_LABEL))continue;const canonical=replaceLegacyKeywordLabel(before),translated=mode==='zh'?canonical.replace(/Keyword Research/g,'关键词研究'):mode==='bi'?canonical.replace(/Keyword Research/g,'关键词研究 / Keyword Research'):canonical;if(translated!==before){node.nodeValue=translated;changed+=1;}}return changed;}
  function applyProductLanguage(scope){const doc=root?.document;if(!doc||!registry)return 0;const mode=modeValue(root.KeywordOSI18N?.getLanguage?.()||'en'),base=scope?.querySelectorAll?scope:doc;let changed=0;const tool=doc.querySelector('#tool-switcher b'),toolLabel=toolWorkspaceLabel(mode);if(tool&&tool.textContent!==toolLabel){tool.textContent=toolLabel;tool.dataset.i18nKey='suite.marketing';changed+=1;}const suiteButtons=[...doc.querySelectorAll('.suite-nav button')];suiteButtons.forEach((button,index)=>{const suiteId=button.dataset.suite||registry.SUITE_ORDER?.[index]||'',localized=suiteLanguage(suiteId,mode);if(!localized)return;button.dataset.suite=suiteId;button.dataset.i18nKey=localized.i18nKey;if(button.textContent!==localized.label){button.textContent=localized.label;changed+=1;}});for(const button of base.querySelectorAll?.('#sidebar-nav [data-page]')||[]){const raw=button.dataset.page||'';if(registry.isLegacy?.(raw)){button.hidden=true;button.setAttribute('aria-hidden','true');button.tabIndex=-1;continue;}const localized=pageLanguage(raw,mode);if(!localized)continue;const label=button.querySelector('.nav-label');if(label&&label.textContent!==localized.navLabel){label.textContent=localized.navLabel;changed+=1;}button.title=localized.navLabel;}for(const card of base.querySelectorAll?.('[data-suite-page]')||[]){const localized=pageLanguage(card.dataset.suitePage,mode);if(!localized)continue;setText(card.querySelector('b'),localized.navLabel);setText(card.querySelector('small'),localized.subtitle);}for(const item of base.querySelectorAll?.('[data-command-page]')||[]){const localized=pageLanguage(item.dataset.commandPage,mode);if(!localized)continue;setText(item.querySelector('b'),localized.navLabel);const section=item.querySelector('small');if(section)setText(section,localized.virtual?sidebarLabel('workspaces',mode):sidebarLabel(localized.sidebarGroup,mode));}const pageId=activePage(doc),localized=pageLanguage(pageId,mode);if(localized){const eyebrow=sidebarLabel(localized.sidebarGroup==='settings'?'settings':localized.suite||localized.sidebarGroup,mode);setText(doc.getElementById('page-eyebrow'),eyebrow);setText(doc.getElementById('page-title'),localized.title);setText(doc.getElementById('page-subtitle'),localized.subtitle);setText(doc.getElementById('breadcrumb'),`${eyebrow} / ${localized.title}${storeSuffix(doc)}`);}changed+=localizeRemainingLegacyText(base===doc?doc:base,mode);return changed;}
  function start(){if(!root?.document||!registry)return;const boot=()=>{applyProductLanguage(root.document);root.document.querySelectorAll('[data-lang]').forEach(button=>button.addEventListener('click',()=>setTimeout(()=>applyProductLanguage(root.document),0)));if(typeof MutationObserver!=='undefined'&&root.document.body)new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes||[])if(node.nodeType===1)applyProductLanguage(node);}).observe(root.document.body,{childList:true,subtree:true});};root.document.readyState==='loading'?root.document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();}
  const api={LEGACY_KEYWORD_ROUTE,LEGACY_KEYWORD_LABEL,KEYWORD_RESEARCH_LABEL,SUITE_ZH,SUITE_DETAIL_ZH,SIDEBAR_ZH,PAGE_ZH,productLabel,replaceLegacyKeywordLabel,pageLanguage,suiteLanguage,sidebarLabel,toolWorkspaceLabel,apply:applyProductLanguage,applyProductLanguage,start};
  if(typeof globalThis!=='undefined')globalThis.KeywordOSProductLanguageTest=api;if(root){root.KeywordOSProductLanguage=api;start();}
})(typeof window!=='undefined'?window:null);