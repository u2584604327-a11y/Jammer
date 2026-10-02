import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('EasyPrivacy source is pinned and runtime updates stay disabled', async () => {
  const meta = JSON.parse(await readFile('rules/sources/easyprivacy-tracking.pinned.json', 'utf8'));

  assert.equal(meta.remoteUpdate, false);
  assert.equal(meta.source.commit, '3f284f851f6380a25c0f7e2447f2b01b1c8ee2d8');
  assert.equal(meta.source.expectedGitBlobSha1, '1b597e69051308fc4a4ed57a023df6ec33b61161');
  assert.equal(meta.compiler.expectedAcceptedDomains, 534);
  assert.equal(meta.compiler.expectedEmittedRules, 64);
});

test('privacy compiler blocks tracker resource requests but not direct top-level navigation', async () => {
  const source = await readFile('scripts/prepare-easyprivacy.mjs', 'utf8');

  for (const type of ['script', 'xmlhttprequest', 'ping', 'image', 'sub_frame']) {
    assert.match(source, new RegExp(`['"]${type}['"]`));
  }
  assert.doesNotMatch(source, /['"]main_frame['"]/);
  assert.match(source, /expectedGitBlobSha1/);
  assert.match(source, /createHash\('sha1'\)/);
});

test('privacy blocking and dangerous-site list are local user controls', async () => {
  const config = await readFile('src/core/config.ts', 'utf8');
  const options = await readFile('src/options.ts', 'utf8');
  const popup = await readFile('src/popup.ts', 'utf8');

  assert.match(config, /privacyEnabled:\s*true/);
  assert.match(config, /blockedDomains:\s*\[\]/);
  assert.match(options, /OPTIONS_PRIVACY_RULESET_ID = "privacy_static"/);
  assert.match(popup, /POPUP_PRIVACY_RULESET_ID = "privacy_static"/);

  assert.match(options, /OPTIONS_BLOCKED_RULE_ID_BASE = 2_000_000/);
  assert.match(options, /urlFilter:\s*`\|\|\$\{domain\}\^\`/);
  assert.match(options, /resourceTypes:\s*\["main_frame", "sub_frame"\]/);
  assert.doesNotMatch(options, /action:\s*\{\s*type:\s*"redirect"/);
});

test('P6.2 adds no browsing-history or interception permissions', async () => {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));

  assert.deepEqual([...manifest.permissions].sort(), ['declarativeNetRequest', 'storage'].sort());
  assert.deepEqual(manifest.optional_permissions, ['scripting']);

  for (const forbidden of [
    'tabs',
    'history',
    'cookies',
    'webRequest',
    'webRequestBlocking',
    'debugger',
    'nativeMessaging'
  ]) {
    assert.equal(manifest.permissions.includes(forbidden), false);
  }
});

test('product build prepares EasyPrivacy before packaging', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const build = await readFile('scripts/build-product.mjs', 'utf8');

  assert.match(pkg.scripts['build:product'], /rules:prepare:privacy/);
  assert.match(build, /privacy_static/);
  assert.match(build, /PRIVACY_PROVENANCE\.json/);
  assert.match(build, /rules\/easyprivacy-tracking\.json/);
});
