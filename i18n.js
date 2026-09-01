(() => {
'use strict';
const KEY='keywordos_language_v9';
let mode=localStorage.getItem(KEY)||'zh';
const originalText=new WeakMap();
const originalAttrs=new WeakMap();

const ZH={
  // Global shell
  'Amazon Intelligence':'亚马逊智能运营','Advertising':'广告管理','Amazon US workspace':'亚马逊美国站工作区',
  'Settings':'设置','Help Center':'帮助中心','US · Local workspace':'美国站 · 本地工作区','Tools':'工具',
  'Products':'产品','Keywords':'关键词','Listing':'Listing','Marketing':'营销','Operations':'运营','Analytics':'数据分析',
  'Profile':'店铺账户','Date range':'日期范围','Last 7 days':'最近 7 天','Last 14 days':'最近 14 天','Last 30 days':'最近 30 天','Last 60 days':'最近 60 天','All available data':'全部数据','＋ Import Data':'＋ 导入数据','Import Data':'导入数据',
  'Search':'搜索','Notifications':'通知','Help':'帮助','Collapse':'收起侧栏',
  // Navigation
  'OVERVIEW':'概览','Account Overview':'账户概览','Dashboard':'广告仪表盘','ADVERTISING':'广告管理','Suggestions':'优化建议','Ad Manager':'广告管理器','Rules & Automation':'规则与自动化','Dayparting Schedules':'分时投放计划','Action Center':'操作中心','Change Log':'变更记录',
  'FINANCE':'财务','Unified Report':'联合报告分析','KEYWORD RESEARCH':'关键词研究','Cerebro':'关键词研究','Keyword Tracker':'关键词追踪','Keyword Library':'关键词库','Negative Library':'否定词库','Conflict Guard':'冲突保护','DATA & SETTINGS':'数据与设置','Workspace Settings':'工作区设置','DATA':'数据','SETTINGS':'设置',
  'High-level advertising performance across the selected profile and date range.':'查看当前店铺和日期范围内的广告整体表现。',
  'Manage campaigns and drill down from campaign to ad group, target and search term.':'管理广告活动，并从广告活动逐层下钻到广告组、投放目标和搜索词。',
  'Analyze advertising performance across portfolio, campaign, ad group, target, search term and product levels.':'按广告组合、广告活动、广告组、投放目标、搜索词和产品层级分析广告表现。',
  'Create repeatable bid, harvest, negative-targeting and budget decision rules.':'创建可重复执行的竞价、关键词收割、否定投放和预算决策规则。',
  'Review proposed advertising changes before exporting or applying them.':'在导出或执行前审核系统建议的广告操作。',
  'Audit imported data and every keyword, negative and rule action.':'审计导入数据以及所有关键词、否定词和规则操作。',
  'Research and qualify keyword opportunities using your Amazon advertising search-term data.':'使用亚马逊广告搜索词数据研究并筛选关键词机会。',
  'Track the paid performance of strategic keywords; organic/sponsored rank can be connected later.':'追踪战略关键词的广告表现；自然排名和广告排名可在后续接入。',
  'Your cross-store keyword asset library with lifecycle, protection and performance status.':'跨店铺关键词资产库，管理生命周期、保护状态和绩效。',
  'Manage suggested and active negative targets with scope and risk controls.':'管理建议与已启用的否定投放，并控制作用范围和风险。',
  'Detect terms that are profitable for one product but wasteful for another before negative targeting.':'在执行否定前识别“一个产品盈利、另一个产品浪费”的冲突搜索词。',
  'Analyze Amazon income, refunds, fees, advertising charges, settlements and transaction-level cash flow.':'分析亚马逊收入、退款、费用、广告扣费、结算和交易级资金流。',
  'Validate, map and merge Amazon Ads search-term reports without losing the original schema.':'校验、映射并合并亚马逊广告搜索词报表，同时保留原始字段。',
  'Configure target ACoS, decision thresholds and keyword protection policies.':'设置目标 ACoS、决策阈值和关键词保护策略。',
  // Core metrics / common table terms
  'Ad Spend':'广告花费','Ad Sales':'广告销售额','Spend':'花费','Sales':'销售额','Orders':'订单','Order':'订单','Clicks':'点击','Impressions':'展示','CTR':'CTR 点击率','CVR':'CVR 转化率','CPC':'CPC 单次点击成本','ACoS':'ACoS 广告销售成本比','ROAS':'ROAS 广告投入产出比','Avg Bid':'平均竞价','Target ACoS':'目标 ACoS','TACoS Proxy':'TACoS 参考值',
  'Campaign':'广告活动','Campaigns':'广告活动','Ad Group':'广告组','Ad Groups':'广告组','Target':'投放目标','Targets':'投放目标','Targeting':'投放','Targeting Type':'投放类型','Match Type':'匹配类型','Search Term':'搜索词','Search Terms':'搜索词','Keyword':'关键词','Portfolio':'广告组合','Product':'产品','Status':'状态','Type':'类型','Date':'日期','Total':'合计','Quantity':'数量','Description':'描述','Account':'账户','Marketplace':'站点','Mode':'模式','Rows':'行数','Fields':'字段数','Raw field':'原始字段','Result':'结果','Results':'结果',
  'Enabled':'已启用','Paused':'已暂停','Active':'已启用','Pending':'待审核','Approved':'已批准','Rejected':'已拒绝','Suggested':'建议','Protected':'受保护','Testing':'测试中','Winner':'优质词','Weak':'低效','Core':'核心','Manual':'手动','Automatic':'自动','Auto':'自动','Other':'其他','Exact':'精准','EXACT':'精准','PHRASE':'词组','BROAD':'广泛',
  // Overview and analytics
  'Advertising Performance':'广告表现','Total Sales':'总销售额','Highest ACoS Campaigns':'ACoS 最高的广告活动','Highest Spend Targets':'花费最高的投放目标','Campaign Performance':'广告活动表现','Optimization Queue':'优化队列','Seller / finance data':'卖家 / 财务数据','Ad spend ÷ total sales':'广告花费 ÷ 总销售额','Daily':'按天','Sales':'销售额','View all →':'查看全部 →','Top Campaigns by Spend':'花费最高的广告活动','Top Products by Sales':'销售额最高的产品','Account Health':'账户健康度','Optimization Opportunities':'优化机会','Harvest opportunities':'可收割关键词','Negative conflicts':'否定冲突','Active Negatives':'已启用否定词','Protected Blocks':'保护拦截','Healthy advertising efficiency':'广告效率健康','Needs focused optimization':'需要重点优化','High optimization priority':'高优先级优化','All data':'全部数据','No previous data':'无上一周期数据','vs previous':'对比上一周期',
  // Filters / workspace
  'Show Filters':'显示筛选器','Hide Filters':'隐藏筛选器','Filter Library':'筛选器库','Columns':'列设置','Column Settings':'列设置','Export':'导出','Create Campaign':'新建广告活动','Search campaigns':'搜索广告活动','Search target, rule or campaign':'搜索投放目标、规则或广告活动','All statuses':'全部状态','All targeting':'全部投放类型','All products':'全部产品','All match types':'全部匹配类型','Clicks Min / Max':'点击数 最小 / 最大','Orders Min / Max':'订单数 最小 / 最大','Spend Min / Max':'花费 最小 / 最大','Sales Min / Max':'销售额 最小 / 最大','ACoS Min / Max (%)':'ACoS 最小 / 最大 (%)','ROAS Min / Max':'ROAS 最小 / 最大','Min':'最小','Max':'最大','Clear':'清除','Reset':'重置','Apply Filters':'应用筛选','Save as Filter Preset':'保存为筛选预设','Save Filter Preset':'保存筛选预设','Save Preset':'保存预设','Filter preset saved':'筛选预设已保存','Enter a preset name':'输入预设名称','All campaigns':'全部广告活动','No Portfolio':'无广告组合','No constraints':'无限制','Page size':'每页数量',
  // Ad manager / rules
  'Ad Manager Beta':'广告管理器 Beta','Campaign → Ad Group → Target → Search Term drill-down is enabled. All changes are staged in Action Center before export.':'已启用“广告活动 → 广告组 → 投放目标 → 搜索词”逐层下钻。所有修改会先进入操作中心审核，再导出执行。',
  'AI Bids':'AI 竞价','Bids':'竞价建议','New Keywords':'新关键词','Negative Keywords':'否定关键词','Recommended Change':'建议调整','Account AI Bid Settings':'账户 AI 竞价设置','Maximum Bid':'最高竞价','Apply 0 Changes':'应用 0 项修改','Review bid, keyword, negative-targeting and budget recommendations before applying changes.':'在执行前审核竞价、关键词、否定投放和预算建议。','Hourly Campaign Performance':'广告活动分时表现','Hourly analytics requires API-connected hourly data':'分时分析需要 API 小时级数据','This frontend shows the H10-style schedule workflow without inventing hourly performance metrics.':'当前前端仅展示分时计划工作流，不虚构小时级绩效数据。','＋ Create Schedule':'＋ 创建计划','Schedules':'计划','Schedule Name':'计划名称','Days included':'包含日期','Metric 1':'指标 1','Metric 2':'指标 2','Time blocks':'时间区间','Campaign state':'广告活动状态','Draft':'草稿','Save Draft':'保存草稿','Learn':'学习',
  'Apply Rules':'执行规则','Bid':'竞价','Keyword Harvest':'关键词收割','Negative Targeting':'否定投放','Budget':'预算','Create Rule':'创建规则','New Rule':'新规则','New PPC Rule':'新 PPC 规则','Rule created':'规则已创建','Run Rules':'运行规则','Rule Name':'规则名称','Frequency':'执行频率','Lookback':'回看周期','Condition':'条件','Action':'操作','Scope':'作用范围','Performance threshold':'绩效阈值','Campaign scoped':'广告活动级','Campaign / product scoped':'广告活动 / 产品级','Create recommendation':'生成建议','Review first':'先审核','Semi-auto':'半自动','System':'系统','Apply':'应用','Block':'拦截','KEEP':'保留','REVIEW':'复核','PRESERVE':'保护','NEGATIVE?':'建议否定？',
  'Zero Order Waste':'零订单浪费','Profitable Winners':'盈利优质词','Orders ≥ 2 AND ACoS ≤ 40%':'订单 ≥ 2 且 ACoS ≤ 40%','Wasted spend':'浪费花费','Candidate Spend':'候选花费','Safe pending actions approved':'安全待处理操作已批准','Pending actions':'待处理操作',
  // Action center / negatives / conflicts
  'Add Exact Keyword':'添加精准关键词','Negative Exact':'精准否定','Negative Candidate':'否定候选','Negative Targeting Risk Check':'否定投放风险检查','Negative Targeting Impact Check':'否定投放影响检查','Negative approval blocked':'否定审批已拦截','Protected keyword':'受保护关键词','Protected keyword cannot be approved as negative':'受保护关键词不能批准为否定词','Protected keyword blocked from negative targeting':'受保护关键词已阻止否定投放','Keyword protected':'关键词已保护','Protection removed':'已取消保护','Safe scope':'安全作用范围','Queue safe terms only':'仅加入安全词','Queue Campaign-Scoped Negative':'加入广告活动级否定','Scoped negative queued':'已加入限定范围否定','Negative action queued':'否定操作已加入队列','Negative recommendation queued':'否定建议已加入队列','Safe negative candidates staged':'安全否定候选已加入待审核队列','Profitable on another product':'在其他产品上盈利','Global asset':'全局资产','Campaign review':'广告活动复核','Review campaign':'复核广告活动','Protection Blocks':'保护拦截','Negative conflicts':'否定冲突','Conflict':'冲突',
  // Keyword research
  'Find keywords by keyword':'按关键词查找','Analyze a keyword list':'分析关键词列表','Find Suggestions':'查找建议','Analyze Keywords':'分析关键词','All Keywords':'全部关键词','Top Keywords':'核心关键词','Opportunity Keywords':'机会关键词','Waste Spend':'浪费花费','High Converting':'高转化','Long Tail':'长尾词','Keyword Distribution':'关键词分布','Word Frequency':'词频','Word Count Min':'最少词数','Word Count Max':'最多词数','Phrases Containing':'包含短语','Exclude Keywords':'排除关键词','e.g. blue light':'例如 blue light','e.g. kids':'例如 kids','Search keyword library':'搜索关键词库','Search tracked keywords':'搜索已追踪关键词','Add to Keyword Library':'加入关键词库','Track':'追踪','Harvest Exact':'收割为精准词','Harvest action queued':'关键词收割操作已加入队列','Keyword added to tracker':'关键词已加入追踪','Select keywords in Cerebro and choose Track':'请在关键词研究中选择关键词并点击追踪','Cerebro research selection':'关键词研究选择项',
  // Finance tabs and metrics
  'Overview':'概览','Income & Expenses':'收入与支出','Fees':'费用明细','Settlements':'结算','Transactions':'交易流水','Gross Order Revenue':'订单总收入','Gross order revenue':'订单总收入','Refund Revenue Reversal':'退款收入冲减','Refund revenue reversal':'退款收入冲减','Promotional Rebates':'促销折扣','Promotional rebates':'促销折扣','Selling Fees':'销售佣金','Selling fees':'销售佣金','FBA Fees':'FBA 费用','FBA fees':'FBA 费用','Advertising Charges':'广告扣费','Advertising':'广告费','Storage Fees':'仓储费','Storage':'仓储费','Adjustments / Reimbursements':'调整 / 赔偿','Liquidation Gross Proceeds':'清算商品收入','Liquidation gross proceeds':'清算商品收入','Operating Net Proceeds':'经营净回款','Operating Net':'经营净回款','Bank Payouts':'银行结算打款','Ledger Movement':'账本净变动','Released':'已释放','Deferred':'延期入账','Transfer':'银行打款','Refund':'退款','Refunds':'退款','Adjustment':'调整','Liquidations':'清算','Service Fee':'服务费','FBA Inventory Fee':'FBA 库存费用','FBA Transaction fees':'FBA 交易费用',
  'Revenue':'收入','Expenses':'支出','Operating proceeds rate':'经营净回款率','Advertising burden':'广告费用负担','Refund concentration':'退款集中度','Advertising reconciliation':'广告对账','Income':'收入','Expense':'支出','Report total':'报表合计','Commerce Proceeds':'经营回款','Provisional Contribution':'阶段贡献','Ordered Units':'售出件数','Refund Units':'退款件数','Refund Rate':'退款率','Gross Product Sales':'商品销售总额','Refund Principal':'退款商品本金','Net Product Sales':'商品净销售额','Product Sales':'商品销售额','Product sales':'商品销售额','Order ID':'订单号','Settlement ID':'结算批次 ID','SKU':'SKU','No Settlement':'无结算批次','NO_SKU':'无 SKU',
  'FBA adjustments / reimbursements':'FBA 调整 / 赔偿','Refund miscellaneous recovery':'退款其他回收','FBA inventory / storage':'FBA 库存 / 仓储','Subscription':'订阅费','Liquidation fee':'清算费用','Order selling fees':'订单销售佣金','Refund selling-fee credits':'退款佣金返还','Order fulfillment fees':'订单履约费','Refund FBA fee credits':'退款 FBA 费用返还','Customer returns fees':'客户退货处理费','Removal / disposal fees':'移除 / 销毁费用','Monthly storage fee':'月度仓储费','Long-term storage fee':'长期仓储费','Amazon subscription charge':'亚马逊订阅费','Liquidation transaction fee':'清算交易费','Liquidation transaction fees':'清算交易费','Other Transaction Fees':'其他交易费用','Other transaction fees':'其他交易费用','Other Fees':'其他费用',
  'Product sales + shipping credits + gift wrap, before refunds and taxes':'商品销售额 + 运费抵扣 + 礼品包装费，未扣退款和税费','Inventory reimbursements and adjustments':'库存赔偿与调整','Liquidation product proceeds before liquidation fee':'扣除清算费用前的商品清算收入','Other amounts on refund transactions':'退款交易中的其他金额','Refunded product + shipping amounts':'退款商品金额 + 运费','Net promotional rebates after reversals':'冲销后的净促销折扣','Net selling fees after refund fee credits':'扣除退款佣金返还后的净销售佣金','Fulfillment + transaction fees net of credits':'扣除返还后的履约费和交易费','Cost of Advertising from Unified Transaction Report':'联合交易报告中的广告实际扣费','Storage and long-term storage charges':'仓储费和长期仓储费','Amazon subscription charge':'亚马逊订阅费用',
  'Unified Transaction Analytics':'联合交易分析','Unified Report Validation':'联合报告校验','Unified Transaction Report imported':'联合交易报告已导入','Import & Replace':'导入并替换','Unable to parse Unified Report':'无法解析联合报告','Advertising reconciliation':'广告对账','Ads Report Spend':'广告报表花费','Cost of Advertising':'联合报告广告扣费','Marketplace withheld tax':'平台代扣税','Product sales tax':'商品销售税','Shipping tax':'运费税','Gift wrap':'礼品包装','Shipping credits':'运费抵扣','Promotions':'促销','Tax Pass-through':'税费代收代缴',
  // Import / settings / dialogs
  'Select File':'选择文件','Validate Schema':'校验字段','Ready to Import':'可以导入','Needs Mapping':'需要字段映射','Imported report':'已导入报表','Amazon Ads report':'亚马逊广告报表','Amazon Ads report imported successfully':'亚马逊广告报表导入成功','Choose File':'选择文件','Cancel':'取消','Close':'关闭','Import':'导入','Save Settings':'保存设置','Settings saved':'设置已保存','Decision Thresholds':'决策阈值','Used by rules and recommendations':'用于规则和系统建议','Break-even ACoS (%)':'盈亏平衡 ACoS (%)','Harvest Orders ≥':'收割订单数 ≥','Harvest Max ACoS (%)':'收割最大 ACoS (%)','Negative Clicks ≥':'否定点击数 ≥','Negative Spend ≥ ($)':'否定花费 ≥ ($)','Protected Keywords':'受保护关键词','Never auto-negative':'永不自动否定','Add protected keyword':'添加受保护关键词','＋ Add':'＋ 添加','Profile Management':'账户管理','Analytics + Decisions':'分析 + 决策','Connected locally':'本地已连接','Protection applies before negative recommendations. Conflict Guard adds a second cross-product safety check.':'系统生成否定建议前会先检查关键词保护；冲突保护会再进行一次跨产品安全检查。',
  // Details / drawer
  'Performance':'表现','Placements':'投放位置','History':'历史','Product Performance':'产品表现','Top Campaign Contexts':'主要广告活动上下文','Entity Details':'对象详情','Keyword Change':'关键词变更','Data Import':'数据导入','Protection Block':'保护拦截','Detail':'详情','Show More':'查看更多','High':'高','Medium':'中','Low':'低',
  // Misc
  'All':'全部','BETA':'BETA','NEW':'新增','Search order ID, SKU, description':'搜索订单号、SKU、描述','Search Term Performance':'搜索词表现','Search term detail':'搜索词详情','Search keyword':'搜索关键词','Search':'搜索','Export Summary':'导出汇总','Import Unified Report':'导入联合报告','All transaction types':'全部交易类型','All statuses':'全部状态','All products':'全部产品',
  'Cloudflare Production':'Cloudflare 生产环境','Runtime status unavailable':'运行状态不可用','Imported-data analytics · Amazon Ads API is disabled · No live Amazon mutation is possible':'使用导入数据分析 · Amazon Ads API 未启用 · 不会直接修改 Amazon','ANALYTICS / LOCAL DECISIONS':'分析 / 本地决策','Consolidated intelligence across stores. Global mode is analytics-only and cannot write to Amazon.':'汇总多个店铺的数据洞察。全局模式仅用于分析，不能修改 Amazon。','Data Workspaces':'数据工作区','1 dataset loaded · 2 empty local workspaces':'已加载 1 个数据集 · 2 个本地工作区无数据','1 imported dataset · 2 preview workspaces':'1 个已导入数据集 · 2 个预览工作区','Target 40%':'目标 40%','Unified Report · Store 01 data':'联合报告 · 店铺 01 数据','Pending Actions':'待审核操作','Store approval required':'需要店铺审核','Imported dataset':'已导入数据集','Amazon API disabled':'Amazon API 未启用','DATA LOADED':'已加载数据','UI PREVIEW':'界面预览','Local workspace · no data':'本地工作区 · 无数据','Amazon authorization deferred':'Amazon 授权尚未启用','No dataset':'无数据集','Global pages cannot call Amazon write actions.':'全局页面不能调用 Amazon 写操作。','Any future Amazon authorization is isolated per Store workspace.':'未来的 Amazon 授权将按店铺工作区隔离。','Action Center approval is store-scoped.':'操作中心审批限定在当前店铺。','Cross-store intelligence produces recommendations only.':'跨店智能仅生成建议。','Data Source Health':'数据源健康度','Imported-data and preview workspace status':'导入数据和预览工作区状态','Connections →':'连接状态 →','Imported Store 01 dataset':'店铺 01 已导入数据集','Data loaded':'数据已加载','No data · local workspace':'无数据 · 本地工作区','No data':'无数据','Recommendations are generated from your configured thresholds. Review before applying.':'建议根据已配置的阈值生成，应用前请先审核。','Default Target ACoS':'默认目标 ACoS','Active':'已启用','Hidden':'已隐藏','Restore Hidden':'恢复隐藏项','Edit Settings':'编辑设置','Search suggestions':'搜索建议','Target / Campaign':'投放目标 / 广告活动','Create Structured Rule':'创建结构化规则','Rule Type':'规则类型','Minimum Orders':'最少订单数','Maximum ACoS (%)':'最大 ACoS (%)','Minimum Clicks':'最少点击数','Minimum Spend ($)':'最少花费 ($)','7 days':'7 天','14 days':'14 天','30 days':'30 天','60 days':'60 天','Manual run':'手动运行','Daily review':'每日审核','Weekly review':'每周审核','Min Bid · unavailable':'最低竞价 · 无数据','Max Bid · unavailable':'最高竞价 · 无数据','Keyword Harvest uses Minimum Orders + Maximum ACoS. Negative Targeting uses Orders = 0 + Minimum Clicks + Minimum Spend. Bid and Budget can be authored but remain Draft until a structured adjustment model is implemented.':'关键词收割使用最少订单数和最大 ACoS；否定投放使用零订单、最少点击数和最少花费。竞价与预算规则在结构化调整模型实现前仅保存为草稿。','Delete this local schedule draft?':'确定删除这个本地分时计划草稿吗？',
  // V8 multi-store architecture
  'GLOBAL':'全局','STORES':'店铺','KEYWORDS':'关键词','Portfolio Overview':'经营组合总览','Cross-store Intelligence':'跨店智能分析','Global Keyword Library':'全局关键词库','Global Conflict Center':'全局冲突中心','Store Workspace':'店铺工作区','Store Conflict Guard':'店铺冲突保护','Import Center':'导入中心','Sync Center':'同步中心','Data Health':'数据健康','Stores':'店铺管理','Amazon Connections':'Amazon 授权连接','Users & Permissions':'用户与权限',
  'Data scope':'数据范围','All Stores · Global Intelligence':'全部店铺 · 全局智能','GLOBAL · READ ONLY':'全局 · 只读','ISOLATED STORE':'独立店铺','Global Intelligence Mode':'全局智能模式','Cross-store analytics only · Amazon write actions disabled':'仅允许跨店分析 · 禁止直接修改 Amazon','Connected Stores':'已连接店铺','Connected data only':'仅统计已连接数据','Store Performance':'店铺表现','Amazon credentials remain separated per workspace':'每个工作区的 Amazon 凭证保持独立','Manage Stores':'管理店铺','Execution Safety':'执行安全','Hard boundaries before Amazon writes':'Amazon 写操作前强制边界校验','Store Context':'店铺上下文','Connection':'授权连接','Advertiser':'广告主','Cross-store Opportunities':'跨店机会','Preview of shared intelligence layer':'共享智能层预览','Connection Health':'连接健康','Independent authorization status':'独立授权状态','Healthy':'健康','Not connected':'未连接','Ready':'待连接','Open Store':'打开店铺','Shared Intelligence':'共享智能','Knowledge may cross stores; actions may not':'知识可以跨店共享；操作不能跨店执行','Decision Policy':'决策策略','Global Keyword Library is an intelligence layer. To change bids or negatives, open a specific Store workspace.':'全局关键词库仅用于智能分析。若要修改竞价或否定词，请进入具体店铺工作区。','Search global keyword library':'搜索全局关键词库','Global Status':'全局状态','Store Coverage':'店铺覆盖','Decision':'决策','Open Store 01':'打开店铺 01','Global asset':'全局资产','EXECUTION BOUNDARY':'执行边界','Select one Store before using':'使用前请选择一个店铺','Global Intelligence is read-only. Amazon write operations require an explicit Store → Connection → Advertiser → Marketplace context.':'全局智能模式为只读。Amazon 写操作必须明确指定 店铺 → 授权连接 → 广告主 → 站点。','AMAZON CONNECTION':'AMAZON 授权连接','is not connected yet':'尚未连接','This V8 frontend keeps the workspace isolated. Connect this store independently before advertising data or actions can be loaded.':'V8 前端保持工作区隔离。该店铺必须独立授权后才能加载广告数据或执行操作。','Open Amazon Connections':'打开 Amazon 授权连接','Open connected Store':'打开已连接店铺','Ready for independent authorization':'等待独立授权','reserved · no Amazon token stored':'已预留 · 未保存 Amazon Token','Independent Sync Jobs':'独立同步任务','Failure in one Amazon connection does not stop other stores':'一个 Amazon 授权连接失败不会影响其他店铺','Ads Structure':'广告结构','Performance Report':'绩效报表','Waiting for OAuth':'等待 OAuth 授权','Schema Health':'字段结构健康','Current local data sources':'当前本地数据源','Decision Readiness':'决策就绪度','Advertising analytics':'广告分析','Finance analytics':'财务分析','Cross-store comparison':'跨店比较','Amazon write actions':'Amazon 写操作','Ready':'已就绪','Preview':'预览','API required':'需要 API','Store Workspaces':'店铺工作区','Create KeywordOS workspaces first. Amazon authorization is attached separately to each workspace.':'先创建 KeywordOS 店铺工作区，再为每个工作区分别绑定 Amazon 授权。','＋ Add Store':'＋ 添加店铺','Store ID':'店铺 ID','Amazon Connection':'Amazon 授权连接','Isolation':'隔离级别','Manage Connection':'管理授权','One Store = One Independent Amazon Authorization':'一个店铺 = 一个独立 Amazon 授权','KeywordOS consolidates analytics after ingestion. OAuth refresh tokens and advertiser bindings are never shared across Store workspaces.':'KeywordOS 只在数据进入后做集中分析；OAuth Refresh Token 与广告主绑定绝不跨店共享。','ISOLATED AUTH':'独立授权','Authorization':'授权方式','Isolation level':'隔离级别','Last sync':'最后同步','Refresh token':'Refresh Token','Server-side only':'仅服务器端保存','Not stored':'未保存','Reconnect':'重新授权','Pause Sync':'暂停同步','Details':'详情','Connect Amazon':'连接 Amazon','Connection Guide':'连接指南','Role-based Store Access':'基于店铺的角色权限','KeywordOS permissions are independent from Amazon Ads permissions.':'KeywordOS 权限与 Amazon Ads 权限相互独立。','＋ Invite User':'＋ 邀请用户','User':'用户','Role':'角色','Allowed Stores':'允许访问店铺','Permission':'权限','Full access':'完整权限','Finance read only':'财务只读','Read only':'只读','Create Store Workspace':'创建店铺工作区','KeywordOS Store Name':'KeywordOS 店铺名称','Creating a workspace does not connect or link an Amazon account. OAuth is a separate step.':'创建工作区不会连接或关联 Amazon 账户；OAuth 是独立步骤。','Create Workspace':'创建工作区','INDEPENDENT OAUTH':'独立 OAuth','Select Advertiser':'选择广告主','Bind Profile':'绑定 Profile','Frontend preview only. No Amazon credential is requested or stored in this build.':'当前仅为前端预览版，不会请求或保存任何 Amazon 凭证。','Continue with Amazon':'继续使用 Amazon 授权','Operating Net':'经营净回款'
};

function preserveWhitespace(text, replacement){
  const m=text.match(/^(\s*)([\s\S]*?)(\s*)$/); return (m?.[1]||'')+replacement+(m?.[3]||'');
}
function translatePattern(en){
  let m;
  if((m=en.match(/^(\d[\d,]*) clicks · (\d[\d,]*) orders$/))) return `${m[1]} 次点击 · ${m[2]} 个订单`;
  if((m=en.match(/^(\d[\d,]*) orders? · ACoS (.+)$/))) return `${m[1]} 个订单 · ACoS ${m[2]}`;
  if((m=en.match(/^(\d[\d,]*) rows?$/))) return `${m[1]} 行`;
  if((m=en.match(/^(\d[\d,]*) selected$/))) return `已选择 ${m[1]} 项`;
  if((m=en.match(/^(\d+)[–-](\d+) of ([\d,]+)$/))) return `第 ${m[1]}–${m[2]} 条 / 共 ${m[3]} 条`;
  if((m=en.match(/^Loaded ([\d,]+) Amazon Ads rows$/))) return `已载入 ${m[1]} 行亚马逊广告数据`;
  if((m=en.match(/^Loaded ([\d,]+) unified transaction rows$/))) return `已载入 ${m[1]} 行联合交易数据`;
  if((m=en.match(/^Last (\d+) days$/))) return `最近 ${m[1]} 天`;
  if(en.startsWith('Operating net proceeds are ')) return en.replace('Operating net proceeds are ','经营净回款为 ').replace(' of gross order revenue. This is before product COGS and therefore is not net profit.','，占订单总收入的比例。该数值尚未扣除商品成本，因此不等于净利润。');
  if(en.startsWith('Unified-report advertising charges are ')) return en.replace('Unified-report advertising charges are ','联合报告中的广告扣费为 ').replace(' of gross order revenue','，占订单总收入');
  if(en.includes(' has the highest unit refund rate at ')) return en.replace(' has the highest unit refund rate at ',' 的件数退款率最高，为 ').replace(' refunded vs ',' 件退款 / ').replace(' ordered units',' 件售出');
  if(en.startsWith('Ads report spend is ')) return en.replace('Ads report spend is ','广告报表花费为 ').replace(' vs Unified Report Cost of Advertising ','，联合报告广告实际扣费为 ').replace('; difference ','；差额 ').replace('Review posting/date timing before treating the difference as an error.','。在判断为数据错误前，应先核对入账时间和日期口径。');
  return null;
}
function zhFor(en){const checked=en.startsWith('✓ ')?ZH[en.slice(2)]:null;return ZH[en]||(checked?`✓ ${checked}`:null)||translatePattern(en)||null;}
function translate(en){
  if(mode==='en') return en;
  const zh=zhFor(en); if(!zh) return en;
  return mode==='bi' ? `${zh} / ${en}` : zh;
}
function shouldSkip(node){
  const p=node.parentElement; if(!p) return true;
  return !!p.closest('script,style,[data-no-i18n]');
}
function apply(root=document){
  document.documentElement.lang=mode==='en'?'en':'zh-CN';
  document.body?.setAttribute('data-language',mode);
  const walker=document.createTreeWalker(root===document?document.body:root,NodeFilter.SHOW_TEXT);
  let n; while(n=walker.nextNode()){
    if(shouldSkip(n)) continue;
    if(!originalText.has(n)) originalText.set(n,n.nodeValue);
    const base=originalText.get(n), core=base.trim(); if(!core) continue;
    const out=translate(core); n.nodeValue=preserveWhitespace(base,out);
  }
  const baseRoot=root===document?document:root;
  baseRoot.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el=>{
    if(el.closest('[data-no-i18n]')) return;
    let bag=originalAttrs.get(el); if(!bag){bag={}; originalAttrs.set(el,bag)}
    for(const a of ['placeholder','title','aria-label']) if(el.hasAttribute(a)){
      if(!(a in bag)) bag[a]=el.getAttribute(a);
      const original=bag[a], out=translate(original); el.setAttribute(a,out);
    }
  });
  document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===mode));
  const title='KeywordOS · Amazon Advertising Intelligence';
  document.title=mode==='en'?title:mode==='bi'?'KeywordOS · 亚马逊广告智能 / Amazon Advertising Intelligence':'KeywordOS · 亚马逊广告智能';
}
function setLanguage(next){ if(!['zh','en','bi'].includes(next))return; mode=next; localStorage.setItem(KEY,mode); apply(document); }
function init(){
  document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
  apply(document);
}
window.KeywordOSI18N={apply,setLanguage,getLanguage:()=>mode,zhFor};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
