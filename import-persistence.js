(() => {
  'use strict';

  const DB_NAME = 'keywordos-local-data';
  const DB_VERSION = 1;
  const STORE = 'datasets';

  let dbPromise = null;
  let pendingAds = null;
  let pendingFinance = null;
  const metadata = { ads: null, finance: null };

  function openDb() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB unavailable'));
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open IndexedDB'));
    });
    return dbPromise;
  }

  async function getDataset(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error(`Unable to read ${id}`));
    });
  }

  async function putDataset(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(record);
      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error || new Error(`Unable to persist ${record.id}`));
    });
  }

  async function deleteDataset(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error(`Unable to reset ${id}`));
    });
  }

  function adsSummary(rows) {
    let impressions = 0;
    let clicks = 0;
    let spend = 0;
    let orders = 0;
    let sales = 0;
    let units = 0;
    const campaigns = new Set();
    const searchTerms = new Set();
    const dates = [];

    for (const row of rows) {
      impressions += Number(row.impressions || 0);
      clicks += Number(row.clicks || 0);
      spend += Number(row.spend || 0);
      orders += Number(row.orders || 0);
      sales += Number(row.sales || 0);
      units += Number(row.units || 0);
      if (row.campaign) campaigns.add(row.campaign);
      if (row.searchTerm) searchTerms.add(row.searchTerm);
      if (row.date) dates.push(row.date);
    }

    dates.sort();
    return {
      rows: rows.length,
      impressions,
      clicks,
      spend,
      orders,
      sales,
      units,
      campaigns: campaigns.size,
      searchTerms: searchTerms.size,
      ctr: impressions ? clicks / impressions : 0,
      cvr: clicks ? orders / clicks : 0,
      acos: sales ? spend / sales : null,
      roas: spend ? sales / spend : 0,
      cpc: clicks ? spend / clicks : 0,
      cpa: orders ? spend / orders : null,
      dateMin: dates[0] || '',
      dateMax: dates.at(-1) || '',
    };
  }

  function adsSearchTerms(rows) {
    const map = new Map();
    for (const row of rows) {
      const term = String(row.searchTerm || '').trim();
      if (!term) continue;
      if (!map.has(term)) map.set(term, { term, clicks: 0, orders: 0, spend: 0, sales: 0 });
      const item = map.get(term);
      item.clicks += Number(row.clicks || 0);
      item.orders += Number(row.orders || 0);
      item.spend += Number(row.spend || 0);
      item.sales += Number(row.sales || 0);
    }
    return [...map.values()].sort((a, b) => b.orders - a.orders || b.sales - a.sales);
  }

  function normalizeAdsAnalysis(analysis) {
    return analysis.rows.map((row) => ({
      date: row.date,
      account: row.accountName,
      portfolio: row.portfolioName,
      campaign: row.campaignName,
      campaignId: row.campaignId,
      adGroup: row.adGroupName,
      target: row.target,
      searchTerm: row.searchTerm,
      matchType: row.matchType,
      targetClass: row.targetClass,
      status: row.targetStatus,
      product: row.productCode || 'UNASSIGNED',
      bid: row.bid,
      impressions: row.impressions,
      clicks: row.clicks,
      spend: row.cost,
      orders: row.orders,
      sales: row.sales,
      units: row.units,
    }));
  }

  function readFileText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error(`Unable to read ${file.name}`));
      reader.readAsText(file, 'utf-8');
    });
  }

  async function prepareAds(file) {
    const text = await readFileText(file);
    const analysis = window.ReportAdapter.analyzeText(text);
    return {
      id: 'ads',
      fileName: file.name,
      importedAt: new Date().toISOString(),
      rows: normalizeAdsAnalysis(analysis),
    };
  }

  async function prepareFinance(file) {
    const text = await readFileText(file);
    const analysis = window.UnifiedReportAdapter.analyzeText(text);
    return {
      id: 'finance',
      fileName: file.name,
      importedAt: new Date().toISOString(),
      rows: analysis.rows,
    };
  }

  async function hydrate() {
    let ads = null;
    let finance = null;
    try {
      [ads, finance] = await Promise.all([getDataset('ads'), getDataset('finance')]);
    } catch (error) {
      console.warn('KeywordOS local datasets unavailable; continuing with R2 baseline', error);
      return;
    }

    if (ads?.rows?.length) {
      const baseline = window.KEYWORDOS_SEED || {};
      window.KEYWORDOS_SEED = {
        ...baseline,
        rows: ads.rows,
        summary: adsSummary(ads.rows),
        searchTerms: adsSearchTerms(ads.rows),
        meta: { ...(baseline.meta || {}), source: ads.fileName, localPersisted: true, importedAt: ads.importedAt },
      };
      metadata.ads = { fileName: ads.fileName, importedAt: ads.importedAt, rows: ads.rows.length };
    }

    if (finance?.rows?.length) {
      const baseline = window.KEYWORDOS_UNIFIED_SEED || {};
      window.KEYWORDOS_UNIFIED_SEED = {
        ...baseline,
        rows: finance.rows,
        meta: { ...(baseline.meta || {}), source: finance.fileName, localPersisted: true, importedAt: finance.importedAt },
      };
      metadata.finance = { fileName: finance.fileName, importedAt: finance.importedAt, rows: finance.rows.length };
    }
  }

  function formatTime(value) {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }

  function ensureBanner(kind) {
    const info = metadata[kind];
    if (!info) return;

    const isAds = kind === 'ads';
    const correctPage = isAds
      ? ($('#page-title')?.textContent || '').trim() === 'Import Center'
      : ($('#page-title')?.textContent || '').trim() === 'Unified Transaction Analytics';
    if (!correctPage) return;

    const id = `persisted-${kind}-banner`;
    let banner = document.getElementById(id);
    if (!banner) {
      banner = document.createElement('div');
      banner.id = id;
      banner.className = 'notice-banner';
      banner.style.marginBottom = '10px';
      const anchor = isAds ? document.querySelector('#content .stepper') : document.querySelector('#content .finance-topline');
      if (anchor) anchor.insertAdjacentElement('afterend', banner);
      else document.querySelector('#content')?.prepend(banner);
    }

    const stamp = `${info.fileName}|${info.importedAt}|${info.rows}`;
    if (banner.dataset.stamp === stamp) return;
    banner.dataset.stamp = stamp;
    banner.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><b>Local persisted import active</b><br><span>${info.fileName} · ${Number(info.rows).toLocaleString()} rows · ${formatTime(info.importedAt)}</span></div><button class="btn secondary sm" data-reset-local-dataset="${kind}">Reset to R2 Baseline</button></div>`;
  }

  function renderPersistenceStatus() {
    ensureBanner('ads');
    ensureBanner('finance');
  }

  async function persistPending(kind, pendingPromise) {
    if (!pendingPromise) return;
    try {
      const record = await pendingPromise;
      await putDataset(record);
      metadata[kind] = { fileName: record.fileName, importedAt: record.importedAt, rows: record.rows.length };
      renderPersistenceStatus();
    } catch (error) {
      console.error(`Unable to persist ${kind} import`, error);
    }
  }

  function captureFile(file, kind) {
    if (!file) return;
    if (kind === 'ads') pendingAds = prepareAds(file);
    else pendingFinance = prepareFinance(file);
  }

  function attach() {
    document.addEventListener('change', (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      const file = input.files?.[0];
      if (!file) return;
      if (input.id === 'hidden-file') captureFile(file, 'ads');
      if (input.id === 'hidden-unified-file') captureFile(file, 'finance');
    }, true);

    document.addEventListener('drop', (event) => {
      const target = event.target instanceof Element ? event.target.closest('#dropzone') : null;
      if (!target) return;
      captureFile(event.dataTransfer?.files?.[0], 'ads');
    }, true);

    document.addEventListener('click', (event) => {
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (!button) return;

      if (button.id === 'commit-import') {
        const pending = pendingAds;
        setTimeout(() => persistPending('ads', pending), 0);
        return;
      }

      if (button.closest('#modal-root') && button.textContent.trim() === 'Import & Replace') {
        const pending = pendingFinance;
        setTimeout(() => persistPending('finance', pending), 0);
        return;
      }

      const reset = button.dataset.resetLocalDataset;
      if (reset === 'ads' || reset === 'finance') {
        event.preventDefault();
        event.stopImmediatePropagation();
        deleteDataset(reset)
          .then(() => location.reload())
          .catch((error) => console.error(`Unable to reset ${reset} dataset`, error));
      }
    }, true);

    const content = document.querySelector('#content');
    if (content) {
      const observer = new MutationObserver(() => renderPersistenceStatus());
      observer.observe(content, { childList: true, subtree: true });
    }
    renderPersistenceStatus();
  }

  window.KeywordOSImportPersistence = {
    hydrate,
    attach,
    metadata,
  };
})();
