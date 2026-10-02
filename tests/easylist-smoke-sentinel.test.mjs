import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('EasyList smoke sentinel is isolated and deterministic', async () => {
  const sentinel = JSON.parse(
    await readFile('fixtures/easylist-smoke/sentinel.json', 'utf8')
  );

  assert.equal(sentinel.length, 1);
  assert.equal(sentinel[0].action.type, 'block');
  assert.deepEqual(sentinel[0].condition.requestDomains, ['example.com']);
  assert.deepEqual(sentinel[0].condition.resourceTypes, ['main_frame']);
  assert.ok(sentinel[0].id > 0);

  const productManifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  const productResources = productManifest.declarative_net_request.rule_resources.map((item) => item.id);
  assert.equal(productResources.includes('smoke_sentinel'), false);
});
