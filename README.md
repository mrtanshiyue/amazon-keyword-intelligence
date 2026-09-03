# KeywordOS · Amazon Keyword Intelligence

> 面向 Amazon 运营的本地优先关键词、广告、Listing、商品与经营分析工作台。系统从**导入证据**生成可追溯分析和待审核的本地操作；当前版本不会连接或写入 Amazon。

当前版本：`9.2.6`<br>
当前审计基线：`main` / `212b7d8`<br>
技术形态：Cloudflare Worker + Static Assets + D1 + R2；浏览器应用为原生 JavaScript，无 React/Vue 运行时。

## 目录

- [产品边界](#产品边界)
- [产品能力](#产品能力)
- [项目结构](#项目结构)
- [数据与架构](#数据与架构)
- [本地开发与验证](#本地开发与验证)
- [审计结果与待修复项](#审计结果与待修复项)
- [安全与运行约束](#安全与运行约束)
- [相关文档](#相关文档)

## 产品边界

### 当前可以做

- 导入、验证并在浏览器本地持久化 Amazon Ads Search Term 与 Unified Transaction CSV。
- 在 Store 01 工作区中分析广告表现、搜索词、关键词、财务、库存、竞争对手、评论和排名等已导入证据。
- 生成浏览器本地的关键词、否定词、Bid、Listing、规则和补货**建议/草稿**；支持备份、恢复、导出与审阅。
- 用严格的来源标记呈现 `USER IMPORT`、`BUNDLED SEED`、`CALCULATED`、`THIRD-PARTY ESTIMATE` 与 `MISSING`。

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
| Analytics | Portfolio、Cross-store、Anomaly Center、趋势与本地 Alert Inbox | Alert 需要同一实体至少两次不同日期的真实观察，不伪装为实时监控。 |

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
├── tests/                         # Node 原生测试
├── scripts/check-dist-assets.mjs  # 发布资源闭包与 source/dist 一致性检查
├── dist/                          # 受提交的静态发布资产，由 npm run build 重建
├── sample-data/                   # 本地审阅用样例 CSV
└── CURRENT_HANDOFF.md / CLOUDFLARE_ARCHITECTURE.md / P0_DATA_BOUNDARY.md
```

浏览器模块以轻量全局契约协作；没有框架运行时或第二套客户端数据仓库。Dataset Registry 是已导入证据的唯一浏览器持久化中心；少量 UI 偏好、草稿与兼容状态使用 `localStorage`，并受本地备份校验覆盖。

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

- Store 01 的生产 public-test 基线为 Ads Search Term 8,753 行、Unified Transaction 3,643 行；Store 02/03 没有真实数据，页面不得捏造业务指标。
- 浏览器导入的 Ads 与 Unified 数据会在写入 IndexedDB 前进行字段、数值、日期和关键财务值校验。
- 所有跨源合并要求显式身份键；无法映射时显示 `MISSING` 或 unmapped queue，而不是猜测关联。
- 备份恢复会校验 localStorage 顶层形状、Dataset Registry 记录和 manifest checksum；失败时回滚。

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

### 重要：新 clone 的本地运行限制

直接执行 `npm run dev` **不足以得到带基线数据的工作台**。本地 Miniflare D1 与 R2 默认是空的，因此会出现：

- `/api/health` 因本地 D1 尚未建立 `deployment_meta` 而返回 `503`；
- `/api/data/seed.js` 和 `/api/data/unified-seed.js` 因本地 R2 不含对象而返回 `404`；
- 页面可加载，但显示空数据与 runtime unavailable。

这是当前仓库缺少“一键本地初始化”脚本的结果，不应被误解为生产数据损坏。运行本地完整演示前，需要显式建立本地 D1 migration 并将允许的 seed object 写入本地 R2；当前 README 不把远程 `npm run db:migrate` 当作本地初始化命令，因为该脚本面向远程 D1。

生产发布链路为 GitHub `main` → Cloudflare Workers Build → deploy。源码或本地构建通过不等同于生产已经更新。

## 审计结果与待修复项

本节记录对当前 `main`（`212b7d8`）的代码、构建、测试和浏览器交互审计结果。

### 已验证

- `npm run check` 通过：427/427 测试通过。
- `npm run build` 通过：静态资源闭包与 source/dist byte identity 均通过。
- 实测 Portfolio、Store Workspace、Keyword Lab、Import Center 路由与关键点击可渲染；已禁用的 Amazon/API/无实现动作带有原因提示，属于产品边界而非死锁。

### P0：Inventory 路由会卡死浏览器

**状态：未修复；应优先处理。**

复现：从任意页面点击“库存”（`#page=inventory-risk`）。浏览器点击调度超时，随后可访问性/页面状态也不再响应，表现为主线程被持续渲染占用。

根因位于 `growth-consistency-actions.js`：当前 `MutationObserver` 在内容变更时调用 `refresh()`，而 Inventory/Anomaly 补丁会通过 `innerHTML` 重写表格徽标、移除并追加行；它与 `import-workspace-states.js` 的子树观察器互相触发，形成 observer-driven redraw loop。

仓库历史中 `a077d9a`（`fix: stop inventory observer feedback loop`）已针对这一问题实现过收敛逻辑，但当前 `212b7d8` 回退了该变更，同时删除了对应回归测试。修复应恢复等价保护：

1. 仅在 badge 内容确实变化时更新 DOM，不用无条件 `innerHTML` 覆盖。
2. 为 Anomaly 插入行标记所有权，并按稳定 fingerprint 判断结果是否已渲染。
3. 恢复“Inventory 与 Anomaly DOM patch 必须收敛”的回归测试。

在修复并完成浏览器回归前，不应将 Inventory/Anomaly 页面标记为稳定可用。

### P1：本地开发初始化缺口

**状态：未修复。**

本地 Worker 依赖 D1 migration 与 R2 seed object，但项目未提供安全的本地 bootstrap 命令，也未在 `npm run dev` 前检测并给出可操作的初始化说明。应增加独立、显式且仅作用于本地绑定的初始化脚本，或让 `/api/health` 在未初始化时返回结构化 `setup_required` 状态。不要借此增加匿名生产写接口。

### P2：文档与运行时来源表达需保持一致

当本地 seed endpoint 404 时，页面的一些来源文字仍可显示 `Cloudflare seed · 202606.csv`，但指标为零。这会让操作者误以为已加载有效基线。初始化缺口解决前，UI 应在 seed 请求失败时把来源明确显示为 `MISSING`，而不是沿用 seed 名称。

## 安全与运行约束

### Amazon：硬关闭

`AMAZON_API_MODE=disabled` 是当前约束。未获得明确授权前，不应加入 OAuth、SP-API、Ads API、凭证存储、自动同步、广告写入或 Listing 发布。

### Access：测试旁路期间保留基础，不重新实现

当前 Worker 默认为 `AUTH_MODE=disabled-test`，Cloudflare Access 的 `Bypass / Everyone` 用于测试。仓库保留 Access JWT、canonical `sub`、D1 membership 与 Store authorization 基础，供未来明确授权后恢复。

在恢复前：

- 不捕获真实身份 `sub`，不初始化 `access_users` / `store_memberships`。
- 不将匿名访问视为认证或授权成功。
- 不暴露 POST、PUT、PATCH、DELETE 等匿名业务 API。

### GitHub/Cloudflare 运维

`/cloudflare status` 是 GitHub-only 的只读状态通道，仅检查 secrets、令牌有效性和 Worker/D1/R2 的读取能力。它不得用于部署、Access 策略写入、D1/R2 数据写入或 Amazon 操作。

## 相关文档

- [CURRENT_HANDOFF.md](./CURRENT_HANDOFF.md)：当前维护交接与永久 owner 边界。
- [CLOUDFLARE_ARCHITECTURE.md](./CLOUDFLARE_ARCHITECTURE.md)：Worker、D1、R2 与 Access 架构细节。
- [P0_DATA_BOUNDARY.md](./P0_DATA_BOUNDARY.md)：数据边界、认证冻结和持久化安全契约。
- [migrations](./migrations/)：D1 schema 演进。

维护 README 时，以当前 `main`、实际代码与可复现验证为准；不要把历史里程碑、旧 SHA 或计划能力写成已交付事实。
