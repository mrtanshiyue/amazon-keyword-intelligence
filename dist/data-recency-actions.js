(() => {
  'use strict';

  function validIsoDate(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function latestDateFromRows(rows) {
    const dates = (Array.isArray(rows) ? rows : [])
      .map((row) => String(row?.date || '').trim())
      .filter(validIsoDate)
      .sort();
    return dates.at(-1) || '';
  }

  function datasetRecency(records, kind, rows, storeId = 'store-a') {
    const activeRows = Array.isArray(rows) ? rows : [];
    const rowDate = latestDateFromRows(activeRows);
    const record = (Array.isArray(records) ? records : []).find((item) => {
      if (!item || item.kind !== kind || item.storeId !== storeId) return false;
      if (!['validated', 'migrated'].includes(String(item.validation?.status || '').toLowerCase())) return false;
      if (Number(item.rowCount) !== activeRows.length) return false;
      return validIsoDate(item.coverage?.max) && item.coverage.max === rowDate;
    });
    if (record) return { latestDate: record.coverage.max, origin: 'registry' };
    return { latestDate: rowDate, origin: rowDate ? 'active-rows' : 'missing' };
  }

  function recencyModel(bridge) {
    const source = bridge || {};
    const records = Array.isArray(source.datasetRegistry) ? source.datasetRegistry : [];
    return {
      ads: datasetRecency(records, 'ads', source.adsRows),
      finance: datasetRecency(records, 'finance', source.financeRows)
    };
  }

  function ageDays(latestDate, todayDate) {
    if (!validIsoDate(latestDate) || !validIsoDate(todayDate)) return null;
    const latest = Date.parse(`${latestDate}T00:00:00Z`);
    const today = Date.parse(`${todayDate}T00:00:00Z`);
    return Math.round((today - latest) / 86400000);
  }

  function formatRecency(latestDate, todayDate) {
    const age = ageDays(latestDate, todayDate);
    if (age == null) return 'date unavailable';
    if (age === 0) return `${latestDate} · latest row is today`;
    if (age > 0) return `${latestDate} · ${age} day${age === 1 ? '' : 's'} behind today`;
    const ahead = Math.abs(age);
    return `${latestDate} · ${ahead} day${ahead === 1 ? '' : 's'} ahead of today · review source date`;
  }

  function localTodayIso(now = new Date()) {
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function dataHealthRecencyText(model, todayDate) {
    const data = model || { ads: {}, finance: {} };
    return `Amazon Ads ${formatRecency(data.ads?.latestDate, todayDate)} · Unified Transaction ${formatRecency(data.finance?.latestDate, todayDate)}`;
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.KeywordOSDataRecencyTest = {
      validIsoDate,
      latestDateFromRows,
      datasetRecency,
      recencyModel,
      ageDays,
      formatRecency,
      dataHealthRecencyText
    };
  }

  if (typeof document === 'undefined') return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function pageTitle() {
    return ($('#page-title')?.textContent || '').trim();
  }

  function currentRecencyModel() {
    return recencyModel(window.KeywordOSUIBridge);
  }

  function clarifyReadiness() {
    $$('.readiness > div').forEach((row) => {
      const label = $('span', row)?.textContent.trim();
      const value = $('b', row);
      if (!value || !['Advertising analytics', 'Finance analytics'].includes(label)) return;
      if (value.textContent.trim() === 'Ready') value.textContent = 'Ready for loaded period';
    });
  }

  function enhanceDataHealth() {
    if (pageTitle() !== 'Data Health') return;
    const healthGrid = $('.health-grid');
    if (!healthGrid) return;

    const today = localTodayIso();
    const model = currentRecencyModel();
    let notice = $('#keywordos-data-recency');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'keywordos-data-recency';
      notice.className = 'notice-banner top-gap';
      healthGrid.insertAdjacentElement('afterend', notice);
    }
    notice.innerHTML = `<b>Loaded data recency:</b> ${dataHealthRecencyText(model, today)}<br><span>Recency is derived from the active Store 01 data model. Analytics remains scoped to the dates actually loaded and does not imply live Amazon synchronization.</span>`;
    clarifyReadiness();
  }

  function enhanceSyncCenter() {
    if (pageTitle() !== 'Sync Center') return;
    const today = localTodayIso();
    const model = currentRecencyModel();
    const latestByName = new Map([
      ['Amazon Ads dataset', model.ads.latestDate],
      ['Unified Transaction dataset', model.finance.latestDate]
    ]);
    $$('.data-table tbody tr').forEach((row) => {
      const name = row.cells?.[0]?.textContent.trim() || '';
      if (!latestByName.has(name)) return;
      const coverageCell = row.cells?.[3];
      if (!coverageCell) return;
      coverageCell.title = `Loaded data recency: ${formatRecency(latestByName.get(name), today)}`;
    });
  }

  let pending = false;
  function refresh() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      enhanceDataHealth();
      enhanceSyncCenter();
    });
  }

  function start() {
    refresh();
    const content = $('#content');
    if (content) new MutationObserver(refresh).observe(content, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();