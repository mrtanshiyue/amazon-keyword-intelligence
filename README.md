# KeywordOS · Amazon Keyword Intelligence

> 面向 Amazon 运营的本地优先关键词、广告、Listing、商品与经营分析工作台。系统从**导入证据**生成可追溯分析和待审核的本地操作；当前版本不会连接或写入 Amazon。

当前版本：`9.2.6`  
本次源码审计基线：README 更新前 `main@e6d2a7009b0023364d42c5ad7f143ddb5f9d69a2`  
技术形态：Cloudflare Worker + Static Assets + D1 + R2；浏览器应用为原生 JavaScript，无 React/Vue 运行时。

> 本 README 记录的是当前代码事实与已证实风险。审计本身不修改业务源码；问题只有在代码修复、回归验证和新 CI 通过后才能标记为已解决。

## 目录

- [产品边界](#产品边界)
- [产品能力](#产品能力)
- [项目结构](#项目结构)
- [数据与架构](#数据与架构)
- [本地开发与验证](#本地开发与验证)
- [审计方法与当前验证状态](#审计方法与当前验证状态)
- [审计结果与待修复项](#审计结果与待修复项)
- [安全与运行约束](#安全与运行约束)
- [相关文档](#相关文档)

## 产品边界

### 当前可以做

- 导入、验证并在浏览器本地持久化 Amazon Ads Search Term 与 Unified Transaction CSV。
- 在 Store 01 工作区中分析广告表现、搜索词、关键词、财务、库存、竞争对手、评论和排名等已导入证据。
- 生成浏览器本地的关键词、否定词、Bid、Listing、规则和补货**建议/草稿**；支持备份、恢复、导出与审阅。
- 用来源标记区分 `USER IMPORT`、`BUNDLED SEED`、`CALCULATED`、`THIRD-PARTY ESTIMATE` 与 `MISSING`。

### 当前明确不会做

- 不发起 Amazon Ads OAuth、SP-API、Amazon Ads API 请求，也不保存 Amazon 凭证。
- 不向 Amazon 发布 Listing、修改竞价/预算/活动或执行任何广告动作。
- 不提供匿名的 Worker 写入 API。Worker 业务路由仅接受 `GET` 与 `HEAD`。
- 不从缺失数据推断搜索量、自然排名、销量、实时同步状态或 Amazon 执行结果。

`Staged`、`Approved`、规则、计划和 Listing 草稿均是本地状态，**不表示 Amazon 已执行或已发布**。

## 产品能力

| 范围 | 已实现的工作台 | 证据与限制 |
| --- | --- | --- |
| Keywords | Keyword Lab、批量分析、Keyword Library、Tracker、负面词与冲突保护 | 仅使用导入的 Ads、SQP/ABA、reverse-ASIN、rank 与本地资产；不虚构搜索量或自然排名。 |
| Marketing | Dashboard、Ad Manager、Analytics、Suggestions、Rules、Schedules、Action Center、Outcomes | 建议来自透明阈值/公式与导入数据；不会直接改动 Amazon。 |
| Listing | Listing Optimizer、Keyword Bank、词组/词根使用矩阵、竞争对手标题对比 | 仅维护本地准备草稿；关键词送入 Bank 不会自动改写标题、五点或后台词。 |
| Products | Product Master、Product 360、Competitor、Reviews | 跨源连接需要显式 SKU/ASIN/Product Master 映射，缺映射时保持不可用。 |
| Operations | Import Center、Unified Report、Data Health、Inventory、补货规划、Local backup/restore | 导入先校验；补货是计划输出，不是采购单提交。 |
| Analytics | Portfolio、Cross-store、Anomaly Center、趋势与本地 alert inbox | Alert 需要同一实体至少两次不同日期的真实观察，不伪装为实时监控。 |

### 当前实现契约

下面几项是仓库中已经存在的行为，不表示没有其它缺陷：

- [x] 统一批量动作：Add to List、Track Snapshot、Negative Candidate、Send to Listing、Export。
- [x] Rank Snapshots 改为 ASIN → Keywords 层级，并保留按日期导入的真实快照；缺失日期不补值。
- [x] 本地 alert inbox 只使用已导入的不同日期观察生成告警，不伪装成实时监控。
- [x] 串联 Keyword Library → Listing Keyword Bank → Title/Bullets/Description/Backend；关键词进入 Bank 不会自动修改 Listing 文案。

> 当前部分 Node 测试会直接断言以上 README 文案。此次 README 更新保留这些契约文本以恢复兼容，但“测试依赖文档精确措辞”本身仍被列为 P1 测试架构问题，后续应把行为契约移回代码/测试 fixture，而不是把 README 当可执行接口。

## 项目结构

```text
.
├── index.html                     # 单页壳；按顺序加载浏览器模块
├── app.js                         # 核心状态、页面渲染、广告/财务工作台
├── growth-workspaces.js           # Products/Keywords/Listing/Operations/Analytics 扩展页面
├── navigation-taxonomy.js         # 页面注册表、套件导航与 hash 路由
├── dataset-registry.js            # 浏览器 IndexedDB Dataset Registry
├── *-validation.js                # CSV shape/value 校验与导入保护
├── *-actions.js                   # 本地可逆操作、草稿、备份与 UI 交互
├── keyword-*.js                   # Keyword Lab、Library、relevance、suggestions
├── competitor-*.js / review-*.js  # 竞争对手及 VOC 导入证据工具
├── src/
│   ├── worker.js                  # GET/HEAD Worker API 与 R2 数据交付
│   ├── access-auth.js             # 备用 Cloudflare Access JWT 校验
│   ├── store-authorization.js     # 备用 Store membership 查询
│   ├── import-validation.js       # 服务端导入字节/CSV 校验
│   ├── import-pipeline.js         # validate → persist 编排
│   └── dataset-persistence.js     # R2 不可变对象与 D1 version/current pointer
├── migrations/                    # D1 schema v1–v3
├── tests/                         # Node 原生测试；当前没有真实浏览器 E2E gate
├── scripts/check-dist-assets.mjs  # 发布资源闭包与 source/dist 一致性检查
├── dist/                          # 受提交的静态发布资产，由 npm run build 重建
├── sample-data/                   # 本地审阅用样例 CSV
└── CURRENT_HANDOFF.md / CLOUDFLARE_ARCHITECTURE.md / P0_DATA_BOUNDARY.md
```

浏览器模块以轻量全局契约协作；没有框架运行时或第二套客户端数据仓库。Dataset Registry 是已导入证据的主要浏览器持久化中心；少量 UI 偏好、草稿与兼容状态使用 `localStorage`，并受本地备份校验覆盖。

## 数据与架构

```text
Browser
  ├─ Static Assets: index.html + CSS + browser JavaScript (dist/)
  ├─ IndexedDB: Dataset Registry（已导入/派生的本地证据）
  └─ localStorage: 草稿、视图、操作审阅与兼容 UI 状态

Cloudflare Worker (src/worker.js)
  ├─ /api/health
  ├─ /api/data/manifest
  ├─ /api/data/seed.js
  ├─ /api/data/unified-seed.js
  └─ /api/private/session
       ├─ D1: 部署元数据、备用 membership、数据版本元数据
       └─ R2: public-test seed/test object 与预备的不可变对象命名空间
```

### 数据真相规则

- Store 01 的 public-test 基线为 Ads Search Term 8,753 行、Unified Transaction 3,643 行；Store 02/03 没有真实数据，页面不得捏造业务指标。
- 浏览器导入的 Ads 与 Unified 数据会在写入 IndexedDB 前进行字段、数值、日期和关键财务值校验。
- 所有跨源合并要求显式身份键；无法映射时显示 `MISSING` 或 unmapped queue，而不是猜测关联。
- 备份恢复会校验 localStorage 顶层形状、Dataset Registry 记录和 manifest checksum；失败时回滚。
- 当前 Dataset Registry 已支持 Store-scoped key，但多个业务模块仍硬编码 `store-a`；因此目前不能把 UI 中的 “All Stores / Cross-store / 自建 Store” 解释为完整多 Store 数据隔离已经完成。

### 预备的服务端持久化路径

服务端内部已具备但尚未连接到公开写路由的安全链路：

```text
CSV bytes
→ validateImportBody()
→ SHA-256 / report-shape / value checks
→ persistAcceptedDataset()
→ R2 create-only write (If-None-Match: *)
→ actual object integrity verification
→ D1 batch: version metadata + current pointer
```

这套基础不代表用户数据已上传；当前产品导入仍是浏览器本地路径。

## 本地开发与验证

### 常规检查

```bash
npm ci
npm run check
npm run build
```

- `npm run check`：对 Worker 与浏览器脚本做语法检查，并运行 `tests/*.test.mjs`。
- `npm run build`：重建 `dist/`，然后验证 HTML 引用的资源闭包以及 source/dist 字节一致性。
- `npm run dev`：以 Wrangler 启动本地 Worker 与静态资源。

### 新 clone / 本地运行限制

直接执行 `npm run dev` **不足以得到带基线数据的工作台**。本地 Miniflare D1 与 R2 默认是空的，因此可能出现：

- `/api/health` 因本地 D1 尚未建立 `deployment_meta` 而返回 `503`；
- `/api/data/seed.js` 和 `/api/data/unified-seed.js` 因本地 R2 不含对象而返回 `404`；
- 页面可加载，但显示空数据与 runtime unavailable。

仓库目前没有安全的一键 local bootstrap。运行本地完整演示前，需要显式建立本地 D1 migration，并把允许的 seed object 写入本地 R2。`npm run db:migrate` 指向 `--remote`，**不能**当成本地初始化命令。

另外，仓库根目录的 `Start KeywordOS.command` 只运行 `python -m http.server`。它不会启动 Worker、D1 或 R2，所以 `/api/*` 一定不是 Wrangler API；这个脚本目前只能用于静态壳检查，不能作为完整 KeywordOS 启动器。

生产发布链路为 GitHub `main` → Cloudflare Workers Build → deploy。源码或本地构建通过不等同于生产已经更新。

## 审计方法与当前验证状态

本次审计以 README 更新前的 `main@e6d2a70` 为源码基线，逐项交叉检查：

- 当前 Git tree、README、package scripts、CI workflow 与最近提交/回退历史；
- `app.js`、Growth/Keyword/Listing/Competitor/Review 运行时模块与所有可检索的 `MutationObserver` 热点；
- Dataset Registry、local backup/restore、导入值校验与导出路径；
- Worker、Access JWT、Store authorization、Wrangler D1/R2/Static Assets 绑定；
- README 与测试套件之间的精确文本依赖；
- 当前 GitHub Actions run 与 open Issue / handoff 文档漂移。

### README 更新前的 CI 事实

`e6d2a70` 的 GitHub Actions `CI` run `33737583255` 为 **FAILURE**：`Check and test` 失败，后续 `Build static assets` 与 committed-dist parity 均被跳过。因此不能继续沿用“当前 HEAD 427/427 + build PASS”的表述。

静态对照测试源码与 `e6d2a70` README 可以确定，README 重建至少破坏了以下文档文本契约：

- Keyword Lab bulk actions 的固定 checklist 文案；
- Rank Snapshots 的固定说明文案；
- Listing Keyword Bank 串联的固定 checklist 文案；
- `本地 alert inbox` 的大小写敏感文案。

本 README 已恢复这些文本。最终是否恢复绿色 CI，以本次 README 提交触发的新 GitHub Actions 结果为准。

### 本次未做的事情

- 未修改任何业务 JavaScript、Worker、migration、Cloudflare 设置或 Amazon 边界。
- 当前执行环境无法直接通过公网 `git clone` GitHub，因此没有把容器网络失败算作项目问题；代码审计使用已连接的 GitHub 仓库数据源。
- 未声称浏览器卡死问题已经修复；当前仓库缺少真实浏览器 E2E gate，必须先修代码再做浏览器回归。

## 审计结果与待修复项

### 总览

| 级别 | 问题 | 当前状态 |
| --- | --- | --- |
| P0 | Inventory / Anomaly observer feedback loop 可卡死页面 | 未修复；历史修复 `a077d9a` 已被 `212b7d8` 回退 |
| P0 | Data Health recency observer 可自激活持续刷新 | 未修复；缺 DOM 收敛回归测试 |
| P1 | CI 只有 Node/源码级 gate，没有真实浏览器交互 gate | 未修复；两个 P0 都属于此类漏检 |
| P1 | README 精确措辞被测试当接口，docs-only 改动即可打红 CI | 文案已恢复；测试架构耦合仍未修复 |
| P1 | Store 01 `hasData/source` 与多个数据消费者硬编码 `store-a` | 未修复；会产生来源误导并阻碍真实多 Store 隔离 |
| P1 | 本地 D1/R2 无 bootstrap，`Start KeywordOS.command` 只启动静态 HTTP | 未修复 |
| P1 | CSV 人工导出未中和 spreadsheet formula 前缀 | 未修复；存在 CSV/Formula Injection 风险 |
| P2 | 多模块共享 DOM + 多个 MutationObserver，页面 ownership 边界脆弱 | 未系统治理 |
| P2 | README / CURRENT_HANDOFF / Issue #17/#63 的“当前基线”存在漂移 | README 已校正；其它文档/Issue 仍需单独同步 |
| P2 | Issue #17 记录 main branch protection 未启用 | 仓库管理缺口；本次连接权限无法独立读取 protection 状态 |

### P0：Inventory / Anomaly 路由存在 observer feedback loop

**状态：未修复；第一优先级。**

`growth-consistency-actions.js` 当前在 `#content` 的 child-list 变化后调用 `refresh()`；Inventory 会无条件用 `innerHTML` 重建 Risk badge，Anomaly 会 remove/append Inventory 行。其它运行时模块也观察同一内容区域，因此这些非幂等 DOM 写入会再次触发刷新，形成 observer-driven redraw loop。

仓库历史 `a077d9a`（`fix: stop inventory observer feedback loop`）已经实现过最小收敛修复：

1. Risk badge 只在 class/text 真正变化时原位更新；
2. Anomaly 行增加 managed marker；
3. 相同模型用 fingerprint 短路重复 remove/append；
4. 增加 cross-observer convergence 回归测试。

随后 `212b7d8`（`revert: restore state before inventory hotfix`）把这部分代码和回归测试一并回退；`e6d2a70` 只改 README，没有恢复修复。

**建议修法：**恢复 `a077d9a` 的等价最小收敛逻辑，不新增抽象层；修复后必须验证 Inventory 与 Anomaly 在同一 DOM 状态下重复 refresh 不再产生 mutation。

### P0：Data Health recency observer 会被自己的 DOM 写入再次唤醒

**状态：未修复。**

`data-recency-actions.js` 对 `#content` 使用 `{ childList: true, subtree: true }` 的 `MutationObserver`。在 Data Health 页面，`enhanceDataHealth()` 每次 refresh 都无条件执行：

```js
notice.innerHTML = `...`;
```

即使文案没有变化，重新赋值 `innerHTML` 也会替换子节点并产生新的 child-list mutation；observer 再次调度下一帧 refresh，具备持续自激活条件。当前测试只验证日期、coverage 和 recency 计算，没有 DOM 收敛测试。

**建议修法：**像 `setText`/`setHtml` 一样先比较再写，或只创建一次稳定子节点并更新确实变化的 textContent；同时加一个最小回归测试证明第二次 refresh 不产生新的 DOM mutation。

### P1：缺少真实浏览器 E2E / DOM 收敛 gate

`.github/workflows/ci.yml` 当前执行 `npm ci → npm run check → npm run build → dist parity`。`npm run check` 主要是 `node --check` + Node 原生单元测试；仓库没有 Playwright/WebDriver/jsdom 类的真实页面导航 gate。

这解释了为什么纯计算测试可以全部覆盖，而 observer feedback loop 仍能进入 `main`。不需要引入大型测试体系：最小方案只要覆盖几个阻断路由（Inventory、Anomaly、Data Health、Search Funnel、Rank）并断言页面在有限 mutation/帧数后稳定即可。

### P1：README 被测试当作精确字符串 API

多个测试直接 `readFile('../README.md')` 并对中文句子做大小写敏感 regex。结果是 `e6d2a70` 仅重建 README 就能让 `Check and test` 失败，业务代码完全没变。

本次 README 已恢复现有测试需要的文本，使当前分支先回到兼容状态；根因仍应后续处理：

- 行为测试断言代码行为/导出契约；
- README 只记录事实，不应成为产品行为 fixture；
- 如果确实需要文档契约测试，只验证稳定的 section/marker，不验证可编辑自然语言句子。

### P1：Store 01 数据状态与数据消费者存在硬编码

`ui-actions.js` 的 `storeWorkspaces()` 当前会强制：

```text
store-a → hasData=true → source="Imported Amazon Ads dataset"
其它 Store → hasData=false → source="No data"
```

这个判断没有读取 Dataset Registry 或 runtime seed 是否真的成功。因此在本地 R2 seed 404、IndexedDB 为空时，Store 01 仍可能显示 `Data loaded` / imported source。

同时 `data-provenance-guard.js`、`growth-consistency-actions.js`、`import-workspace-states.js`、review/competitor 模块等仍存在固定 `store-a` 读取。Dataset Registry 本身支持 Store-scoped key，但消费者尚未完成 Store scope 贯通。

**影响：**当前 Store 01 单店使用仍可工作，但 “All Stores / Cross-store / Store 02/03 / 自建 Store” 不能视为完整多 Store 数据隔离；未来一旦导入第二个真实 Store，硬编码会成为错误数据归属风险。

### P1：本地开发 bootstrap 与启动器不完整

项目没有一条安全、只作用于本地绑定的 D1 migration + R2 seed bootstrap。`npm run db:migrate` 明确是 `--remote`，不能拿来补本地开发缺口。

根目录 `Start KeywordOS.command` 仅用 Python 启动静态 HTTP server，却给人“启动 KeywordOS”的语义；`index.html` 依赖 `/api/data/*.js`，因此该脚本不能提供完整运行时。

**建议修法：**保持简单——把脚本改成调用现有 `npm run dev`，并增加一个显式的 local-only 初始化命令；不要创建第二套 dev server。

### P1：CSV 导出存在 spreadsheet formula injection 风险

`ui-actions.js` 的 `csvCell()` 只做双引号转义：

```js
return `"${String(value ?? '').replace(/"/g, '""')}"`;
```

表格导出会把 DOM 中的已导入搜索词/名称等文本原样写进 CSV。对于以 `=`, `+`, `-`, `@` 开头的外部文本，单纯 CSV quoting 不能作为 spreadsheet formula neutralization；用户在 Excel/Sheets 类工具打开人工导出时可能触发公式解释。

**建议修法：**只在“给人打开的 CSV 导出”统一复用一个安全 cell encoder，对危险前缀做 neutralization；不要无差别修改必须保持原始字节/原始内容的 rejected-import 或取证型导出。

### P2：DOM ownership / MutationObserver 数量过多

当前多个运行时模块会同时观察并后置改写 `#content`、modal、drawer 或动态表格。代码里已经出现过 sidebar、provenance、Inventory 等 observer feedback 回归历史；Data Health 又存在同类模式。

这不是要求引入 React 或重写前端。最小治理方向是：

- 一个 DOM 区域尽量只有一个明确 owner；
- 后置补丁必须幂等；
- observer callback 只处理自己关心的新增节点，不做全页 refresh；
- 任何会被 observer 观察到的写入都应先做“值是否真的变化”判断。

### P2：文档与 Issue 状态漂移

`CURRENT_HANDOFF.md` 顶部仍写 `Updated: 2026-09-02`，正文却已经包含 `2026-09-03` owner override；它还写 README roadmap 是 `[x]/[ ]` 的权威来源，而 `e6d2a70` 的 README 重建删除了大部分 checklist。

Open Issue #17 / #63 中的 “authoritative main / latest code baseline” 也落后于当前 `main`。这些历史 SHA 可以保留作验收记录，但不能继续写成“当前 main”。

本次只按用户要求更新 README；其它 handoff / Issue 元数据应在单独任务中同步，避免一次审计修改过多文件。

### P2：main branch protection 管理缺口

Issue #17 当前明确记录：`main` branch protection 尚未启用。此次 GitHub 连接权限读取 protection endpoint 返回 `403`，因此本 README 不把它伪装成独立复核结论，只记录为**现有仓库管理缺口**。

这不是当前浏览器运行时 blocker，但在项目继续通过直接 `main` 提交迭代时，会放大未通过 CI 的提交进入主分支的概率。

## 安全与运行约束

### Amazon：硬关闭

`AMAZON_API_MODE=disabled` 是当前约束。未获得明确授权前，不应加入 OAuth、SP-API、Ads API、凭证存储、自动同步、广告写入或 Listing 发布。

### Access：测试旁路期间保留基础，不重新实现

当前 owner 明确要求测试阶段不启用邮箱登录：Worker 默认为 `AUTH_MODE=disabled-test`，Cloudflare Access 的 `Bypass / Everyone` 用于测试。仓库保留 Access JWT、canonical `sub`、D1 membership 与 Store authorization 基础，供未来明确授权后恢复。

这意味着：

- **当前测试部署不能被称为私有生产环境**；
- 不捕获真实身份 `sub`，不初始化 `access_users` / `store_memberships`；
- 不将匿名访问视为认证或授权成功；
- 不暴露 POST、PUT、PATCH、DELETE 等匿名业务 API；
- owner 未明确恢复认证前，不擅自移除 bypass 或重写认证体系。

### Worker / 数据边界

`src/worker.js` 当前只接受 `GET` / `HEAD`，其它方法返回 `405`。`/api/data/*` 仍是 `public-test` 数据交付路径，预备的 `validate → persist` 服务端管道没有接入公开 mutable route。

### GitHub / Cloudflare 运维

`/cloudflare status` 是 GitHub-only 的只读状态通道，仅检查 secrets 是否存在、令牌有效性和 Worker/D1/R2 的读取能力。它不得用于部署、Access 策略写入、D1/R2 数据写入或 Amazon 操作。

## 推荐修复顺序

1. **先修两个 P0 observer loop**：Inventory/Anomaly + Data Health，并加最小 DOM 收敛回归测试。
2. **再补浏览器 gate 与数据真相**：关键路由 smoke/E2E、Store `hasData/source` 从真实 Dataset Registry/runtime 派生、逐步消除业务模块的 `store-a` 硬编码。
3. **最后处理工程/运维缺口**：README 测试解耦、local bootstrap/启动器、CSV formula neutralization、handoff/Issue 同步、branch protection。

不要为了这些问题重写整个前端、引入第二套状态管理、增加新的认证系统或提前接 Amazon API。优先恢复已有正确实现、复用现有 Dataset Registry/validator/helper，并在共同调用路径修根因。

## 相关文档

- [CURRENT_HANDOFF.md](./CURRENT_HANDOFF.md)：当前维护交接与永久 owner 边界；其中的历史 SHA 必须结合当前 main 重新核对。
- [CLOUDFLARE_ARCHITECTURE.md](./CLOUDFLARE_ARCHITECTURE.md)：Worker、D1、R2 与 Access 架构细节。
- [P0_DATA_BOUNDARY.md](./P0_DATA_BOUNDARY.md)：数据边界、认证冻结和持久化安全契约。
- [migrations](./migrations/)：D1 schema 演进。

维护 README 时，以当前 `main`、实际代码与可复现验证为准；不要把历史里程碑、旧 SHA、旧 CI run 或计划能力写成当前已交付事实。