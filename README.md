# KeywordOS V9 — H10 Deep UI / Workflow Edition

V9 基于 V8 的“KeywordOS 集中、Amazon 授权分离”架构，对 H10 Ads / Cerebro 的页面层级、数据密度和交互逻辑进行系统级重构。

## 运行

macOS：双击 `Start KeywordOS.command`。

或终端运行：

```bash
cd amazon-keyword-intelligence-v9
python3 -m http.server 8080
```

浏览器打开：

```text
http://localhost:8080
```

## V9 新增 / 重构

- H10 风格桌面 Design System：216px 导航、50px 顶栏、34px 控件、39px 数据行。
- Store Dashboard 改为 8 KPI：Spend / Sales / Total Sales / TACoS / ACoS / ROAS / Clicks / CPC。
- Dashboard 新增 Highest ACoS Campaigns / Highest Spend Targets / Campaign Performance。
- 新增 Suggestions：AI Bids / Bids / New Keywords / Negative Keywords / Budget。
- Suggestions 支持 Apply / Remove / Pause；Apply 先进入 KeywordOS Action Center。
- Analytics 新增 Segmentation Toggle。
- Filter Library 支持 Apply / Default / Rename / Delete，并跨 Ad Manager / Analytics 共用。
- Ad Manager / Analytics 表格统一成更接近 H10 的高密度工作台。
- 新增 Dayparting Schedules 前端工作流。
- 每页增加 Learn Drawer。
- Cerebro 进一步按 Find Suggestions / Analyze Keywords / Distribution / Word Frequency / Results 重构。
- 保留中文 / English / 中英对照。
- 保留 Global Read-only、Store Execution Boundary、Amazon Connection 独立授权、Conflict Guard。

详细分析见 `V9_H10_UI_AUDIT.md`。

## 数据

Store 01 继续预载：

- `202606.csv` Amazon Ads 报表
- `UnifiedTransaction-202606.csv` 联合交易报告

Store 02 / Store 03 仍仅为多店铺前端结构预览，没有伪造真实店铺经营数据。

## 当前边界

V9 仍是前端版本：

- 未连接真实 Amazon Ads API OAuth
- 未连接后端数据库
- 不保存 Amazon Refresh Token / Client Secret
- Dayparting 没有真实小时级 API 数据，因此不生成虚假小时绩效
