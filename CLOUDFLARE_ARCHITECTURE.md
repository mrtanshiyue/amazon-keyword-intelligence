# KeywordOS V9 · Cloudflare Native Architecture

## Source baseline

The Cloudflare migration starts from GitHub main commit `382345103b6cad266904530ab3a454990f42adac`.

The existing product is a browser-first V9 application. `index.html` loads the advertising seed, unified-transaction seed, report adapters, i18n layer, styles, and `app.js`. Existing business calculations and the Global read-only / Store execution boundary remain unchanged.

## Production architecture

Cloudflare's current recommendation for new static, SPA, and full-stack projects is Workers Static Assets rather than Pages. KeywordOS therefore uses one Worker deployment unit:

- **Workers Static Assets** — existing HTML/CSS/JS frontend and runtime seed assets.
- **Worker API** — only `/api/*` invokes Worker code first; normal static requests stay on the asset path.
- **D1 (`DB`)** — deployment metadata and registered data-source manifest.
- **R2 (`DATA`)** — private archive for large runtime seed/source objects and future raw report objects.
- **Workers Observability** — enabled in `wrangler.jsonc`.
- **Workers Builds** — GitHub `main` production trigger with Cloudflare-native build/deploy.

This is deliberately a minimal migration: no frontend framework rewrite, no duplicate API service, and no speculative queues/workflows.

## Static asset build

`npm run build` creates `dist/` from an explicit allowlist of the nine runtime files used by V9. Worker source, Wrangler configuration, dependencies, migrations, raw CSVs, samples, and documentation are never part of the static asset bundle.

## Runtime endpoints

- `GET /api/health` — validates D1/R2 bindings and reports deployment/data status. If seed archives are missing, it schedules a streamed copy from Static Assets to private R2 using `waitUntil`.
- `GET /api/data/manifest` — returns D1 data-source metadata plus R2 archive presence.

No unauthenticated mutation endpoint is exposed.

## Data placement

The browser still consumes `seed-data.js` and `unified-seed-data.js` so the existing UI and calculations remain compatible with V9 behavior. Duplicate raw CSV/sample files are not deployed as public static assets.

D1 records the registered data sources. R2 privately archives the deployed runtime seeds without buffering them into Worker memory.

## Security boundary

Amazon Ads API/OAuth remains disabled in this migration. The existing UI may show the future connection workflow, but this deployment does not request, store, or use Amazon refresh tokens, client secrets, or write credentials.

Before any future server-side mutations or Amazon API integration, add authentication/authorization (for example Cloudflare Access or an application session layer) and enforce Store → Connection → Advertiser → Marketplace authorization in the Worker.

## Commands

```bash
npm install
npm run check
npm run build
npm run dev
npm run db:migrate
npm run deploy
```
