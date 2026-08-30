const AUTH_SCHEMA_TABLES = ['access_users', 'store_memberships'];

export class StoreAuthorizationError extends Error {
  constructor(code, status = 403) {
    super(code);
    this.name = 'StoreAuthorizationError';
    this.code = code;
    this.status = status;
  }
}

async function authSchemaReady(env) {
  const placeholders = AUTH_SCHEMA_TABLES.map(() => '?').join(', ');
  const { results = [] } = await env.DB.prepare(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${placeholders})`
  ).bind(...AUTH_SCHEMA_TABLES).all();
  const names = new Set(results.map((row) => row.name));
  return AUTH_SCHEMA_TABLES.every((name) => names.has(name));
}

export async function readStoreMemberships(env, accessSub) {
  if (!accessSub) {
    throw new StoreAuthorizationError('access_subject_missing', 403);
  }

  if (!(await authSchemaReady(env))) {
    return {
      status: 'schema_not_applied',
      memberships: [],
    };
  }

  const { results = [] } = await env.DB.prepare(`
    SELECT store_id, role, status, created_at, updated_at
    FROM store_memberships
    WHERE access_sub = ? AND status = 'active'
    ORDER BY store_id
  `).bind(accessSub).all();

  return {
    status: results.length ? 'authorized' : 'no_membership',
    memberships: results.map((row) => ({
      storeId: row.store_id,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  };
}

export async function requireStoreAuthorization(env, accessSub, storeId, allowedRoles = []) {
  const authorization = await readStoreMemberships(env, accessSub);
  if (authorization.status !== 'authorized') {
    throw new StoreAuthorizationError(authorization.status, 403);
  }

  const membership = authorization.memberships.find((item) => item.storeId === storeId);
  if (!membership) {
    throw new StoreAuthorizationError('store_access_denied', 403);
  }

  if (allowedRoles.length && !allowedRoles.includes(membership.role)) {
    throw new StoreAuthorizationError('store_role_denied', 403);
  }

  return membership;
}
