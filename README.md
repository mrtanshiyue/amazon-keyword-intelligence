# KeywordOS — Amazon Keyword Intelligence

KeywordOS 是一个面向 Amazon 卖家的 **CSV-first、本地证据优先、多 Store 经营工作台**。它把广告、交易、SQP/ABA、关键词、排名、Listing、库存、成本、竞品和评论文件整理成可追溯的分析、准备与复盘流程。

当前阶段不连接 Amazon Ads API、SP-API 或 OAuth，不向 Amazon 写入广告、预算、Listing 或库存动作，也不把导入快照包装成实时数据。

> 审计基线：2026-09-02，main@f719c3d7d155，版本 9.2.6。本地 npm run check 为 **255 passed / 0 failed**（41 个测试文件）。本次没有运行会重建 dist 的 npm run build；现有 dist 落后于源码，因此该提交只能作为源码基线，不能直接视为已验证的发布产物。

## 状态约定

| 标记 | 含义 |
|---|---|
| ✅ | 仓库中已实现，且本次静态审计或现有测试可以确认 |
| 🟡 | 有实现，但存在数据、交互、完整性或命名缺口 |
| ⬜ | 建议新增，尚未实现 |
| ⛔ | 本阶段明确不做 |

只有同时具备真实代码、正确数据边界、测试和可用 UI 的能力才能标为 ✅。演示数据、静态入口、未接线按钮和只存在于文档中的设计均不算完成。

## 项目定位

KeywordOS 的差异化不是复制 Helium 10 或卖家精灵的外部数据库，而是把卖家已经拥有的 Amazon 导出、财务文件、库存文件和获准使用的第三方研究导出，变成一条可审计的经营链：

    文件导入
      → 校验、列映射、来源与日期
      → Store 隔离的 Dataset Registry
      → 产品 / 关键词 / Listing / 广告 / 库存分析
      → 本地建议与人工批准
      → 后续文件快照复盘结果

产品必须始终遵守四条规则：

1. 没有来源的数据不展示，没有输入的指标不估成 0。
2. 原始导入、透明计算、估算和缺失必须在 UI 中明确区分。
3. Staged、Approved 只表示 KeywordOS 本地状态，不表示 Amazon 已执行。
4. 搜索量、排名、竞价、销量、竞品和归因结论必须保留 Store、市场、来源文件、快照日期及计算口径。

## 当前架构

    CSV / bundled seed
            │
            ▼
    浏览器解析、校验与导入
            │
            ▼
    Dataset Registry / IndexedDB
    + 少量 localStorage 状态
            │
            ▼
    Products / Keywords / Listing / Marketing
    Operations / Analytics / Local Agent

    GitHub main → build → dist → Cloudflare Workers Static Assets
                                      │
                                      └─ GET/HEAD Worker API
                                         ├─ manifest / seed
                                         ├─ private session canary
                                         └─ D1/R2 基础代码（未接产品写入）

- 前端：原生 HTML、CSS、JavaScript，无前端框架、bundler 或正式 router。
- 部署：Cloudflare Workers Static Assets + Worker API。
- 浏览器数据：IndexedDB Dataset Registry；部分草稿、组织器和兼容状态仍使用 localStorage。
- 服务端：D1/R2 数据版本与持久化基础已存在，但没有接到产品导入/写入路由。
- Worker 当前只接受 GET / HEAD；其他方法返回 405。
- 已有路由：/api/health、/api/data/manifest、/api/data/seed.js、/api/data/unified-seed.js、/api/private/session。
- Cloudflare Access 已配置；登录验收由项目所有者冻结，不能写成已完成的生产登录流程。

关键代码入口：

