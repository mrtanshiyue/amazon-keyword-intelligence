# KeywordOS V9 — H10 UI / Logic Deep Audit

本轮目标不是继续“换颜色”，而是按 H10 当前 Ads + Cerebro 的产品结构重做页面节奏、控件密度和操作流，同时保留 KeywordOS 的多店铺隔离能力。

## 1. 视觉规格基线

V9 统一采用以下桌面工作台规格：

- 左侧主导航：216px
- 顶部全局导航：50px
- 页面标题区：约 84px
- 页面内容左右留白：20px
- 主按钮/下拉框：34px 高
- 次级按钮：27px 高
- 数据表表头：36px
- 数据表行高：39px
- 卡片圆角：4px
- 主要卡片阴影：接近无阴影，仅 1px 边框和极浅层次
- 表格 Header：浅灰 `#f7f9fa`
- H10 风格主蓝：KeywordOS 自有蓝 `#087fc9`
- 导航深蓝：`#0b365a`
- 正文：11.5–14px，关键数字 21–23px

核心原则：高数据密度，但不能回到 V1/V2 那种小字体难读状态。

## 2. Dashboard

对照 H10 Ads Dashboard 的操作逻辑：

- Profile + Marketplace 上下文始终可见
- Date Range 始终在页面上方
- 核心 KPI：Spend / Sales / Total Sales / TACoS / ACoS / ROAS / Clicks / CPC
- KPI 带上一周期比较逻辑
- Advertising Performance 趋势图
- Highest ACoS Campaigns
- Highest Spend Targets
- Campaign Performance

KeywordOS 额外保留 Optimization Queue，用于承接自身的 Conflict Guard 和 Action Center。

## 3. Suggestions

新增 H10 类型 Suggestions 工作台：

- AI Bids
- Bids
- New Keywords
- Negative Keywords
- Budget

每条建议提供：Apply / Remove / Pause 三个动作。

与 H10 不同的是：KeywordOS 的 Apply 不直接写 Amazon，而是先进入 Action Center，符合我们之前确定的执行安全边界。

## 4. Ad Manager

H10 风格核心交互：

- Campaigns / Ad Groups / Targets / Search Terms Tabs
- 点击实体继续下钻
- Drill-down Context 保留
- Filter Library
- Show Filters
- Columns
- Export
- Checkbox 多选
- Bulk Action Bar
- 表格列排序
- Pagination
- Sticky Table Header
- 高 ACoS / 高 CVR 指标颜色提示

KeywordOS 保留：Store → Connection → Advertiser → Marketplace 独立执行边界。

## 5. Analytics

实现：

- Portfolio
- Campaign
- Ad Group
- Target
- Search Term
- Product

增加 H10 类型 Segmentation Toggle：

- Campaign
- Ad Group
- ASINs
- Targets
- Search Term

Portfolio / Campaign 等实体点击后的过滤与下钻上下文继续保留。

## 6. Filter Library

V9 已升级为跨 Ad Manager / Analytics 共用：

- Save Filter Preset
- Apply
- Set as Default
- Remove as Default
- Rename
- Delete

筛选器仍保留 KeywordOS 当前最重要的 PPC 指标：Clicks / Orders / Spend / Sales / ACoS / ROAS Min-Max。

## 7. Columns

继续支持：

- 显示/隐藏列
- 调整列顺序
- 恢复默认列

视觉上改为更轻的 Modal 和更紧凑的列表项。

## 8. Rules & Automation

保持 H10 当前五个工作区：

- Apply Rules
- Bid
- Keyword Harvest
- Negative Targeting
- Budget

KeywordOS 不自动跳过审核；Rule 先生成 Recommendation，再进入 Action Center。

## 9. Change Log

保留：

- Automatic
- Semi-auto
- Manual
- Import

以及：

- Date
- Change Type
- Target
- Campaign
- Change
- Source
- Changed By

用于未来 API 写操作审计。

## 10. Dayparting Schedules

新增：

- Campaign Filter
- Period
- Days Included
- Metric 1 / Metric 2
- 7 × Hour Blocks 热力格
- Create Schedule Modal
- Schedule List

当前广告报表没有小时级数据，所以热力图只展示 UI 工作流，不虚构真实小时绩效；后续 Ads API 小时数据接入后再换成真实数值。

## 11. Cerebro

进一步贴近 H10 当前 Cerebro (Plus Magnet) 的结构：

- Find Suggestions
- Analyze Keywords
- History / Common Words / Learn
- 大型搜索区
- Preset Filters
- Advanced Filters
- Keyword Distribution
- Word Frequency
- Search / Settings / Export Data
- 高密度关键词结果表

当前仍明确不虚构 Search Volume / Organic Rank / Sponsored Rank。等 SQP / Keyword Tracker 数据源接入再增加。

## 12. Learn

每个页面标题区增加 Learn。

Learn 使用右侧 Drawer，不跳离当前页面，从而保持：

- Store Context
- Drill-down Context
- Filters
- Table State

## 13. 多店铺架构不照搬 H10 的部分

H10 的设计重点是一个账户/Marketplace 里的广告管理；KeywordOS 必须额外保持：

- Global = Read Only
- Store = Executable Context
- One Store = One Amazon Connection
- Cross-store analytics only produce recommendations
- Action Center 只能在具体 Store 中执行
- Global Negative 不直接写 Amazon
- Conflict Guard 优先于 Negative Recommendation

因此 V9 是“H10 工作流体验 + KeywordOS 多店铺安全架构”，不是简单复制页面。

## 14. 浏览器 QA

已通过浏览器渲染检查：

- Global Portfolio Overview
- Store Dashboard
- Ad Manager
- Analytics
- Suggestions
- Cerebro
- Dayparting Schedules

检查项：

- JavaScript 页面渲染
- Store 切换
- 8 KPI Dashboard
- Suggestions 五个 Tab
- Analytics 五个 Segmentation Toggle
- Dayparting 7 行小时格
- 中英文组件不破坏布局
- 1600 × 1050 / 1600 × 1100 桌面视口

当前唯一 QA 环境提示是 Playwright `set_content()` 沙盒环境无法使用 localStorage；真实通过 localhost 运行时不受该测试环境限制。
