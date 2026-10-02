import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('extended EasyList network sources are pinned and runtime updates stay disabled', async () => {
  const meta = JSON.parse(
    await readFile('rules/sources/easylist-network-extended.pinned.json', 'utf8')
  );

  assert.equal(meta.runtimeUpdate, false);
  assert.equal(meta.commit, '3f284f851f6380a25c0f7e2447f2b01b1c8ee2d8');
  assert.equal(meta.expectedTotalRules, 3718);
  assert.deepEqual(
    meta.sources.map((item) => item.expectedAccepted),
    [974, 886, 1858]
  );
});

test('extended compiler supports path, resource, domain and party constraints', async () => {
  const source = await readFile('scripts/prepare-easylist-network-extended.mjs', 'utf8');

  assert.match(source, /urlFilter: pattern/);
  assert.match(source, /domainType = 'thirdParty'/);
  assert.match(source, /domainType = 'firstParty'/);
  assert.match(source, /initiatorDomains/);
  assert.match(source, /excludedInitiatorDomains/);
  assert.match(source, /resourceTypes/);
  assert.match(source, /unsupported-action-modifier/);
  assert.match(source, /expectedTotalRules/);
});

test('normal ad toggle controls base and extended ad rulesets together', async () => {
  const options = await readFile('src/options.ts', 'utf8');
  const popup = await readFile('src/popup.ts', 'utf8');

  assert.equal(
    options.includes('const OPTIONS_ADS_RULESET_IDS = ["ads_static", "ads_extended"] as const;'),
    true
  );
  assert.equal(
    options.includes('for (const id of OPTIONS_ADS_RULESET_IDS) desired.add(id);'),
    true
  );
  assert.equal(
    popup.includes('const POPUP_ADS_RULESET_IDS = ["ads_static", "ads_extended"] as const;'),
    true
  );
  assert.equal(
    popup.includes('for (const id of POPUP_ADS_RULESET_IDS) desired.add(id);'),
    true
  );
});

test('extended ad rules stay separate from privacy/tracker controls', async () => {
  const options = await readFile('src/options.ts', 'utf8');

  assert.match(options, /OPTIONS_PRIVACY_RULESET_ID = "privacy_static"/);
  assert.match(options, /settings.privacyEnabled/);
  assert.match(options, /settings.adsEnabled/);
});

test('development rules include banner/path coverage', async () => {
  const rules = JSON.parse(await readFile('rules/ads-extended.json', 'utf8'));
  assert.ok(rules.some((rule) => rule.condition.urlFilter === '/ads/'));
  assert.ok(rules.some((rule) => rule.condition.urlFilter === 'banner-ad'));
});
