import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('product build keeps Jammer ruleset contract and adds optional cosmetic capability', async () => {
  const source = await readFile('scripts/build-product.mjs', 'utf8');

  assert.match(source, /version: '0\.8\.1'/);
  assert.match(source, /id: 'ads_static'/);
  assert.match(source, /id: 'ads_extended'/);
  assert.match(source, /rules\/easylist-network-extended\.json/);
  assert.match(source, /AD_NETWORK_PROVENANCE\.json/);
  assert.match(source, /id: 'privacy_static'/);
  assert.match(source, /rules\/easyprivacy-tracking\.json/);
  assert.match(source, /PRIVACY_PROVENANCE\.json/);
  assert.match(source, /id: 'privacy_static'/);
  assert.match(source, /rules\/easyprivacy-tracking\.json/);
  assert.match(source, /PRIVACY_PROVENANCE\.json/);
  assert.match(source, /rules\/easylist-adservers\.json/);
  assert.match(source, /PROVENANCE\.json/);
  assert.match(source, /THIRD_PARTY_NOTICES\.txt/);
  assert.match(source, /COSMETIC_PROVENANCE\.json/);
  assert.match(source, /cosmetic-easylist\.css/);
  assert.match(source, /cosmetic-canyoublockit\.css/);
  assert.match(source, /cosmetic-canyoublockit-local\.css/);
  assert.match(source, /connect-src 'none'/);
  assert.match(source, /icons\/icon-128\.png/);
  assert.match(source, /default_icon/);
  assert.match(source, /assets\/jammer-cover\.webp/);
  assert.match(source, /content-classifier\.js/);
  assert.match(source, /content-filter\.js/);
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
