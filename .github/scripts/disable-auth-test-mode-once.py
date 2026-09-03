from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    'src/worker.js',
    "async function servePrivateSession(request, env) {\n  try {",
    """function authMode(env) {
  return String(env.AUTH_MODE || 'disabled-test').trim().toLowerCase() === 'cloudflare-access'
    ? 'cloudflare-access'
    : 'disabled-test';
}

function authenticationRequired(env) {
  return authMode(env) === 'cloudflare-access';
}

async function servePrivateSession(request, env) {
  if (!authenticationRequired(env)) {
    const response = json({
      authenticated: false,
      authenticationRequired: false,
      authMode: 'disabled-test',
      identity: null,
      storeAuthorization: null,
      amazonApiMode: env.AMAZON_API_MODE || 'disabled',
    });
    return request.method === 'HEAD' ? headResponse(response) : response;
  }

  try {"""
)

replace_once(
    'src/worker.js',
    """    const response = json({
      authenticated: true,
      identity,
      storeAuthorization,
      amazonApiMode: env.AMAZON_API_MODE || 'disabled',
    });""",
    """    const response = json({
      authenticated: true,
      authenticationRequired: true,
      authMode: 'cloudflare-access',
      identity,
      storeAuthorization,
      amazonApiMode: env.AMAZON_API_MODE || 'disabled',
    });"""
)

replace_once(
    'src/worker.js',
    """          dataMode: 'public-test',
          accessAuthConfigured: accessAuthConfigured(env),""",
    """          dataMode: 'public-test',
          authMode: authMode(env),
          authenticationRequired: authenticationRequired(env),
          accessAuthConfigured: accessAuthConfigured(env),"""
)

Path('tests/worker-auth-mode.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

test('private session defaults to explicit disabled-test mode without fabricating identity', async () => {
  const response = await worker.fetch(
    new Request('https://keywordos.test/api/private/session'),
    { AMAZON_API_MODE: 'disabled' }
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, {
    authenticated: false,
    authenticationRequired: false,
    authMode: 'disabled-test',
    identity: null,
    storeAuthorization: null,
    amazonApiMode: 'disabled',
  });
});

test('cloudflare-access mode remains fail-closed when explicitly restored without config', async () => {
  const response = await worker.fetch(
    new Request('https://keywordos.test/api/private/session'),
    { AUTH_MODE: 'cloudflare-access', AMAZON_API_MODE: 'disabled' }
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'access_not_configured' });
});

