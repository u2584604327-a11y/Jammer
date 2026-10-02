import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('P3.3 fixture validates realistic requestDomains bucket size without extra privileges', async () => {
  const manifest = JSON.parse(await readFile('fixtures/p33-requestdomains/manifest.json', 'utf8'));
  const rules = JSON.parse(await readFile('fixtures/p33-requestdomains/rules.json', 'utf8'));

  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['declarativeNetRequest']);
  assert.equal('host_permissions' in manifest, false);
  assert.equal('content_scripts' in manifest, false);
  assert.equal('background' in manifest, false);

  assert.equal(rules.length, 1);
  assert.equal(rules[0].action.type, 'block');
  assert.equal(rules[0].condition.requestDomains.length, 204);
  assert.ok(rules[0].condition.requestDomains.includes('example.com'));
  assert.equal(new Set(rules[0].condition.requestDomains).size, 204);
});
