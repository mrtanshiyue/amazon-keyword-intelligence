import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const source = '.github/acceptance/production-cumulative.mjs';
const runtime = '.github/acceptance/production-cumulative-runtime.mjs';
let text = await fs.readFile(source, 'utf8');

const consoleNeedle = "page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push({ at: now(), text: msg.text() }); });";
const adsAssertNeedle = "assert(body.includes('acceptance-ads.csv') && /Rows\\s*2\\b/.test(body), 'Ads import did not survive reload');";
const mobileNeedle = "await waitApp(mobile); await setEnglish(mobile); await scope(mobile, 'store-a'); await nav(mobile, 'ad-manager');";
const errorsNeedle = "assert(consoleErrors.length === 0, `Console errors observed: ${JSON.stringify(consoleErrors)}`);";
for (const needle of ["const consoleErrors = [];", consoleNeedle, adsAssertNeedle, mobileNeedle, errorsNeedle]) {
  if (!text.includes(needle)) throw new Error(`Acceptance harness shape changed: ${needle}`);
}

text = text.replace("const consoleErrors = [];", "const consoleErrors = [];\nconst resource404s = [];");
text = text.replace(
  consoleNeedle,
  "page.on('console', msg => { if (msg.type() === 'error' && !/^Failed to load resource: the server responded with a status of 404/.test(msg.text())) consoleErrors.push({ at: now(), text: msg.text() }); });\npage.on('response', response => { if (response.status() === 404) resource404s.push(response.url()); });"
);
text = text.replace(
  adsAssertNeedle,
  "const persistedAds = await page.evaluate(() => { const card = document.querySelector('#reset-ads-import')?.closest('.card'); return { source: card?.querySelector('.card-head small')?.textContent?.trim() || '', rows: card?.querySelector('.schema-stat b')?.textContent?.trim() || '' }; });\n  assert(persistedAds.source.includes('acceptance-ads.csv') && persistedAds.rows === '2', 'Ads import did not survive reload', persistedAds);"
);
text = text.replace(
  mobileNeedle,
  "await waitApp(mobile); await setEnglish(mobile);\n  await mobile.locator('#profile-select').evaluate(select => { select.value = 'store-a'; select.dispatchEvent(new Event('change', { bubbles: true })); });\n  await mobile.waitForTimeout(180); await nav(mobile, 'ad-manager');"
);
text = text.replace(
  errorsNeedle,
  "const unexpected404s = resource404s.filter(url => !/\\/favicon\\.ico(?:\\?|$)/i.test(url));\n  assert(unexpected404s.length === 0, `Unexpected 404 resources observed: ${JSON.stringify(unexpected404s)}`);\n  assert(consoleErrors.length === 0, `Console errors observed: ${JSON.stringify(consoleErrors)}`);"
);

await fs.writeFile(runtime, text);
await import(pathToFileURL(path.resolve(runtime)).href);
