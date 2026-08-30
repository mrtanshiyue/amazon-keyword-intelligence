# KeywordOS V5 redesign

## Design direction

V5 is a full rewrite rather than a skin change. It follows the interaction grammar used by mature Amazon advertising SaaS products: persistent left navigation, profile/date context, metric-first overview, drill-down tables, saved filters, customizable columns, bulk operations, decision rules and audit history.

## H10-inspired interaction patterns implemented

- Account-level overview before operational tables
- Ad Manager campaign hierarchy: Campaign → Ad Group → Target → Search Term
- Analytics level switching without leaving the workspace
- Show Filters panel with dimensional + metric min/max filters
- Filter Library and saved presets shared between Ad Manager and Analytics
- Column visibility and reordering controls
- Sticky data table headers/first column, sorting, pagination and bulk-selection bar
- Rules views: Apply Rules / Bid / Keyword Harvest / Negative Targeting / Budget
- Change Log separated from Action Center
- Cerebro-style Find Suggestions / Analyze Keywords modes
- Cerebro Keyword Distribution and Word Frequency panels
- Keyword Tracker integrated as a performance workflow

## KeywordOS-specific controls retained

- Protected keyword layer
- Cross-product Conflict Guard
- Negative actions are scoped and staged, not applied globally by default
- All write-like operations land in Action Center first
- Amazon report metrics are used as-is; Search Volume / Organic Rank are not fabricated

## 202606.csv adapter validation

- Rows: 8,753
- Source fields: 45
- Recognized fields: 45 / 45
- Campaigns: 63
- Ad groups: 51
- Unique search terms: 4,973
- Spend: $13,571.98
- Sales: $30,544.84
- Orders: 1,562

The report is preloaded into V5 through `seed-data.js`, and the original CSV is also included under `sample-data/202606.csv` for import testing.
