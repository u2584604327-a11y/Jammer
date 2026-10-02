import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const forbidden = ['tabs','history','cookies','webRequest','webRequestBlocking','debugger','downloads','nativeMessaging'];

test('uses Manifest V3 with optional cosmetic permissions only', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual([...manifest.permissions].sort(), ['declarativeNetRequest', 'storage'].sort());
  assert.deepEqual(manifest.optional_permissions, ['scripting']);
  assert.deepEqual(
    [...manifest.optional_host_permissions].sort(),
    ['http://*/*', 'https://*/*'].sort()
  );
  for (const permission of forbidden) assert.equal(manifest.permissions.includes(permission), false);
  assert.equal('host_permissions' in manifest, false);
  assert.equal('content_scripts' in manifest, false);
  assert.equal('background' in manifest, false);
});

test('declares base, extended ads, and privacy rulesets and blocks extension network egress', () => {
  assert.deepEqual(manifest.declarative_net_request.rule_resources, [
    { id: 'ads_static', enabled: true, path: 'rules/ads.json' },
    { id: 'ads_extended', enabled: true, path: 'rules/ads-extended.json' },
    { id: 'privacy_static', enabled: true, path: 'rules/privacy.json' }
  ]);
  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/);
});
