const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

const SEED_ASSETS = [
  { sourceKey: 'ads-202606', path: '/seed-data.js', r2Key: 'seed/seed-data.js' },
  { sourceKey: 'unified-202606', path: '/unified-seed-data.js', r2Key: 'seed/unified-seed-data.js' },
];

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

async function readManifest(env) {
  const { results = [] } = await env.DB.prepare(`
    SELECT source_key, store_id, kind, source_file, row_count, byte_size,
           source_commit, r2_key, status, imported_at
    FROM data_sources
    ORDER BY source_key
  `).all();
  return results;
}

async function readMeta(env) {
  const { results = [] } = await env.DB.prepare(
    'SELECT key, value, updated_at FROM deployment_meta ORDER BY key'
  ).all();
  return Object.fromEntries(results.map((row) => [row.key, row.value]));
}

async function r2Status(env) {
  return Promise.all(SEED_ASSETS.map(async (item) => {
    const object = await env.DATA.head(item.r2Key);
    return {
      key: item.r2Key,
      present: Boolean(object),
      size: object?.size || 0,
      uploaded: object?.uploaded || null,
    };
  }));
}

async function archiveAsset(request, env, item) {
  const existing = await env.DATA.head(item.r2Key);
  if (existing) return;

  const assetUrl = new URL(item.path, request.url);
  const asset = await env.ASSETS.fetch(new Request(assetUrl, { method: 'GET' }));
  if (!asset.ok || !asset.body) {
    throw new Error(`Unable to archive ${item.path}: HTTP ${asset.status}`);
  }

  await env.DATA.put(item.r2Key, asset.body, {
    httpMetadata: { contentType: 'application/javascript; charset=utf-8' },
    customMetadata: { source: 'workers-static-assets', sourceKey: item.sourceKey },
  });

  await env.DB.prepare(
    "UPDATE data_sources SET status = 'archived', imported_at = CURRENT_TIMESTAMP WHERE source_key = ?"
  ).bind(item.sourceKey).run();
}

async function ensureSeedArchive(request, env) {
  for (const item of SEED_ASSETS) {
    await archiveAsset(request, env, item);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({ error: 'method_not_allowed' }, { status: 405, headers: { allow: 'GET, HEAD' } });
    }

    if (url.pathname === '/api/health') {
      try {
        const [meta, sources, objects] = await Promise.all([
          readMeta(env),
          readManifest(env),
          r2Status(env),
        ]);
        if (objects.some((object) => !object.present)) {
          ctx.waitUntil(ensureSeedArchive(request, env).catch((error) => console.error('seed archive failed', error)));
        }
        return json({
          status: 'ok',
          service: 'amazon-keyword-intelligence',
          environment: env.APP_ENV || 'production',
          amazonApiMode: env.AMAZON_API_MODE || 'disabled',
          architecture: meta.architecture || 'workers-static-assets+d1+r2',
          schemaVersion: meta.schema_version || '1',
          sourceCommit: meta.source_commit || null,
          sources: sources.length,
          r2: objects,
        });
      } catch (error) {
        console.error('health check failed', error);
        return json({ status: 'degraded', error: 'binding_check_failed' }, { status: 503 });
      }
    }

    if (url.pathname === '/api/data/manifest') {
      try {
        const [meta, sources, objects] = await Promise.all([
          readMeta(env),
          readManifest(env),
          r2Status(env),
        ]);
        return json({ meta, sources, r2: objects });
      } catch (error) {
        console.error('manifest failed', error);
        return json({ error: 'manifest_unavailable' }, { status: 503 });
      }
    }

    return json({ error: 'not_found' }, { status: 404 });
  },
};
