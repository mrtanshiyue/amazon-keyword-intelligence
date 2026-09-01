(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof globalThis !== 'undefined') globalThis.KeywordOSDatasetRegistryTest = api;
  if (root) root.KeywordOSDatasetRegistry = api;
})(typeof window !== 'undefined' ? window : null, function() {
  'use strict';

  const DB_NAME = 'keywordos_v9_workspace';
  const DB_VERSION = 2;
  const STORE_NAME = 'datasets';
  const SCHEMA_VERSION = 2;
  const MAX_DATASET_ROWS = 250000;
  const DATASET_KINDS = Object.freeze([
    'ads', 'finance', 'sqp', 'costs', 'inventory', 'ranks',
    'competitor', 'reviews', 'listing', 'product-master', 'keyword-assets'
  ]);
  const DATASET_KIND_SET = new Set(DATASET_KINDS);

  const text = (value, fallback = '') => String(value ?? fallback).trim();
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(text(value));
  const storeKey = (storeId, kind) => `${text(storeId, 'store-a')}::${text(kind).toLowerCase()}`;

  function coverage(rows) {
    const dates = rows.map((row) => text(row?.date)).filter(validDate).sort();
    return { min: dates[0] || '', max: dates.at(-1) || '', datedRows: dates.length };
  }

  function quickChecksum(rows) {
    let hash = 2166136261;
    const input = JSON.stringify(rows);
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function normalizeRecord(input, { allowLegacy = true } = {}) {
    if (!isRecord(input)) throw new Error('Dataset record must be an object.');
    const kind = text(input.kind || input.datasetKind || input.key).toLowerCase();
    if (!DATASET_KIND_SET.has(kind)) throw new Error(`Unsupported dataset kind: ${kind || 'unknown'}.`);
    const rows = Array.isArray(input.rows) ? input.rows : [];
    if (rows.length > MAX_DATASET_ROWS) throw new Error(`Dataset ${kind} exceeds the browser safety limit.`);
    if (!rows.every(isRecord)) throw new Error(`Dataset ${kind} contains a non-object row.`);
    const storeId = text(input.storeId, 'store-a');
    const importedAt = text(input.importedAt) || new Date().toISOString();
    const source = text(input.source, 'Browser-local import').slice(0, 500);
    const registryKey = storeKey(storeId, kind);
    const validation = isRecord(input.validation)
      ? { status: text(input.validation.status, 'validated'), validator: text(input.validation.validator, 'client import'), message: text(input.validation.message) }
      : { status: text(input.validationStatus, 'validated'), validator: text(input.validator, 'client import'), message: '' };
    const normalized = {
      key: registryKey,
      schemaVersion: SCHEMA_VERSION,
      kind,
      storeId,
      source,
      importedAt,
      rowCount: rows.length,
      coverage: coverage(rows),
      checksum: text(input.checksum) || quickChecksum(rows),
      validation,
      rows
    };
    if (allowLegacy && input.schemaVersion === 1 && input.key === kind) normalized.migratedFrom = 'schema-v1-unscoped';
    return normalized;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open Dataset Registry'));
      request.onblocked = () => reject(new Error('Dataset Registry upgrade blocked'));
    });
  }

  async function transaction(mode, action) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      let result;
      try { result = action(tx.objectStore(STORE_NAME)); } catch (error) { db.close(); reject(error); return; }
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('Dataset Registry transaction failed')); };
      tx.onabort = () => { db.close(); reject(tx.error || new Error('Dataset Registry transaction aborted')); };
    });
  }

  async function save(input) {
    const record = normalizeRecord(input);
    await transaction('readwrite', (store) => store.put(record));
    return clone(record);
  }

  async function get(kind, storeId = 'store-a') {
    const key = storeKey(storeId, kind);
    const value = await new Promise(async (resolve, reject) => {
      try {
        const db = await openDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          if (request.result) return resolve(request.result);
          const legacyRequest = store.get(text(kind).toLowerCase());
          legacyRequest.onsuccess = () => resolve(legacyRequest.result || null);
          legacyRequest.onerror = () => reject(legacyRequest.error || new Error('Dataset Registry legacy read failed'));
        };
        request.onerror = () => reject(request.error || new Error('Dataset Registry read failed'));
        tx.oncomplete = () => db.close();
        tx.onerror = () => { db.close(); reject(tx.error || new Error('Dataset Registry read failed')); };
      } catch (error) { reject(error); }
    });
    if (!value) return null;
    try { return clone(normalizeRecord({ ...value, kind, storeId })); } catch { return null; }
  }

  async function list(storeId = '') {
    const records = await new Promise(async (resolve, reject) => {
      try {
        const db = await openDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error('Dataset Registry list failed'));
        tx.oncomplete = () => db.close();
      } catch (error) { reject(error); }
    });
    const normalized = records.map((record) => { try { return normalizeRecord(record); } catch { return null; } }).filter(Boolean);
    const deduped = new Map();
    for (const record of normalized) deduped.set(record.key, record);
    return [...deduped.values()].filter((record) => !storeId || record.storeId === storeId).sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  }

  async function remove(kind, storeId = 'store-a') {
    const scoped = storeKey(storeId, kind);
    await transaction('readwrite', (store) => { store.delete(scoped); if (storeId === 'store-a') store.delete(text(kind).toLowerCase()); });
  }

  async function replaceAll(records) {
    const normalized = records.map((record) => normalizeRecord(record));
    await transaction('readwrite', (store) => { store.clear(); normalized.forEach((record) => store.put(record)); });
    return normalized.map(clone);
  }

  return { DB_NAME, DB_VERSION, STORE_NAME, SCHEMA_VERSION, MAX_DATASET_ROWS, DATASET_KINDS, storeKey, coverage, quickChecksum, normalizeRecord, save, get, list, remove, replaceAll };
});
