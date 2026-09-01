import { access } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';

const html = await readFile('dist/index.html', 'utf8');
const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map((match) => match[1])
  .filter((asset) => !asset.startsWith('/api/') && !/^(?:https?:|data:|#)/.test(asset));

await Promise.all(assets.map((asset) => access(`dist/${asset.replace(/^\.\//, '')}`)));
