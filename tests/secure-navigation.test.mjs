import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('active phishing source is pinned and build-only', async () => {
  const meta = JSON.parse(await readFile('rules/sources/phishing-active.pinned.json', 'utf8'));

  assert.equal(meta.commit, '6874727d671bb56765fd1fbfa15bc5f8b79ae63f');
  assert.equal(meta.expectedGitBlobSha1, '6adc5d0bc92feda2654ff4b7a882dc6a168b8705');
  assert.equal(meta.expectedAcceptedDomains, 21552);
  assert.equal(meta.expectedEmittedRules, 64);
  assert.equal(meta.runtimeUpdate, false);
});

test('phishing compiler only blocks navigation to known domains', async () => {
  const source = await readFile('scripts/prepare-phishing-active.mjs', 'utf8');

  assert.match(source, /requestDomains/);
  assert.match(source, /resourceTypes: \['main_frame', 'sub_frame'\]/);
  assert.match(source, /action: \{ type: 'block' \}/);
  assert.match(source, /createHash\('sha1'\)/);
  assert.doesNotMatch(source, /script'.*xmlhttprequest/s);
});

test('phishing protection is enabled by default but independently controllable', async () => {
  const config = await readFile('src/core/config.ts', 'utf8');
  const options = await readFile('src/options.ts', 'utf8');
  const popup = await readFile('src/popup.ts', 'utf8');

  assert.match(config, /phishingEnabled:\s*true/);
  assert.match(options, /OPTIONS_PHISHING_RULESET_ID = "phishing_static"/);
  assert.match(popup, /POPUP_PHISHING_RULESET_ID = "phishing_static"/);
  assert.match(options, /settings\.phishingEnabled/);
  assert.match(popup, /settings\.phishingEnabled/);
});

test('HTTPS upgrade is opt-in and limited to page/frame navigation', async () => {
  const config = await readFile('src/core/config.ts', 'utf8');
  const options = await readFile('src/options.ts', 'utf8');

  assert.match(config, /secureNavigationEnabled:\s*false/);
  assert.match(options, /OPTIONS_HTTPS_UPGRADE_RULE_ID = 3_000_000/);
  assert.match(options, /action: \{ type: "upgradeScheme" \}/);
  assert.match(options, /regexFilter: "\^http:\/\/" /);
  assert.match(options, /resourceTypes: \["main_frame", "sub_frame"\]/);
  assert.match(options, /optionsHostPermissionRequest/);
});

test('P6.4 adds no history, cookie, webRequest or DNS permission', async () => {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));

  for (const forbidden of [
    'tabs',
    'history',
    'cookies',
    'webRequest',
    'webRequestBlocking',
    'dns',
    'debugger',
    'nativeMessaging'
  ]) {
    assert.equal(manifest.permissions.includes(forbidden), false);
  }
});

test('product build prepares phishing rules before packaging', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const build = await readFile('scripts/build-product.mjs', 'utf8');

  assert.match(pkg.scripts['build:product'], /rules:prepare:phishing/);
  assert.match(build, /phishing_static/);
  assert.match(build, /PHISHING_PROVENANCE\.json/);
  assert.match(build, /rules\/phishing-active\.json/);
});
