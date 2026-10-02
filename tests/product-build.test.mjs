import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('product build keeps Jammer ruleset contract and adds optional cosmetic capability', async () => {
  const source = await readFile('scripts/build-product.mjs', 'utf8');

  assert.match(source, /version: '0\.3\.0'/);
  assert.match(source, /id: 'ads_static'/);
  assert.match(source, /rules\/easylist-adservers\.json/);
  assert.match(source, /PROVENANCE\.json/);
  assert.match(source, /THIRD_PARTY_NOTICES\.txt/);
  assert.match(source, /connect-src 'none'/);
  assert.match(source, /optional_permissions: \['scripting'\]/);
  assert.match(source, /optional_host_permissions: \['http:\/\/\*\/\*', 'https:\/\/\*\/\*'\]/);
  assert.doesNotMatch(source, /\n\s*host_permissions:/);
  assert.doesNotMatch(source, /content_scripts/);
});

test('product build does not ship smoke sentinel', async () => {
  const source = await readFile('scripts/build-product.mjs', 'utf8');
  assert.equal(source.includes('smoke-sentinel'), false);
  assert.equal(source.includes('example.com'), false);
});
