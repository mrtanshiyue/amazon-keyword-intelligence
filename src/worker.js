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

function normalizeTeamDomain(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function getRemoteJwks(teamDomain) {
  if (!jwksCache.has(teamDomain)) {
    jwksCache.set(
      teamDomain,
      createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`))
    );
  }
  return jwksCache.get(teamDomain);
}

async function verifyAccess(request, env) {
  const teamDomain = normalizeTeamDomain(env.TEAM_DOMAIN);
  const audience = String(env.POLICY_AUD || '').trim();

  if (!teamDomain || !audience) {
    return { ok: false, status: 503, error: 'access_not_configured' };
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) {
    return { ok: false, status: 403, error: 'access_token_required' };
  }

  try {
    const { payload } = await jwtVerify(token, getRemoteJwks(teamDomain), {
      issuer: teamDomain,
      audience,
    });
    return { ok: true, identity: payload };
  } catch (error) {
    console.error('Cloudflare Access JWT validation failed', error);
    return { ok: false, status: 403, error: 'access_token_invalid' };
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
  const access = await verifyAccess(request, env);
  if (!access.ok) {
    return json({ error: access.error }, { status: access.status });
  }

  const object = await env.DATA.get(key);
  if (!object) {
    return json({ error: 'data_object_not_found' }, { status: 404 });
  }

  const headers = new Headers({
    'content-type': 'application/javascript; charset=utf-8',
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
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
        return json({
          status: objects.every((object) => object.present) ? 'ok' : 'degraded',
          service: 'amazon-keyword-intelligence',
          environment: env.APP_ENV || 'production',
          amazonApiMode: env.AMAZON_API_MODE || 'disabled',
          architecture: meta.architecture || 'workers-static-assets+d1+r2',
          schemaVersion: meta.schema_version || '1',
          sourceCommit: meta.source_commit || null,
          sources: sources.length,
          protectedDataReady: objects.every((object) => object.present),
          accessConfigured: Boolean(env.TEAM_DOMAIN && env.POLICY_AUD),
        });
      } catch (error) {
        console.error('health check failed', error);
        return json({ status: 'degraded', error: 'binding_check_failed' }, { status: 503 });
      }
    }

    if (url.pathname === '/api/data/manifest') {
      const access = await verifyAccess(request, env);
      if (!access.ok) {
        return json({ error: access.error }, { status: access.status });
      }
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

    const dataKey = DATA_OBJECTS[url.pathname];
    if (dataKey) {
      return serveProtectedData(request, env, dataKey);
    }

    return json({ error: 'not_found' }, { status: 404 });
  },
};
