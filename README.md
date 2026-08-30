# KeywordOS — Amazon Keyword Intelligence

KeywordOS 是一个面向 Amazon 广告与关键词运营的多店铺智能分析工作台。当前版本基于 V9 产品界面，已经从纯浏览器原型升级为 **Cloudflare Native Production**：前端、Worker API、D1、R2 与 GitHub 自动部署均运行在 Cloudflare 上。

> 当前原则：**KeywordOS 集中分析，Amazon 授权按 Store 隔离。** 现阶段 Amazon Ads API / OAuth 仍保持关闭，不保存 Amazon Refresh Token、Client Secret，也不执行真实 Amazon 写操作。

## Production

- **Production URL:** https://amazon-keyword-intelligence.tanshiyuesir.workers.dev/
- **Cloudflare Worker:** `amazon-keyword-intelligence`
- **Runtime:** Cloudflare Workers + Workers Static Assets
- **Compatibility date:** `2026-08-30`
- **Database:** D1 `amazon-keyword-intelligence-db`
- **Object storage:** R2 `amazon-keyword-intelligence-data`
- **CI/CD:** GitHub `main` → Cloudflare Workers Builds → Wrangler deploy
- **Observability:** enabled
- **Amazon API mode:** `disabled`

## Architecture

```text
GitHub main
    │
    ▼
Cloudflare Workers Builds
    │
    ▼
┌──────────────────────────────────────────────┐
│ amazon-keyword-intelligence Worker          │
│                                              │
│  Static Assets ───────────────► KeywordOS UI │
│  /api/* ─────► Worker API                   │
│                    │                         │
│                    ├────► D1                 │
│                    └────► R2                 │
└──────────────────────────────────────────────┘
```

Cloudflare 部署采用单 Worker full-stack 模式：

- **Workers Static Assets** 承载现有 HTML / CSS / JavaScript 前端。
- **Worker API** 只优先处理 `/api/*`，普通静态请求直接走 Cloudflare 静态资产网络。
- **D1 (`DB`)** 保存部署元数据和数据源 manifest。
- **R2 (`DATA`)** 私有归档运行时 seed 数据，并作为后续原始报表对象存储层。
- **Workers Builds** 监听 GitHub `main` 并执行检查、构建和生产部署。
- **Workers Observability** 已开启。

详细架构说明见 [`CLOUDFLARE_ARCHITECTURE.md`](./CLOUDFLARE_ARCHITECTURE.md)。

## Data

当前 Store 01 使用两组真实导入数据：

| 数据源 | 行数 | 当前用途 |
| --- | ---: | --- |
| Amazon Ads `202606.csv` | 8,753 | 广告、Campaign、Target、Search Term、关键词分析 |
| Unified Transaction `UnifiedTransaction-202606.csv` | 3,643 | 收入、退款、费用、结算与经营分析 |

当前数据放置策略：

1. 浏览器继续读取 `seed-data.js` 与 `unified-seed-data.js`，保持 V9 现有业务计算和交互兼容。
2. `npm run build` 只将 9 个明确的运行时文件复制到 `dist/`，不会把源码、依赖、迁移文件、原始 CSV、样本和文档公开部署为 Static Assets。
3. D1 记录数据源、行数、来源文件、归档状态和部署元数据。
4. R2 私有保存部署后的两份 seed 归档，不通过公开静态 URL 暴露对象写权限。

Store 02 / Store 03 当前仍是多店铺结构预览，没有伪造真实经营数据。

## Product Modules

### Global Intelligence

- Portfolio Overview
- Cross-store Intelligence
- Global Keyword Library
- Global Conflict Center
- Global Read-only boundary

### Store Advertising

- Dashboard
- Suggestions
  - AI Bids
  - Bids
  - New Keywords
  - Negative Keywords
  - Budget
- Analytics
- Ad Manager
- Rules & Automation
- Dayparting Schedules
- Action Center
- Change Log

### Keyword Intelligence

- Cerebro
- Keyword Tracker
- Keyword Library
- Negative Library
- Store Conflict Guard
- Protected Keywords
- Keyword lifecycle classification

### Finance

- Unified Transaction Analytics
- Income & Expenses
- Fees
- Product contribution analysis
- Settlements
- Transaction ledger
- Ads spend reconciliation

### Data & Administration