test('HEAD private session in disabled-test mode returns the same status without a body', async () => {
  const response = await worker.fetch(
    new Request('https://keywordos.test/api/private/session', { method: 'HEAD' }),
    {}
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});
''')

replace_once(
    'README.md',
    '- Cloudflare Access 已配置；登录验收由项目所有者冻结，不能写成已完成的生产登录流程。',
    '- **测试阶段认证关闭（2026-09-03 owner override）**：Cloudflare Access application 与原 owner allow policy 保留，但生产 Access app 启用 `Bypass / Everyone`；Worker 默认 `AUTH_MODE=disabled-test`，不要求邮箱登录，也不伪造 authenticated identity。只有项目所有者再次明确要求恢复登录认证时，才允许移除 bypass 并显式切回 `AUTH_MODE=cloudflare-access`。'
)

replace_once(
    'CURRENT_HANDOFF.md',
    '### Authentication / Cloudflare Access acceptance is FROZEN',
    '### Authentication / Cloudflare Access is TEST-BYPASSED'
)
replace_once(
    'CURRENT_HANDOFF.md',
    'Until the owner explicitly resumes authentication/login verification, do **not**:',
    'Owner override on **2026-09-03**: this is a test project and email login is intentionally disabled. The Cloudflare Access application and original owner allow policy are retained, but an `Everyone` Bypass policy is active; Worker auth defaults to `AUTH_MODE=disabled-test`. Until the owner explicitly asks to restore login authentication, do **not** remove the bypass or switch `AUTH_MODE` back to `cloudflare-access`. Also do **not**:'
)
replace_once(
    'CURRENT_HANDOFF.md',
    'Preserve the existing fail-closed Access/JWT foundation unchanged.',
    'Preserve the existing Access/JWT code, D1 membership schema, and owner allow policy as the dormant restoration foundation; keep enforcement disabled during the owner-authorized test phase.'
)
replace_once(
    'CURRENT_HANDOFF.md',
    '- `/api/private/session` — existing fail-closed canary; do not run auth acceptance while frozen',
    '- `/api/private/session` — defaults to explicit `disabled-test` mode (`authenticated=false`, `authenticationRequired=false`); only `AUTH_MODE=cloudflare-access` reactivates the existing fail-closed JWT path'
)
replace_once(
    'CURRENT_HANDOFF.md',
    'Anonymous runtime smoke may reach the external redirect gate before product HTML/static assets. Do not pursue identity/authentication through that gate while the owner freeze remains active.',
    'Anonymous runtime smoke should now reach product HTML/static assets without an Access email-login redirect because the owner-authorized `Bypass / Everyone` policy is active. Do not treat anonymous access as authenticated identity or authorization.'
)
replace_once(
    'CURRENT_HANDOFF.md',
    '`#17` remains **OPEN** only because authentication/authorization acceptance is intentionally frozen.',
    '`#17` remains **OPEN** because authentication/authorization acceptance is intentionally deferred while the owner-authorized test bypass is active.'
)
replace_once(
    'CURRENT_HANDOFF.md',
    """Cloudflare Access external configuration gate
-> /api/private/session identity acceptance""",
    """remove temporary Cloudflare Access `Bypass / Everyone`
-> set Worker `AUTH_MODE=cloudflare-access`
-> Cloudflare Access external configuration gate
-> /api/private/session identity acceptance"""
)

replace_once(
    'CLOUDFLARE_ARCHITECTURE.md',
    '- **Cloudflare Access** — Worker-level application already configured; further login/session acceptance frozen by owner',
    '- **Cloudflare Access** — Worker-level application and original owner allow policy retained; owner-authorized `Bypass / Everyone` is active for the current test phase, so email login enforcement is disabled until explicitly restored'
)
replace_once(
    'CLOUDFLARE_ARCHITECTURE.md',
    '- `/api/private/session` — existing fail-closed Access canary; do not run login acceptance while frozen',
    '- `/api/private/session` — explicit test-mode session status by default; the existing fail-closed Access/JWT canary is used only when `AUTH_MODE=cloudflare-access` is explicitly restored'
)
replace_once(
    'CLOUDFLARE_ARCHITECTURE.md',
    'There is no anonymous POST/PUT/PATCH/DELETE business endpoint. The prepared persistence pipeline is intentionally not wired to a mutable runtime route while authentication is frozen.',
    'There is no anonymous POST/PUT/PATCH/DELETE business endpoint. The prepared persistence pipeline remains intentionally unwired to mutable runtime routes while authentication is disabled for testing.'
)
replace_once(
    'CLOUDFLARE_ARCHITECTURE.md',
    'The owner has explicitly frozen further login/authentication verification until explicitly resumed.',
    'Owner override on **2026-09-03** disables login enforcement for testing: Cloudflare Access keeps the original application/allow policy but adds `Bypass / Everyone`, and Worker auth defaults to `AUTH_MODE=disabled-test`. The dormant Access/JWT foundation remains available for later restoration.'
)
replace_once(
    'CLOUDFLARE_ARCHITECTURE.md',
    'While frozen, do not:',
    'Until the owner explicitly asks to restore authentication, do not remove the bypass or switch Worker auth mode. Also do not:'
)
replace_once(
    'CLOUDFLARE_ARCHITECTURE.md',
    'Preserve the configuration and fail-closed foundation as-is.',
    'Preserve the Access/JWT code, membership schema and owner allow policy as dormant restoration infrastructure; current runtime enforcement remains intentionally bypassed.'
)
replace_once(
    'CLOUDFLARE_ARCHITECTURE.md',
    'These server persistence internals remain unexposed through mutable Worker routes while authentication is frozen.',
    'These server persistence internals remain unexposed through mutable Worker routes while authentication is disabled for testing.'
)

replace_once(
    'P0_DATA_BOUNDARY.md',
    'Status: **PRODUCT COMPLETE / NON-AUTH PERSISTENCE FOUNDATION READY / LOGIN ACCEPTANCE FROZEN**',
    'Status: **PRODUCT COMPLETE / NON-AUTH PERSISTENCE FOUNDATION READY / TEST LOGIN BYPASS ACTIVE**'
)
replace_once(
    'P0_DATA_BOUNDARY.md',
    'Issue #20 is CLOSED / COMPLETED. Issue #17 remains OPEN because the owner has explicitly frozen login/authentication verification until explicitly resumed.',
    'Issue #20 is CLOSED / COMPLETED. Issue #17 remains OPEN because production authentication acceptance is deferred; owner override on 2026-09-03 intentionally disables email login for the current test phase until the owner explicitly asks to restore it.'
)
replace_once(
    'P0_DATA_BOUNDARY.md',
    '- Cloudflare Access: Worker-level Production configuration exists\n- Login/session acceptance: frozen by owner',
    '- Cloudflare Access: Worker-level Production application and original owner allow policy retained; `Bypass / Everyone` active for testing\n- Login/session enforcement: disabled by owner until an explicit restoration request'
)
replace_once(
    'P0_DATA_BOUNDARY.md',
    '- `/api/private/session`: existing fail-closed canary; do not run acceptance while frozen',
    '- `/api/private/session`: defaults to `disabled-test`; the fail-closed Access/JWT path is reactivated only by explicit `AUTH_MODE=cloudflare-access`'
)
replace_once(
    'P0_DATA_BOUNDARY.md',
    '## Existing authentication foundation — preserve but do not continue',
    '## Existing authentication foundation — preserve while test bypass is active'
)
replace_once(
    'P0_DATA_BOUNDARY.md',
    '- owner-only Access allow policy',
    '- owner-only Access allow policy (retained beneath the temporary test bypass)'
)
replace_once(
    'P0_DATA_BOUNDARY.md',
    'While login/authentication is frozen, do not:',
    'While the owner-authorized test bypass is active, do not remove the bypass or re-enable login unless the owner explicitly asks. Also do not:'
)
