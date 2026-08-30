import { createRemoteJWKSet, jwtVerify } from 'jose';

const jwksByTeamDomain = new Map();

export class AccessAuthError extends Error {
  constructor(code, status = 403) {
    super(code);
    this.name = 'AccessAuthError';
    this.code = code;
    this.status = status;
  }
}

function normalizeTeamDomain(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  return raw.startsWith('https://') ? raw : `https://${raw}`;
}

export function accessAuthConfigured(env) {
  return Boolean(normalizeTeamDomain(env.ACCESS_TEAM_DOMAIN) && String(env.ACCESS_POLICY_AUD || '').trim());
}

function getJwks(teamDomain) {
  if (!jwksByTeamDomain.has(teamDomain)) {
    jwksByTeamDomain.set(
      teamDomain,
      createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`))
    );
  }
  return jwksByTeamDomain.get(teamDomain);
}

export async function verifyAccessRequest(request, env) {
  const teamDomain = normalizeTeamDomain(env.ACCESS_TEAM_DOMAIN);
  const audience = String(env.ACCESS_POLICY_AUD || '').trim();

  if (!teamDomain || !audience) {
    throw new AccessAuthError('access_not_configured', 503);
  }

  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) {
    throw new AccessAuthError('access_token_missing', 401);
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(teamDomain), {
      issuer: teamDomain,
      audience,
      algorithms: ['RS256'],
    });

    if (!payload.sub) {
      throw new AccessAuthError('access_subject_missing', 403);
    }

    return {
      sub: String(payload.sub),
      email: payload.email ? String(payload.email).toLowerCase() : null,
      name: payload.name ? String(payload.name) : null,
      issuedAt: payload.iat || null,
      expiresAt: payload.exp || null,
    };
  } catch (error) {
    if (error instanceof AccessAuthError) throw error;
    console.error('Cloudflare Access JWT verification failed', error);
    throw new AccessAuthError('access_token_invalid', 403);
  }
}
