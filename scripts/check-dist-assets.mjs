import { readFile, readdir } from 'node:fs/promises';

const SOURCE_ENTRY = 'index.html';
const DIST_DIR = 'dist';

function referencedLocalAssets(html) {
  return [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((asset) => !asset.startsWith('/api/') && !/^(?:https?:|data:|#)/.test(asset))
    .map((asset) => asset.split(/[?#]/, 1)[0].replace(/^\.\//, '').replace(/^\//, ''))
    .filter(Boolean)
    .map((asset) => {
      if (asset === '..' || asset.startsWith('../') || asset.includes('/../')) {
        throw new Error(`Static asset path escapes the publish root: ${asset}`);
      }
      return asset;
    });
}

async function listFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(`${dir}/${entry.name}`, relative));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`Unsupported publish asset type: ${relative}`);
  }
  return files.sort();
}

const sourceHtml = await readFile(SOURCE_ENTRY, 'utf8');
const expected = [...new Set([SOURCE_ENTRY, ...referencedLocalAssets(sourceHtml)])].sort();
const actual = await listFiles(DIST_DIR);

const expectedSet = new Set(expected);
const actualSet = new Set(actual);
const missing = expected.filter((asset) => !actualSet.has(asset));
const extra = actual.filter((asset) => !expectedSet.has(asset));
if (missing.length || extra.length) {
  throw new Error([
    'Static publish asset closure mismatch.',
    missing.length ? `Missing from dist: ${missing.join(', ')}` : '',
    extra.length ? `Unexpected in dist: ${extra.join(', ')}` : ''
  ].filter(Boolean).join('\n'));
}

const mismatched = [];
for (const asset of expected) {
  const [source, built] = await Promise.all([
    readFile(asset),
    readFile(`${DIST_DIR}/${asset}`)
  ]);
  if (!source.equals(built)) mismatched.push(asset);
}
if (mismatched.length) {
  throw new Error(`Source/dist byte mismatch: ${mismatched.join(', ')}`);
}

const scriptCount = expected.filter((asset) => asset.endsWith('.js')).length;
const stylesheetCount = expected.filter((asset) => asset.endsWith('.css')).length;
console.log(`Static asset closure OK (${scriptCount} script modules + ${stylesheetCount} stylesheets referenced).`);
console.log(`Source/dist byte identity OK (${expected.length} publish files).`);