| 文件 | 职责 | 当前判断 |
|---|---|---|
| [index.html](./index.html) | 应用壳、脚本加载顺序 | ✅ 单页静态壳 |
| [app.js](./app.js) | 核心状态、导航、主要页面与渲染 | 🟡 体积大，且与后置补丁共同拥有 UI |
| [growth-workspaces.js](./growth-workspaces.js) | SQP、产品、竞品、评论、排名、Listing、库存工作区 | 🟡 功能多，解析和持久化一致性需补强 |
| [dataset-registry.js](./dataset-registry.js) | Store 级数据集、元数据与 IndexedDB | ✅ 数据中枢已存在 |
| [data-provenance-guard.js](./data-provenance-guard.js) | Store 01 Ads 来源判定与 seed 审批 fail-closed | 🟡 Ads 子路径已覆盖，其他来源/派生指标仍待统一 |
| [navigation-taxonomy.js](./navigation-taxonomy.js) | Growth 页面套件分组 | 🟡 与其他页面清单重复维护 |
| [productivity-actions.js](./productivity-actions.js) | 套件首页、搜索、侧栏折叠与历史 | 🟡 套件归属集合不完整 |
| [workflow-canonicalization.js](./workflow-canonicalization.js) | Tracker / Listing 旧路由兼容 | 🟡 路由已兼容，可见入口仍有重复 |
| [i18n.js](./i18n.js)、[product-language.js](./product-language.js) | 中英双语与产品词汇替换 | 🟡 多个 DOM 补丁造成遗漏和语义误译 |
| [src/worker.js](./src/worker.js) | Worker 只读 API 和静态资源入口 | ✅ 当前边界明确 |
| [src/dataset-persistence.js](./src/dataset-persistence.js) | D1/R2 不可变数据版本基础 | 🟡 已准备但未接产品路由 |

当前页面注册和文案分散在多个模块，并依赖多个 MutationObserver 在渲染后修补 DOM。这让功能能快速叠加，但也造成套件高亮、旧入口、翻译和事件接线漂移。后续只需要建立一个中央 page registry，不需要更换框架或重写应用。

## 当前已完成与真实状态

### 数据与 Store 基础

- ✅ 多 Store 外壳、全局只读分析边界、Store 级浏览器数据模型。
- 🟡 实际业务路径、Growth helpers 和本地 Agent 仍大量固定在 Store 01；Store 02/03 与自建 Store 尚无完整导入工作流，因此不能称完整多 Store 产品。
- ✅ Amazon Ads Search Term 和 Unified Transaction CSV 导入、主解析器校验与来源记录。
- ✅ Dataset Registry 支持 ads、finance、sqp、costs、inventory、ranks、competitor、competitor-ads、competitor-creative、reviews、reverse-asin、listing、product-master、keyword-assets、action-outcomes。
- ✅ 数据元信息包括来源、导入时间、覆盖期、行数、schema、checksum 和校验状态。
- ✅ Data Health、16 MiB 浏览器导入限制、畸形未闭合 CSV 拒绝、旧浏览器数据迁移。
- 🟡 Local Data Operations 可以备份/恢复主要数据，但当前白名单遗漏 competitor-creative，也未覆盖 Listing evidence/version 和 competitor group 等部分 localStorage 状态，不能宣称完整无损备份。
- 🟡 仓库内 Store 01 bundled seed 含 Ads 8,753 行、Unified 3,643 行；它是 public-test 种子数据。Store 01 Ads 现已由 provenance guard 区分 USER IMPORT / BUNDLED SEED / NO DATA，并在没有有效用户 Ads 导入时禁止 Action Center 批准、批量批准和导出批准动作；Finance、Growth 及 calculated / third-party estimate / missing 的全局状态仍未统一。

### Products / Competitors / Reviews

- ✅ Product Master、ASIN / Parent ASIN / SKU / FNSKU / family / marketplace 映射和 unmapped queue。
- ✅ Product 360 只对明确映射的数据做广告、财务、成本和库存关联。
- ✅ 竞品快照导入、价格/BSR/评分/评论/变体/可售状态历史与保守变更提示。
- ✅ Storefront 快照和 7/15/30/60 日观察；只有明确 First Seen Date 才计为新品。
- ✅ 竞品广告观察 CSV 和手工图片/卖点证据；不从观察结果推断真实 campaign/ad group 结构。
- ✅ 评论导入、原文保留、显式 VOC 标签、1–2 星与 4–5 星字面词频、市场/语言元数据规范化。
- ✅ 通用 reverse-ASIN CSV、2–20 ASIN 集合对比、共有/自有/竞品独有/缺口集合、导入 traffic share 分布。
- ✅ 基于已导入快照的市场价格带、评论门槛、集中度和透明相对机会分数。

### Keywords

