# V8 Frontend Architecture

## 1. Global Layer

- Portfolio Overview
- Cross-store Intelligence
- Global Keyword Library
- Global Conflict Center

规则：只读，只生成跨店比较与 Recommendation，不允许直接写 Amazon。

## 2. Store Context

切换到具体 Store 后，顶部显示：

`STORE → CONNECTION → ADVERTISER → MARKETPLACE`

Store 级工具：

- Ad Manager
- Analytics
- Rules & Automation
- Action Center
- Cerebro
- Keyword Tracker
- Keyword Library
- Negative Library
- Store Conflict Guard
- Unified Report

## 3. Connection Layer

Amazon Connections 的核心是一店一授权：

- Store 01 → CONN-001 → Advertiser 01
- Store 02 → CONN-002 → 独立 OAuth
- Store 03 → CONN-003 → 独立 OAuth

不设计跨 Store 共用 Refresh Token。

## 4. Data Layer UI

- Import Center
- Sync Center
- Data Health

同步任务按 Store / Connection 独立展示，单个连接失败不影响其他店。

## 5. Permission Layer

Users & Permissions 预留：

- Owner
- Admin
- Operator
- Finance
- Viewer

并绑定 Allowed Stores。

## 6. Files

- `index.html` — shell + scope switcher
- `styles.css` — V7 styles + V8 multi-store components
- `app.js` — V7 functions + V8 scope/connection/global pages
- `i18n.js` — 中文 / English / 中英
- `seed-data.js` — 现有 202606 Amazon Ads 数据
- `unified-seed-data.js` — 现有 202606 Unified Transaction 数据
- `report-adapter.js` — Amazon Ads CSV adapter
- `unified-report-adapter.js` — Unified Report adapter