- Amazon Ads CSV import
- Unified Transaction import
- Sync Center
- Data Health
- Store Workspaces
- Amazon Connection workflow preview
- Users & Permissions
- Workspace Settings

## Execution Safety

KeywordOS 当前明确区分 **分析能力** 与 **Amazon 执行能力**。

### 当前允许

- 广告与关键词分析
- 跨店铺知识比较
- Search Term / Campaign / Product 分析
- Suggestions 和规则生成
- Action Center 本地审批工作流
- CSV 导入与导出
- D1 / R2 数据与部署状态读取

### 当前禁止

- 真实 Amazon Ads API 写入
- Amazon OAuth Token 存储
- 跨 Store 共用 Amazon Credential
- 未鉴权的服务端业务 mutation
- 伪造小时级广告数据、Organic Rank 或 Search Volume

在未来启用 Amazon API 前，服务端必须先增加正式身份认证与授权，并在 Worker 强制执行：

```text
Store → Connection → Advertiser → Marketplace
```

Global 页面只能产生分析结果和建议，不能直接产生跨店铺 Amazon 写操作。

## Runtime API

### `GET /api/health`

检查 Worker、D1、R2 和数据源状态。

典型返回信息包括：

- environment
- Amazon API mode
- architecture
- schema version
- source metadata
- R2 archive presence

如果 R2 seed 归档不存在，Worker 会使用 `waitUntil()` 从已部署 Static Assets 流式归档到私有 R2。

### `GET /api/data/manifest`

返回：

- D1 deployment metadata
- 已登记数据源
- 行数与来源文件
- R2 archive 状态

当前没有开放未鉴权的写 API。

## Local Development

要求：

- Node.js
- npm
- Cloudflare Wrangler

安装依赖：

```bash
npm install
```

检查 Worker 语法：

```bash
npm run check
```

生成 Static Assets：

```bash
npm run build
```

本地运行 Cloudflare Worker：

```bash
npm run dev
```

## Cloudflare Deployment

生产部署配置位于 [`wrangler.jsonc`](./wrangler.jsonc)。

手动部署：

```bash
npm run check
npm run build
npm run deploy
```

应用 D1 migration：

```bash
npm run db:migrate
```

正常生产流程不需要手动部署：GitHub `main` 已连接 Cloudflare Workers Builds，构建流程执行检查和 `dist/` 生成后通过 Wrangler 发布。

## Static Asset Allowlist

当前 Production 只部署以下 9 个前端运行时文件：

```text
index.html
styles.css
h10-ui.css
i18n.js
app.js
report-adapter.js
unified-report-adapter.js
seed-data.js
unified-seed-data.js
```

Worker 源码、`node_modules`、`migrations`、Wrangler 配置、原始 CSV、测试/验证文件和项目文档均不进入公开 Static Assets。

## Repository Structure

```text
.
├── index.html
├── app.js
├── styles.css
├── h10-ui.css
├── i18n.js
├── report-adapter.js
├── unified-report-adapter.js
├── seed-data.js
├── unified-seed-data.js
├── src/
│   └── worker.js
├── migrations/
│   └── 0001_init.sql
├── package.json
├── wrangler.jsonc
├── CLOUDFLARE_ARCHITECTURE.md
└── README.md
```

## Design / Product Notes

V9 延续 H10 Ads / Cerebro 风格的高密度桌面工作台：

- 216px 导航侧栏
- 50px 顶栏
- 高密度数据表格
- Campaign → Ad Group → Target → Search Term drill-down
- Filter Library
- Column Settings
- Learn Drawer
- 中文 / English / 中英对照
- Global Read-only 与 Store Execution Boundary
- Conflict Guard 与 Protected Keyword 双重否词保护

产品 UI 审计见 [`V9_H10_UI_AUDIT.md`](./V9_H10_UI_AUDIT.md)。

## Current Status

**Cloudflare Native Production deployment is active.**

当前基础设施已经完成：

- Frontend deployed
- Worker API deployed
- D1 connected
- R2 connected and seed archive enabled
- GitHub → Workers Builds connected
- Production observability enabled
- Amazon API intentionally disabled

下一阶段若继续产品化，重点应是正式身份认证、多用户/Store 权限、服务端持久化业务状态，以及在明确安全边界后再决定是否接入 Amazon Ads API，而不是重新设计现有 Cloudflare 部署架构。
