import { createRemoteJWKSet, jwtVerify } from 'jose';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

const DATA_OBJECTS = {
  '/api/data/seed.js': 'seed/seed-data.js',
  '/api/data/unified-seed.js': 'seed/unified-seed-data.js',
};

const jwksCache = new Map();

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers || {}) },
  });
}

function accessConfig(env) {
  const teamDomain = String(env.TEAM_DOMAIN || '').replace(/\/+$/, '');
  const audience = String(env.POLICY_AUD || '').trim();
  return { teamDomain, audience, configured: Boolean(teamDomain && audience) };
}

function getAccessJwks(teamDomain) {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

async function requireAccess(request, env) {
  const { teamDomain, audience, configured } = accessConfig(env);
  if (!configured) {
    return { ok: false, response: json({ error: 'access_not_configured' }, { status: 503 }) };
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) {
    return { ok: false, response: json({ error: 'access_required' }, { status: 401 }) };
  }

  try {
    await jwtVerify(token, getAccessJwks(teamDomain), {
      issuer: teamDomain,
      audience,
    });
    return { ok: true };
  } catch (error) {
    console.warn('access jwt validation failed', error?.code || error?.message || error);
    return { ok: false, response: json({ error: 'access_denied' }, { status: 401 }) };
  }
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
  return Promise.all(Object.values(DATA_OBJECTS).map(async (key) => {
    const object = await env.DATA.head(key);
    return {
      key,
      present: Boolean(object),
      size: object?.size || 0,
      uploaded: object?.uploaded || null,
    };
  }));
}

async function serveProtectedData(request, env, key) {
  const auth = await requireAccess(request, env);
  if (!auth.ok) return auth.response;

  const object = await env.DATA.get(key);
  if (!object) {
    return json({ error: 'data_object_not_found' }, { status: 404 });
  }

  const headers = new Headers({
    'content-type': 'application/javascript; charset=utf-8',
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'x-keywordos-data-mode': 'access-protected',
  });
  if (object.httpEtag) headers.set('etag', object.httpEtag);

  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json(
        { error: 'method_not_allowed' },
        { status: 405, headers: { allow: 'GET, HEAD' } }
      );
    }

    if (url.pathname === '/api/health') {
      try {
        const [meta, sources, objects] = await Promise.all([
          readMeta(env),
          readManifest(env),
          r2Status(env),
        ]);
        const protectedDataReady = objects.every((object) => object.present);
        const { configured: accessConfigured } = accessConfig(env);
        return json({
          status: protectedDataReady ? 'ok' : 'degraded',
          service: 'amazon-keyword-intelligence',
          environment: env.APP_ENV || 'production',
          amazonApiMode: env.AMAZON_API_MODE || 'disabled',
          architecture: meta.architecture || 'workers-static-assets+d1+r2',
          schemaVersion: meta.schema_version || '1',
          sourceCommit: meta.source_commit || null,
          sources: sources.length,
          protectedDataReady,
          accessConfigured,
          dataMode: 'access-protected',
        });
      } catch (error) {
        console.error('health check failed', error);
        return json({ status: 'degraded', error: 'binding_check_failed' }, { status: 503 });
      }
    }

    if (url.pathname === '/api/data/manifest') {
      const auth = await requireAccess(request, env);
      if (!auth.ok) return auth.response;
      try {
        const [meta, sources, objects] = await Promise.all([
          readMeta(env),
          readManifest(env),
          r2Status(env),
        ]);
        return json({ meta, sources, r2: objects, dataMode: 'access-protected' });
      } catch (error) {
        console.error('manifest failed', error);
        return json({ error: 'manifest_unavailable' }, { status: 503 });
      }
    }

    const dataKey = DATA_OBJECTS[url.pathname];
    if (dataKey) {
      return serveProtectedData(request, env, dataKey);
    }

    return json({ error: 'not_found' }, { status: 404 });
  },
};