- 🟡 Keyword Research 已有 Find Suggestions / Analyze Keywords、筛选预设、词频、分布、表格、导出、历史和批量加入词库/追踪/否定词；但目前只筛选 Ads Search Term，Analyze Keywords 仍把输入当一个短语，并不是真正的最多 200 词批量分析。
- 🟡 页面仍有 Cerebro 提示或历史文案；中文模式中仍混有英文页面名，个别 Advertising 被错误翻成“广告费”。不能继续宣称用户可见文案已完全统一。
- 🟡 Common Words 目前主要是滚动到词频，不是完整的词根排除管理；删除词恢复、统一列偏好和可靠的保存筛选仍不完整。
- ✅ Store 级 keyword assets、稳定 ID、标签、intent、保护状态和 Ads/SQP/rank/Listing/action evidence 汇总。
- ✅ Keyword Library、Negative Library、Conflict Guard、Protected Keywords、Keyword Workflow。
- 🟡 Rank & Index 支持用户导入的自然位、广告位和收录快照；没有自动日更、实时收录查询、Boost 或 Amazon 前台抓取，因此应称“快照追踪”。
- 🟡 旧 Keyword Tracker 可见入口与 Rank & Index canonical route 仍可能同时出现，信息架构尚未真正去重。

### Listing

- ✅ 持久化 Listing Optimizer，支持 Title、Bullets、Description、Backend Search Terms。
- ✅ 词组/词根覆盖、字段覆盖、重复与 stuffing 提示、品牌词排除、backend UTF-8 byte 检查、关键词缺口与 placement 建议。
- ✅ 本地版本、字段 diff、evidence checklist 和导入竞品标题对比；不发布到 Amazon。
- 🟡 页面实际版本名仍为 Listing Optimizer 2.0，旧 README 的 “3.0 已完成”不准确。
- 🟡 Search Terms 限制可以编辑，但部分 KPI/建议仍写死为 250 bytes，必须统一读取同一设置源。

### Marketing / Advertising

- ✅ Advertising Dashboard、campaign → ad group → target → search term 下钻。
- ✅ 基于已加载数据的 Suggestions、受支持的本地 Rules、Protected Negative 检查。
- 🟡 名为 AI Bids 的建议实际是固定阈值和 bid 倍率规则，应改名为“规则化调价建议”。
- ✅ Action Center、Change Log、本地 staged/approved 状态和后续导入窗口的 Action Outcome 对比。
- ✅ Spend、Sales、Orders、ACoS、ROAS、CPC、CVR 与小样本、窗口不完整、并发动作、Amazon 外部混杂因素提示。
- 🟡 Dayparting 只能保存本地计划，没有小时表现数据或执行能力。
- ⛔ 没有自动竞价、预算、分时或 campaign mutation；本地批准不代表 Amazon 执行。

### Operations / Analytics / Local Agent

- ✅ Unified Transaction 收入、费用、退款、settlement 分析。
- ✅ 导入成本、库存、可售/入库/残损状态、days of cover、补货日期和采购计划 CSV。
- 🟡 库存速度同时存在“总 Ads units ÷ 30”和按实际 observed days 两套口径，必须统一为有日期覆盖的算法。
- ✅ 本地单单利润情景、贡献毛利、break-even ACoS、退款成本暴露；缺少明确成本或映射时保持 unavailable。
- ✅ SQP/ABA Search Query Funnel、趋势、Evidence drill-down、Anomaly Center、套件首页和移动表格处理。
- 🟡 CSV 页面的 exact filter 主要隐藏现有表格行，主 KPI/汇总不一定同步重算。
- ✅ 只读、确定性的 KeywordOS Agent 和 Advertising / Keyword / Listing / Profitability / Inventory / Help 模式。
- ✅ “为什么指标变化”使用等长已加载窗口、算式、分组差值和原始行号；只说明算术贡献，不声称因果。
- ⛔ 当前 Agent 不调用外部大模型或 Amazon API，不生成 Listing 文案，也不创建远程动作。

### Settings / Platform

- 🟡 Access JWT、Store membership 查询和 D1/R2 持久化代码已经存在，但 membership 未初始化，产品写入路由未接线。
- 🟡 Amazon Connections、Users & Permissions、Sync Center 中没有可用的 Amazon 连接流程；相关 UI 必须继续明确显示 disabled / unavailable。
- ✅ 服务端数据校验、R2 create-only、SHA-256 校验和 D1 current pointer 基础已经实现；这表示代码基础存在，不表示用户数据已保存到云端。

## 本次审计确认的优先问题

这些问题应先于继续堆叠新页面处理。

