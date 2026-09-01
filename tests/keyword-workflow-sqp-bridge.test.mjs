import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('SQP-only terms are synchronized into the shared keyword workflow', async () => {
  const [app, growth] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../growth-workspaces.js', import.meta.url), 'utf8')
  ]);

  assert.match(app, /function sqpKeywordEvidence\(\)/);
  assert.match(app, /lifecycle:'SQP evidence only'/);
  assert.match(app, /isProtected,toast,syncKeywordAssets/);
  assert.match(growth, /await save\(kind,next,file\.name\);if\(kind==='sqp'\)await root\?\.KeywordOSUIBridge\?\.syncKeywordAssets\?\.\(\)/);
});
