import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('P3.3 fixture isolates urlFilter vs requestDomains behavior without extra privileges', async () => {
  const manifest = JSON.parse(await readFile('fixtures/p33-requestdomains/manifest.json', 'utf8'));
  const urlfilter = JSON.parse(await readFile('fixtures/p33-requestdomains/rules-urlfilter.json', 'utf8'));
  const single = JSON.parse(await readFile('fixtures/p33-requestdomains/rules-requestdomains-single.json', 'utf8'));
  const batch = JSON.parse(await readFile('fixtures/p33-requestdomains/rules.json', 'utf8'));
  const popup = await readFile('fixtures/p33-requestdomains/popup.html', 'utf8');

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '0.0.2');
  assert.deepEqual(manifest.permissions, ['declarativeNetRequest']);
  assert.equal('host_permissions' in manifest, false);
  assert.equal('content_scripts' in manifest, false);
  assert.equal('background' in manifest, false);
  assert.equal(manifest.declarative_net_request.rule_resources.length, 3);
  assert.match(popup, /popup\.js/);

  assert.equal(urlfilter.length, 1);
  assert.equal(urlfilter[0].action.type, 'block');
  assert.equal(urlfilter[0].condition.urlFilter, '||example.com^');
  assert.deepEqual(urlfilter[0].condition.resourceTypes, ['main_frame']);

  assert.equal(single.length, 1);
  assert.deepEqual(single[0].condition.requestDomains, ['example.com']);
  assert.deepEqual(single[0].condition.resourceTypes, ['main_frame']);

  assert.equal(batch.length, 1);
  assert.equal(batch[0].action.type, 'block');
  assert.equal(batch[0].condition.requestDomains.length, 204);
  assert.ok(batch[0].condition.requestDomains.includes('example.com'));
  assert.equal(new Set(batch[0].condition.requestDomains).size, 204);
  assert.deepEqual(batch[0].condition.resourceTypes, ['main_frame']);
});
