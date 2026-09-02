(() => {
  'use strict';

  const LEGACY_LISTING_PAGE = 'listing-workspace';
  const CANONICAL_LISTING_PAGE = 'listing-optimizer';

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function aggregateKeywordEvidence(rows) {
    const byTerm = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      const term = String(row?.searchTerm || '').trim();
      if (!term) continue;
      const key = term.toLowerCase();
      const current = byTerm.get(key) || { term, impressions: 0, clicks: 0, orders: 0, spend: 0, sales: 0 };
      current.impressions += number(row.impressions);
      current.clicks += number(row.clicks);
      current.orders += number(row.orders);
      current.spend += number(row.spend ?? row.cost);
      current.sales += number(row.sales);
      byTerm.set(key, current);
    }
    return [...byTerm.values()].map((item) => ({...item,acos:item.sales>0?item.spend/item.sales:null,cvr:item.clicks>0?item.orders/item.clicks:null})).sort((a,b)=>b.orders-a.orders||b.sales-a.sales||b.clicks-a.clicks||a.term.localeCompare(b.term));
  }

  function composeSearchTerms(terms) {
    const seen = new Set(), result = [];
    for (const value of Array.isArray(terms) ? terms : []) {
      const term = String(value || '').trim(), key = term.toLowerCase();
      if (!term || seen.has(key)) continue;
      seen.add(key); result.push(term);
    }
    return result.join(' ');
  }

  function draftStatus(draft) {
    const values = [draft?.title, draft?.bullets, draft?.searchTerms].map((value) => String(value || '').trim());
    const completed = values.filter(Boolean).length;
    return { completed, total: 3, ready: completed === 3 };
  }

  function chooseListingDataset(record, fallbackRows, validateRows) {
    const fallback = Array.isArray(fallbackRows) ? fallbackRows : [];
    if (record?.schemaVersion === 1 && Array.isArray(record.rows) && record.rows.length && typeof validateRows === 'function') {
      const validation = validateRows('ads', record.rows);
      if (validation?.ok) return {rows:record.rows,source:String(record.source||'Browser persisted Ads dataset'),mode:'Browser persisted'};
    }
    return { rows: fallback, source: 'Bundled Ads dataset', mode: 'Bundled fallback' };
  }

  function canonicalListingPage(page) {
    return String(page || '').trim() === LEGACY_LISTING_PAGE ? CANONICAL_LISTING_PAGE : String(page || '').trim();
  }
  function legacyListingUiEnabled() { return false; }

  const api = {LEGACY_LISTING_PAGE,CANONICAL_LISTING_PAGE,aggregateKeywordEvidence,composeSearchTerms,draftStatus,chooseListingDataset,canonicalListingPage,legacyListingUiEnabled};
  if (typeof globalThis !== 'undefined') globalThis.KeywordOSListingWorkspaceTest = api;
})();