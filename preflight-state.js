(() => {
  'use strict';

  const SCHEDULES_KEY = 'keywordos_v9_schedules';

  function sanitizeScheduleDrafts(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && item.id !== 'schedule-default');
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.KeywordOSPreflightTest = { sanitizeScheduleDrafts };
  }

  if (typeof localStorage === 'undefined') return;

  try {
    const raw = localStorage.getItem(SCHEDULES_KEY);
    if (raw === null) {
      localStorage.setItem(SCHEDULES_KEY, '[]');
      return;
    }
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeScheduleDrafts(parsed);
    if (!Array.isArray(parsed) || sanitized.length !== parsed.length) {
      localStorage.setItem(SCHEDULES_KEY, JSON.stringify(sanitized));
    }
  } catch {
    // Leave unreadable storage untouched; the application already fails closed to defaults.
  }
})();