| 优先级 | 问题 | 影响 | 完成标准 |
|---|---|---|---|
| P0 | 种子数据与真实导入标识混淆 | 用户可能基于演示数据批准动作 | seed / import / calculated / estimated / missing 全局一致；seed 默认不可批准 |
| P0 | Growth parser 把非数值静默转为 0、缺身份行静默跳过，部分数据直接 append | 假零值、漏行和重复快照污染决策 | 严格字段校验、拒绝行统计与下载、稳定 merge key、重复策略测试 |
| P0 | 本地备份白名单不完整 | 恢复后丢竞品创意、Listing 版本/清单或竞品组 | 所有用户状态纳入 manifest；往返恢复 checksum/数量一致 |
| P0 | dist 与源码漂移 | 发布物可能缺少竞品、Agent、evidence 和 suite 模块 | source/dist 资产清单一致，CI 对源入口和产物做闭包校验 |
| P0 | Data Health recency DOM 接线与实际标签/节点不一致 | 页面显示 date unavailable | 使用数据模型而非抓取文案；DOM 集成测试覆盖 Ads/Finance 日期 |
| P0 | Keyword Research 的批量标签、保存筛选和 Common Words 语义不完整 | UI 承诺大于功能 | 完成真实工作流，或在完成前准确改名/隐藏 |
| P1 | 页面清单分散，套件 page set 漏项 | 顶部套件高亮、侧栏和 command palette 不一致 | 单一 page registry 驱动 route、suite、标题、侧栏、搜索和 i18n key |
| P1 | 旧/新入口并存及中英混杂 | 找同一功能要猜路由，语言切换不可信 | 只显示 canonical route；全页面、空态、modal 和 aria 文案审计通过 |
| P1 | Listing byte limit 与库存速度存在双口径 | 用户设置与 KPI/建议矛盾 | 每项指标只有一个明确、可追溯的计算源 |
| P1 | 多 ASIN 只有通用导入层 | H10/卖家精灵导出需要人工清洗 | provider CSV profile、列映射预览和未知列保留 |

## 竞品基准：截至 2026-09-02

这里只借鉴工作流和交互，不复制品牌、页面造型、专有数据或黑箱评分。第三方在线能力若没有用户导出文件，在 KeywordOS 中必须显示“请导入数据”，不能展示模拟结果。

### Helium 10

Helium 10 于 2026-01-06 开始把 Magnet 合并进 Cerebro。当前方向是一个工具同时处理“单个种子词发现”和“最多 200 个词批量分析”，而不是两个孤立页面。

| 官方当前能力 / UI | KeywordOS 应吸收 | 当前差距 |
|---|---|---|
| Cerebro 两标签：Find Suggestions 与 Analyze Keywords；后者最多 200 词，可从 My List 进入 | 保留两模式，但共用来源、筛选、摘要和结果表 | 🟡 现有批量模式仍是单短语筛选 |
| 可折叠筛选；搜索量、词数、竞争产品、Title Density、自然/广告/推荐排名、include/exclude 等列 | 仅展示导入中实际存在的列；缺失为 — | 🟡 当前主要只有 Ads 指标 |
| Keyword Distribution、Word Frequency、可拖动/显隐列、删除/恢复、历史、复制和导出 | 做成真实可操作的词根筛选、列视图和回收站 | 🟡 部分 UI 已有，闭环不完整 |
| 多 ASIN Relative Rank、竞品平均排名/数量和 advanced rank filters | 用用户导入快照做 own/shared/gap 矩阵与透明筛选 | 🟡 已有集合比较，provider schema 和交互不足 |
| Tracker 以 ASIN 为主层，展开 Keywords / Competitors / Suggested Keywords；支持备注、标签、热力图 | 将真实 rank CSV 按 ASIN → Keywords 组织；重复导入后才显示趋势/heat map | 🟡 当前更像扁平关键词表 |
| Listing Builder：Find Keywords → Keyword Bank → 编辑器；研究阶段最多 9 个竞品 ASIN，词根/短语竞品矩阵最多 20 个 | 复用已有 keyword assets 和 Listing Optimizer，建立最短传递链 | 🟡 两边已有数据但交互仍分散 |
| 2026 Tracker 广告出价规则 | 只借鉴“条件 → 建议 → 人工复核”的本地模式 | ⛔ 不接广告账户，不自动调价 |

不能仿制 Helium 10 的 IQ、CPR、Competitor Performance、KPS/CPS。官方没有公开足以复现的完整公式；KeywordOS 只能输出名称不同、公式完全展开的本地优先级。

官方参考：

