(() => {
  'use strict';

  function extractLatestDate(value) {
    const dates = String(value || '').match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
    return dates.at(-1) || '';
  }

  function validIsoDate(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
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

  if (typeof globalThis !== 'undefined') {
    globalThis.KeywordOSDataRecencyTest = { extractLatestDate, validIsoDate, ageDays, formatRecency };
  }

  if (typeof document === 'undefined') return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function pageTitle() {
    return ($('#page-title')?.textContent || '').trim();
  }

  function coverageDate(label) {
    const row = $$('.schema-list p').find((item) => $('b', item)?.textContent.trim() === label);
    return extractLatestDate($('span', row)?.textContent || '');
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
    const adsDate = coverageDate('Ads date coverage');
    const financeDate = coverageDate('Finance date coverage');
    const healthGrid = $('.health-grid');
    if (!healthGrid || $('#keywordos-data-recency')) return;

    const today = localTodayIso();
    const notice = document.createElement('div');
    notice.id = 'keywordos-data-recency';
    notice.className = 'notice-banner top-gap';
    notice.innerHTML = `<b>Loaded data recency:</b> Amazon Ads ${formatRecency(adsDate, today)} · Unified Transaction ${formatRecency(financeDate, today)}<br><span>Recency is informational. Analytics remains scoped to the dates actually loaded and does not imply live Amazon synchronization.</span>`;
    healthGrid.insertAdjacentElement('afterend', notice);
    clarifyReadiness();
  }

  function enhanceSyncCenter() {
    if (pageTitle() !== 'Sync Center') return;
    const today = localTodayIso();
    $$('.data-table tbody tr').forEach((row) => {
      const name = row.cells?.[0]?.textContent.trim() || '';
      if (!['Amazon Ads dataset', 'Unified Transaction dataset'].includes(name)) return;
      const coverageCell = row.cells?.[3];
      if (!coverageCell) return;
      const latest = extractLatestDate(coverageCell.textContent);
      coverageCell.title = `Loaded data recency: ${formatRecency(latest, today)}`;
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