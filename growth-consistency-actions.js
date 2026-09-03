(function(root, factory) {
  const growth = root?.KeywordOSGrowth || (typeof globalThis !== 'undefined' ? globalThis.KeywordOSGrowthTest : null);
  const api = factory(root, growth);
  if (typeof globalThis !== 'undefined') globalThis.KeywordOSGrowthConsistencyTest = api;
  if (root) {
    root.KeywordOSGrowthConsistency = api;
    api.start?.();
  }
})(typeof window !== 'undefined' ? window : null, function(root, growth) {
  'use strict';

  const STORE_ID = 'store-a';
  const LEGACY_KEYS = Object.freeze({
    inventory: 'keywordos_growth_inventory_v1',
    listing: 'keywordos_growth_listing_v1',
    sqp: 'keywordos_growth_sqp_v1'
  });
  const DEFAULT_LISTING_PROFILE = Object.freeze({ marketplace: 'US', titleLimit: 200, searchTermsLimit: 250 });

  function positiveInteger(value, fallback) {
    const raw = String(value ?? '').trim();
    if (!raw) return fallback;
    const number = Number(raw);
    return Number.isInteger(number) && number > 0 ? number : null;
  }

  function listingProfile(draft = {}) {
    const titleLimit = positiveInteger(draft.titleLimit, DEFAULT_LISTING_PROFILE.titleLimit);
    const searchTermsLimit = positiveInteger(draft.searchTermsLimit, DEFAULT_LISTING_PROFILE.searchTermsLimit);
    const available = titleLimit != null && searchTermsLimit != null;
    return {
      available,
      marketplace: String(draft.marketplace || DEFAULT_LISTING_PROFILE.marketplace),
      titleLimit,
      searchTermsLimit,
      reason: available ? '' : 'Title and backend limits must be positive whole numbers.'
    };
  }

  function inventoryRisk(rows = [], adsRows = [], days = 30) {
    const velocities = growth?.productSalesVelocity?.(adsRows, days) || [];
    const byProduct = new Map(velocities.map((row) => [String(row.product || '').trim(), row]));
    return (rows || []).map((row) => {
      const velocity = byProduct.get(String(row.product || '').trim()) || null;
      const dailySales = velocity?.unitsPerDay > 0 ? velocity.unitsPerDay : null;
      const daysCover = dailySales ? (+row.available || 0) / dailySales : null;
      const risk = daysCover == null
        ? 'No sales evidence'
        : daysCover < 14
          ? 'Critical'
          : daysCover < 30
            ? 'Low'
            : (+row.unfulfillable || 0) > 0
              ? 'Damaged'
              : 'Healthy';
      return {
        ...row,
        dailySales,
        daysCover,
        risk,
        observedDays: velocity?.observedDays || 0,
        velocityStart: velocity?.start || null,
        velocityEnd: velocity?.end || null
      };
    }).sort((a, b) => (a.daysCover ?? 99999) - (b.daysCover ?? 99999));
  }

  function normalizedPhrase(value) {
    return String(value || '').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)?.join(' ') || '';
  }

  function listingPlacementSuggestions(fields = {}, evidence = [], brandTerms = '', draft = {}) {
    const profile = listingProfile(draft);
    const brands = new Set(String(brandTerms || '').split(/[\n,]/).map(normalizedPhrase).filter(Boolean));
    const coverage = growth?.listingCoverage?.(fields, evidence.map((item) => item.keyword)) || [];
    const backendBytes = growth?.utf8Bytes?.(fields.searchTerms || '') ?? new TextEncoder().encode(String(fields.searchTerms || '')).length;
    const backendRoom = profile.available && backendBytes < profile.searchTermsLimit;
    return coverage
      .map((item, index) => ({ ...evidence[index], ...item }))
      .filter((item) => !item.used && !brands.has(normalizedPhrase(item.keyword)))
      .slice(0, 12)
      .map((item) => ({
        keyword: item.keyword,
        orders: item.orders,
        purchases: item.purchases,
        volume: item.volume,
        sources: item.sources,
        placement: item.byField?.title?.roots?.length || item.byField?.bullets?.roots?.length
          ? 'Complete phrase in title or bullets'
          : backendRoom
            ? 'Consider backend terms'
            : 'Consider title or bullets'
      }));
  }

  function listingBackendSummary(fields = {}, draft = {}) {
    const profile = listingProfile(draft);
    const used = growth?.utf8Bytes?.(fields.searchTerms || '') ?? new TextEncoder().encode(String(fields.searchTerms || '')).length;
    return {
      profile,
      used,
      limit: profile.available ? profile.searchTermsLimit : null,
      remaining: profile.available ? profile.searchTermsLimit - used : null,
      status: !profile.available ? 'Profile invalid' : used > profile.searchTermsLimit ? 'Over limit' : 'Within profile'
    };
  }

  function riskPriority(rows) {
    return growth?.inventoryPriority?.(rows) || rows;
  }

  function parseLegacyRows(kind) {
    if (!root?.localStorage || !LEGACY_KEYS[kind]) return [];
    try {
      const parsed = JSON.parse(root.localStorage.getItem(LEGACY_KEYS[kind]) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async function datasetRows(kind) {
    try {
      const record = await root?.KeywordOSDatasetRegistry?.get?.(kind, STORE_ID);
      if (Array.isArray(record?.rows)) return record.rows;
    } catch (error) {
      console.warn(`KeywordOS ${kind} consistency read skipped`, error);
    }
    return parseLegacyRows(kind);
  }

  function currentPage() {
    try {
      return decodeURIComponent(root?.location?.hash?.match(/^#page=(.+)$/)?.[1] || '');
    } catch {
      return '';
    }
  }

  function setText(node, value) {
    if (node && node.textContent !== String(value)) node.textContent = String(value);
  }

  function badgeClass(risk) {
    return risk === 'Critical' ? 'red' : risk === 'Low' || risk === 'Damaged' ? 'amber' : risk === 'Healthy' ? 'green' : 'gray';
  }

  function queueBySku(rows) {
    const map = new Map();
    for (const row of rows) {
      const key = String(row.sku || '').trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return map;
  }

  async function applyInventory() {
    const inventoryRows = await datasetRows('inventory');
    if (currentPage() !== 'inventory-risk') return;
    const adsRows = root?.KeywordOSUIBridge?.adsRows || [];
    const rows = riskPriority(inventoryRisk(inventoryRows, adsRows, 30));
    const table = [...document.querySelectorAll('#content table.data-table')].find((candidate) => candidate.tHead?.rows?.[0]?.cells?.length === 10);
    if (!table) return;

    const header = table.tHead.rows[0].cells[6];
    setText(header, 'Observed Daily Sales');
    header.title = '30-day window; units divided by distinct dated Ads report days actually observed for the same product label.';

    const bySku = queueBySku(rows);
    [...table.tBodies[0]?.rows || []].forEach((row) => {
      const sku = row.cells?.[0]?.textContent.trim() || '';
      const model = bySku.get(sku)?.shift();
      if (!model) return;
      setText(row.cells[6], model.dailySales == null ? '—' : model.dailySales.toFixed(1));
      row.cells[6].title = model.observedDays
        ? `${model.observedDays} observed day${model.observedDays === 1 ? '' : 's'} · ${model.velocityStart || '—'} → ${model.velocityEnd || '—'}`
        : 'No dated Ads unit evidence for this product label.';
      setText(row.cells[7], model.daysCover == null ? '—' : model.daysCover.toFixed(1));
      if (row.cells[8]) row.cells[8].innerHTML = `<span class="badge ${badgeClass(model.risk)}">${model.risk}</span>`;
      setText(row.cells[9], model.priority || '');
    });

    const summary = document.querySelector('#content .growth-actions small');
    if (summary) setText(summary, 'Days of cover uses observed 30-day dated Ads unit velocity; action priority is a review order, not a purchase-order recommendation.');
  }

  async function applyAnomalyInventory() {
    const inventoryRows = await datasetRows('inventory');
    if (currentPage() !== 'anomaly-center') return;
    const adsRows = root?.KeywordOSUIBridge?.adsRows || [];
    const rows = riskPriority(inventoryRisk(inventoryRows, adsRows, 30))
      .filter((row) => !['Healthy', 'No sales evidence'].includes(row.risk))
      .slice(0, 10);
    const table = [...document.querySelectorAll('#content table.data-table')].find((candidate) => candidate.tHead?.rows?.[0]?.cells?.length === 4);
    if (!table?.tBodies?.[0]) return;
    [...table.tBodies[0].rows].forEach((row) => {
      if ((row.cells?.[0]?.textContent || '').trim().startsWith('Inventory ')) row.remove();
    });
    for (const item of rows) {
      const row = document.createElement('tr');
      const signal = document.createElement('td');
      signal.className = 'left';
      const strong = document.createElement('b');
      strong.textContent = `Inventory ${item.risk}`;
      signal.appendChild(strong);
      const entity = document.createElement('td');
      entity.className = 'left';
      entity.textContent = item.sku || '—';
      const evidence = document.createElement('td');
      evidence.className = 'left';
      evidence.textContent = item.daysCover == null ? '—' : `${item.daysCover.toFixed(1)} days cover · ${item.observedDays} observed Ads days`;
      const severity = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'badge red';
      badge.textContent = 'High';
      severity.appendChild(badge);
      row.append(signal, entity, evidence, severity);
      table.tBodies[0].appendChild(row);
    }
  }

  async function applyListing() {
    const listingRows = await datasetRows('listing');
    if (currentPage() !== 'listing-optimizer') return;
    const draft = listingRows[0] || {};
    const fields = {
      title: draft.title || '',
      bullets: draft.bullets || '',
      description: draft.description || '',
      searchTerms: draft.searchTerms || ''
    };
    const summary = listingBackendSummary(fields, draft);
    const kpi = [...document.querySelectorAll('#content .growth-kpi')].find((node) => (node.querySelector('small')?.textContent || '').includes('UTF-8'));
    if (kpi) {
      setText(kpi.querySelector('b'), summary.limit == null ? `${summary.used} / —` : `${summary.used} / ${summary.limit}`);
      const small = kpi.querySelector('small');
      if (small) setText(small, summary.profile.available ? `UTF-8 bytes · ${summary.status}` : `UTF-8 bytes · ${summary.profile.reason}`);
    }

    const sqpRows = await datasetRows('sqp');
    if (currentPage() !== 'listing-optimizer') return;
    const evidence = growth?.listingEvidenceTerms?.(growth?.sqpSummary?.(sqpRows) || sqpRows, root?.KeywordOSUIBridge?.adsRows || []) || [];
    const suggestions = listingPlacementSuggestions(fields, evidence, draft.brandTerms || '', draft);
    const byKeyword = new Map(suggestions.map((item) => [String(item.keyword || ''), item]));
    const table = [...document.querySelectorAll('#content table.data-table')].find((candidate) => {
      if (candidate.tHead?.rows?.[0]?.cells?.length !== 3) return false;
      return [...candidate.tBodies?.[0]?.rows || []].some((row) => row.cells?.[2]?.querySelector('small'));
    });
    if (!table?.tBodies?.[0]) return;
    [...table.tBodies[0].rows].forEach((row) => {
      const keyword = row.cells?.[0]?.querySelector('b')?.textContent.trim() || '';
      const model = byKeyword.get(keyword);
      if (!model || !row.cells?.[2]) return;
      const small = row.cells[2].querySelector('small');
      row.cells[2].childNodes[0].textContent = model.placement;
      if (small) small.textContent = 'Confirm relevance manually';
    });
  }

  let revision = 0;
  async function refresh() {
    const ticket = ++revision;
    const page = currentPage();
    if (page === 'inventory-risk') await applyInventory();
    else if (page === 'anomaly-center') await applyAnomalyInventory();
    else if (page === 'listing-optimizer') await applyListing();
    if (ticket !== revision) return;
  }

  function start() {
    if (!root?.document) return;
    const boot = () => {
      const content = document.getElementById('content');
      if (!content) return;
      new MutationObserver(() => { refresh(); }).observe(content, { childList: true });
      refresh();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }

  return {
    DEFAULT_LISTING_PROFILE,
    positiveInteger,
    listingProfile,
    inventoryRisk,
    listingPlacementSuggestions,
    listingBackendSummary,
    start
  };
});