- [Magnet merged into Cerebro，2026-01-06](https://kb.helium10.com/hc/en-us/articles/44262552100891-Magnet-Has-Been-Merged-Into-Cerebro-Everything-You-Need-to-Know)
- [Cerebro 两种关键词模式，2026-01-06](https://kb.helium10.com/hc/en-us/articles/44519579661211-How-to-Analyze-Keywords-Using-Cerebro-Plus-Magnet)
- [Cerebro ASIN、筛选与指标，2026-01-23](https://kb.helium10.com/hc/en-us/articles/360046326894-How-Do-I-Use-Cerebro)
- [Keyword Tracker 当前产品层 UI](https://kb.helium10.com/hc/en-us/articles/27744441024923-Keyword-Tracker-Introduction-and-Overview)
- [Keyword Tracker Heat Map](https://kb.helium10.com/hc/en-us/articles/35791324563227-Keyword-Tracker-Video-How-to-View-Keyword-Ranks-on-a-Heat-Map)
- [Listing Builder 新流程，2026-05-13](https://kb.helium10.com/hc/en-us/articles/4407213995419-Listing-Builder-Keyword-Research-Revamped-AI-Listing-Generation)
- [Listing 词根与竞品分析，2026-06-11](https://kb.helium10.com/hc/en-us/articles/36185539284379-Keyword-Root-Analysis-in-Listing-Builder)

### 卖家精灵

卖家精灵当前关键词产品链是“Mining → Reverse ASIN → Reverse Multiple ASINs / Traffic Comparison → Conversion Rate → My Keyword List → Product & Keyword Tracker”。最值得借鉴的是同一词集可以持续筛选、比较、词频、入库、导出和追加历史，而不是每页重新开始。

| 官方当前能力 / UI | KeywordOS 应吸收 | 数据边界 |
|---|---|---|
| Keyword Mining 2.0：Keyword Magnet / Bulk Mining，批量最多 200；区间、include/exclude、匹配模式、历史筛选 | 本地语料的 exact/phrase/broad、1/2/3+ gram 和透明 ASIN overlap | 在线扩词与官方 Relevancy 不能本地伪造 |
| Reverse ASIN：站点、30 日/月、变体、自然/广告分布、词频、Top 10、历史、列配置、删除词 | 导入 ASIN + keyword + snapshot_date + metrics 后复现筛选、分布和历史 | 在线反查、变体识别和 Top 10 商品依赖外部数据 |
| Reverse Multiple ASINs 最多 20 个；去重、共有/独有/缺口、Top 10 校验 | 复用现有 2–20 ASIN 比较，补 primary ASIN 和 provider mapping | 一次导入只代表一次快照 |
| Traffic Comparison：主 ASIN + 最多 10 竞品；切换曝光份额、周搜索、自然位、SP 位、转化、分布 | 一张高密度矩阵按指标切换，关键词列 sticky，详情抽屉看历史 | 没有重复日期文件时不显示趋势 |
| My Keyword List：folder、label、tag、move/copy、compare、custom columns、20/50/100 分页 | 把现有 keyword assets 升级为所有关键词工作的中心 | 可完全浏览器本地实现 |
| Product & Keyword Tracker：按 ASIN 添加词、每天记录自然/广告位、标签、比较、导出 | 使用用户重复导入的 rank 快照做趋势、变化和断档 | 自动日更和当前排名不在本阶段 |
| Keyword Conversion Rate：searches/clicks/purchases、CVR、PPC、CPA、ACOS、预算 | 输入齐全时透明计算，展示公式和数据质量 | 市场原始值来自外部数据，不可凭空产生 |
| Realtime Bid Tracker：任务、时间点、比较、导出 | 只借鉴任务/快照交互 | ⛔ 官方能力依赖 Amazon Ads API，本阶段排除 |

卖家精灵的 DSR、SPR、Relevancy 等只能保留为导入列，不能冒充 KeywordOS 自算指标。若完整输入存在，可透明计算 Purchase Rate = purchases / searches、Search CVR = purchases / searches、Click CVR = purchases / clicks；分母为零或缺失时显示 —。

官方参考：

- [关键词功能帮助中心，2026-07-08](https://www.sellersprite.com/v3/knowledge/feature/home)
- [Keyword Mining 2.0，2026-08-19](https://www.sellersprite.com/jp/v3/knowledge/feature/keyword-mining-for-beginners)
- [Reverse ASIN 当前指南](https://www.sellersprite.com/v3/knowledge/feature/keyword-reverse-for-beginners)
- [Reverse Multiple ASINs](https://www.sellersprite.com/v3/knowledge/feature/traffic-extend-for-beginners)
- [Traffic Comparison](https://www.sellersprite.com/en/help/keyword-comparison-for-beginners)
- [My Keyword List](https://m.sellersprite.com/v3/knowledge/feature/keyword-store-for-beginners)
- [Product & Keyword Tracker，2026-06-24](https://agent.sellersprite.com/en/help/Product-Keyword-Tracker-Guide)
- [Keyword Conversion Rate](https://www.sellersprite.com/v3/knowledge/feature/keyword-conversion-rate-for-beginners)
- [Chrome Guide：v5.0.5 / 2.1.2，2026-07-31 发布](https://www.sellersprite.com/v3/knowledge/feature/chrome-guide)

> 卖家精灵不同语言和镜像页面仍显示旧的 v4.8.0 / v5.0.3。本 README 以带发布日期的 2026-08-06 Chrome Guide 所列 v5.0.5 / 2.1.2 为准，不把缓存页面的旧版本当作最新版本。

## 目标产品与 UI

### 信息架构

保留六个顶层套件，但任一时刻只展示当前套件的上下文侧栏；不要同时显示旧 domain group、重分组 suite 和重复 legacy entry。

| 顶层套件 | 建议保留的工作区 |
|---|---|
| Products | Product Master、Product 360、Competitors、Reviews、Market Screen |
| Keywords | Keyword Lab、ASIN Comparison、Keyword Library、Rank Snapshots、SQP Funnel、Negatives |
| Listing | Keyword Bank、Listing Editor、Coverage & Gaps、Versions & Evidence |
| Marketing | Ads Analytics、Suggestions、Local Rules、Action Center、Outcomes |
| Operations | Finance、Costs、Inventory、Replenishment、Refund Review、Data Health |
| Analytics | Portfolio、Cross-store、Trends、Anomalies、Read-only Agent |

Keyword Lab 应合并目前分散或语义重复的入口，但复用现有路由、数据集和组件：

    ┌ Marketplace ─ Dataset/Source ─ Snapshot date ─ Saved view ┐
    │ [关键词发现] [批量分析 ≤200] [ASIN 导入与对比]             │
    ├ Filters / include-exclude / exact-phrase-broad / Reset ───┤
    │ Summary: matched / missing / source coverage / word roots  │
    ├ sticky Keyword ┬ source-aware metric columns ┬ provenance ┤
    │ selected rows → List / Track / Negative / Listing / Export │
    └─────────────────────────────────────────────────────────────┘

UI 统一规则：

- 页面标题只显示 KeywordOS 自有名称；第三方名只出现在“导入格式/来源”中。
- 所有导入驱动页面统一 EMPTY → LOADING → ERROR/PARTIAL → READY 状态。
- 顶部固定 Marketplace、Source、Snapshot、Saved View；变化后立即刷新 source chips。
- 筛选统一 min/max、include/exclude、exact/phrase/broad、Reset、结果数和 Load Last Filters。
- 表格关键词/ASIN 主列 sticky；列排序、拖动、显隐、保存视图；选择后只出现一个浮动批量栏。
- Copy 行为：有选择时复制选择行，无选择时复制当前已加载页。
- 词频支持 1/2/3+ gram、停用词、点击词根过滤并高亮原表；删除词有回收站。
- 趋势采用行内 sparkline + 详情抽屉；没有两个以上有效日期时隐藏趋势，而不是绘制假线。
- 原始导入 / 透明计算 / 第三方估算 / bundled seed / 缺失使用一致徽标；表头 tooltip 展示公式、来源与日期。
- 中文、英文、双语使用相同 i18n key；不得再按可见英文文本做语义替换。
- 桌面优先高密度表格，同时保留现有移动端横向滚动、sticky identity column、键盘和 aria 支持。
- 空状态直接给出模板、字段要求和“导入数据”主动作，不展示假的商品图、排名或 KPI 占位。

## 产品路线图

路线图只覆盖不接 Amazon API 也能完成的价值。顺序先修数据真相，再统一关键词工作流，最后增加本地智能；不新建空壳页面，不引入前端框架，不增加当前没有必要的依赖。

### P0 — 可信发布基线

- [ ] 全局修正 bundled seed、用户导入、计算值、第三方估算和缺失的状态标识；seed 数据禁止进入可批准动作。
  - 2026-09-02 已完成子项：Store 01 Ads 仅在 Dataset Registry 中的浏览器持久化记录通过现有 Ads 校验器时标为 `USER IMPORT`；否则明确回退为 `BUNDLED SEED` / `NO DATA`，并 fail-closed 禁止 Action Center 单项批准、批量批准和批准动作导出。该总项仍未完成，因为 Finance、Growth、calculated、third-party estimate 与 missing 尚未全局统一。
- [ ] Growth CSV 严格数值、日期与身份校验：禁止无效值默认为 0，展示接受/拒绝/跳过数量，允许下载拒绝行。
- [ ] 为 ranks、competitor 等追加导入定义稳定 merge key、覆盖/追加策略和幂等测试。
- [ ] 补齐所有 Dataset Registry 与 localStorage 用户状态的备份 manifest 和恢复校验。
- [ ] 修复 Data Health recency 接线，并以状态模型驱动 UI，不从 DOM 文案反向取数据。
- [ ] 统一库存 observed-day velocity 和 Listing field profile，消除双口径。
- [ ] 建立 source → dist 资产一致性检查，重新构建并验证当前发布产物。
- [ ] 建立中央 page registry；统一 route、suite、侧栏、breadcrumb、command palette、标题与 i18n key。
- [ ] 去除重复 Tracker/Listing 入口，修正套件 active 状态、Cerebro 残留、中文混杂和 Advertising 语义碰撞。
- [ ] 把 AI Bids 改为准确名称；所有按钮必须有真实 handler，否则隐藏或 disabled 并说明原因。

P0 验收：所有可见指标能追到来源；坏行不会变成零；备份往返不丢状态；源码、dist 和已部署入口同版本；中英模式无已知路由/标题漂移。

### P1 — Keyword Lab 与第三方 CSV 适配

- [ ] 把 Keyword Research 升级为一个 Keyword Lab，保留“关键词发现 / 批量分析 / ASIN 导入与对比”三种模式和一套结果模型。
- [ ] 批量分析接受换行、逗号、CSV 和 Keyword Library，最多 200 词；逐词 left join，未命中项保留并显示原因。
- [ ] 合并 Ads、SQP/ABA、reverse-ASIN、rank 和 keyword-assets 证据；同名指标不跨来源静默覆盖。
- [ ] 增加 Helium 10 与卖家精灵 CSV profile：header alias、市场、报告类型、报告版本、快照日期、预览、严格校验和未知列保留。
- [ ] 暂不引入 XLSX 依赖；优先要求从第三方导出 CSV，或由用户另存为 CSV。
- [ ] 完成可点击 1/2/3+ gram、停用词、Common Words 排除、删除/恢复、词根高亮和原表联动。
- [ ] 完成列排序/拖动/显隐、保存视图、可靠的筛选预设、查询历史、选中/当前页导出。
- [ ] 统一批量动作：Add to List、Track Snapshot、Negative Candidate、Send to Listing、Export。
- [ ] 所有第三方专有指标保留原名、来源和快照，不生成仿 IQ/CPR/KPS/SPR/DSR 分数。

P1 验收：同一关键词从导入到列表/Listing/追踪不需要复制粘贴；200 个输入不会静默丢失；相同文件重复导入不产生重复结果。

### P2 — 多 ASIN、Library、Tracker 与 Listing 闭环

- [ ] ASIN Comparison 增加 primary owned ASIN、竞品组、共有/自有/缺口、覆盖热力图和按任一有源指标切换的矩阵。
- [ ] 只有相同 ASIN/keyword 存在多个日期快照时才显示自然位、广告位、traffic/conversion 的趋势与差值。
- [ ] Keyword Library 增加 folder、tag、status、note、favorite、move/copy、回收站、custom columns 和 20/50/100 分页。
- [ ] Rank Snapshots 改为 ASIN → Keywords 层级，增加日期覆盖、断档、备注/事件、自然/广告切换和本地 heat map。
- [ ] Suggested Keywords 使用集合差：最新 Ads/SQP/reverse-ASIN 导入词减去已追踪/已删除词，只在新导入后按保存规则重算。
- [ ] 串联 Keyword Library → Listing Keyword Bank → Title/Bullets/Description/Backend，保留来源、收藏、删除和 placement 状态。
- [ ] Listing 增加词根/短语使用矩阵、字段覆盖次数、未使用词根和仅基于导入竞品文案的 placement comparison。

P2 验收：一个关键词资产可看到来源、列表状态、Listing placement、排名快照和本地动作；没有第二个日期时 UI 不暗示趋势或日更。

### P3 — 透明的本地决策辅助

- [ ] 从完整导入字段计算并展示可展开公式的 Purchase Rate、Search CVR、Click CVR、CPA、break-even ACoS 和预算情景；缺分母时为 —。
- [ ] 增加可编辑的 Simple / Advanced 本地筛选与 Top-N 条件构造器；保存条件，不保存伪装成实时的结果。
- [ ] 增加人工相关性审核队列；若有 ASIN-result overlap，允许显示公式公开的“本地相关度”。
- [ ] 增加本地 alert inbox，只对两次真实快照间的价格、排名、库存、评论或广告变化发提示。
- [ ] 在现有只读 Agent 上补充“为什么这个词优先”“缺少什么数据”的确定性解释，不生成外部事实。

P3 验收：每个分数和建议均可展开查看输入、公式和限制；删除来源文件后不会留下无法追溯的结论。

## 明确不在当前范围

- ⛔ Amazon Ads API、SP-API、OAuth、Brand Analytics/SQP 自动读取。
- ⛔ 自动竞价、预算修改、dayparting、campaign/ad group/target mutation。
- ⛔ Listing 同步、发布或自动修改 Seller Central。
- ⛔ 实时 Reverse ASIN、Amazon 建议、Index Checker、排名抓取、Tracker Boost、实时 PPC bid。
- ⛔ 自动抓取 Amazon 页面、竞品变体、Top 10 商品、商品图或评论。
- ⛔ 在无授权数据时展示搜索量、销量、自然位、广告位、ABA、BSR、Amazon Choice 或市场均值。
- ⛔ 复制 Helium 10 / 卖家精灵的品牌 UI、文案、数据集或私有算法。
- ⛔ AI Listing 草稿、图片理解和市场摘要，直到有明确模型来源、成本、隐私和人工批准边界。
- ⛔ 浏览器扩展与 Google Trends / Keepa 等外部连接，直到核心 CSV 工作流验证确有需求。

这些事项不是“即将完成”的承诺；除非项目所有者明确重新开范围，否则不应建立空入口或预留复杂抽象。

## 实施顺序与质量门槛

| 阶段 | 交付结果 | 前置条件 |
|---|---|---|
| A. Truth & Release | 数据标识、严格导入、无损备份、recency、中央 page registry、dist 同步 | 无 |
| B. Keyword Lab | 统一三模式、200 词、来源合并、词根/列/历史、H10/卖家精灵 CSV profile | A |
| C. Workflow | Multi-ASIN、Library、快照 Tracker、Listing Keyword Bank | A、B |
| D. Local Intelligence | 透明公式、筛选构造器、人工审核、本地 alerts、Agent 解释 | A–C |

每个阶段都必须满足：

- Store 隔离、marketplace 和 snapshot date 不丢失。
- 导入 schema、坏行、重复、空值、极值和恢复流程有测试。
- 所有数值区分 raw / calculated / third-party estimate / missing。
- UI 没有无 handler 控件；键盘、移动表格、空态、错误态和双语经过实际浏览器检查。
- npm run check 和 npm run build 通过，源码与 dist 资产闭包一致。
- README 的完成状态与同一提交中的代码一致；不能先把计划项改成完成。

## 本地数据契约建议

现有 Dataset Registry 应继续作为唯一证据中枢，不另建平行数据库。第三方导入最少保留：

    dataset_id, store_id, marketplace, provider, report_type, report_version,
    source_file, imported_at, snapshot_date, schema_version, checksum,
    validation_status, accepted_rows, rejected_rows

关键词资产最少保留：

    keyword_id, normalized_keyword, display_keyword, marketplace,
    sources[], folder, tags[], intent, status, note,
    imported_at, snapshot_date, metric_quality

指标保留原始列和 lineage。跨来源同名指标采用 provider + metric + window 命名或明确选择器，不做“看起来相同”就合并。任何本地派生字段必须保存公式版本和输入列；第三方估算只展示，不重新命名为事实。

## 开发与验证

    npm install
    npm run check
    npm run build
    npm run dev

如需操作现有 D1 migration：

    npm run db:migrate

正常发布路径为 GitHub main → Cloudflare Workers Build → Wrangler deploy。在当前 dist 漂移修复前，不应根据源码测试通过就宣称生产静态资源已经同步。

## 永久边界与相关文档

- [CURRENT_HANDOFF.md](./CURRENT_HANDOFF.md)：历史交接上下文；其中固定 SHA 可能过期，以当前 main 为准。
- [CLOUDFLARE_ARCHITECTURE.md](./CLOUDFLARE_ARCHITECTURE.md)：Cloudflare 架构。
- [P0_DATA_BOUNDARY.md](./P0_DATA_BOUNDARY.md)：安全与数据边界。
- [migrations/0003_dataset_versions.sql](./migrations/0003_dataset_versions.sql)：D1 数据版本 schema。

README 是产品状态和路线图的唯一入口。后续提交应更新本文件，而不是继续追加重复的 milestone、历史 SHA 或已失效的交付顺序。
