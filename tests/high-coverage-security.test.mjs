import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('uBlock security sources are pinned and runtime updates stay disabled', async () => {
  const meta = JSON.parse(await readFile('rules/sources/ublock-security.pinned.json', 'utf8'));

  assert.equal(meta.commit, '27d3927bd59fcfde571ecba3621bb78c950dcb9d');
  assert.equal(meta.runtimeUpdate, false);
  assert.equal(meta.expectedTotalRules, 4389);

  const badware = meta.sources.find((item) => item.id === 'badware');
  const abuse = meta.sources.find((item) => item.id === 'resource_abuse');

  assert.equal(badware.expectedAccepted, 4329);
  assert.equal(badware.expectedRejected, 65);
  assert.equal(abuse.expectedAccepted, 60);
  assert.equal(abuse.expectedRejected, 18);
});

test('security compiler covers document and abusive-script request types without proxy APIs', async () => {
  const source = await readFile('scripts/prepare-ublock-security.mjs', 'utf8');

  assert.match(source, /doc: 'main_frame'/);
  assert.match(source, /script: 'script'/);
  assert.match(source, /xhr: 'xmlhttprequest'/);
  assert.match(source, /action: \{ type: 'block' \}/);
  assert.match(source, /expectedGitBlobSha1/);

  for (const forbidden of ['webRequestBlocking', 'nativeMessaging', 'proxy']) {
    assert.equal(source.includes(forbidden), false);
  }
});

test('security ruleset is independently controllable in popup and options', async () => {
  const config = await readFile('src/core/config.ts', 'utf8');
  const options = await readFile('src/options.ts', 'utf8');
  const popup = await readFile('src/popup.ts', 'utf8');

  assert.match(config, /securityEnabled:\s*true/);
  assert.match(options, /OPTIONS_SECURITY_RULESET_ID = "security_static"/);
  assert.match(popup, /POPUP_SECURITY_RULESET_ID = "security_static"/);
  assert.match(options, /settings\.securityEnabled/);
  assert.match(popup, /settings\.securityEnabled/);
});

test('stubborn-banner heuristic stays local and requires multiple ad signals', async () => {
  const source = await readFile('src/ad-element-filter.ts', 'utf8');

  assert.match(source, /JAMMER_AD_MARKER_RE/);
  assert.match(source, /JAMMER_AD_URL_RE/);
  assert.match(source, /jammerAdDomainListed/);
  assert.match(source, /dimensions\.aspect >= 2\.2/);
  assert.match(source, /jammerAdDenseBannerStrip/);
  assert.match(source, /compactBannerCount >= 3 && externalDestinationCount >= 2/);
  assert.match(source, /jammerAdCandidateScore\(anchor\) < 5/);
  assert.match(source, /MutationObserver/);

  for (const remotePrimitive of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'EventSource']) {
    assert.equal(source.includes(remotePrimitive), false);
  }
});
