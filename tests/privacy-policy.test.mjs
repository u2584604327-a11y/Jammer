import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('privacy policy documents actual local settings and permissions', async () => {
  const policy = await readFile('PRIVACY.md', 'utf8');
  const config = await readFile('src/core/config.ts', 'utf8');
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));

  const documentedSettings = [
    ['enabled', /protection/i],
    ['adsEnabled', /network ad blocking/i],
    ['cosmeticEnabled', /page-ad cleanup/i],
    ['contentEnabled', /content filtering/i],
    ['contentCategories', /content categories/i],
    ['language', /language preference/i],
    ['allowlist', /allowlist/i],
    ['contentAllowlist', /content-filter exceptions/i]
  ];

  for (const [field, policyPattern] of documentedSettings) {
    assert.match(config, new RegExp(field));
    assert.match(policy, policyPattern);
  }

  assert.deepEqual(manifest.permissions.sort(), ['declarativeNetRequest', 'storage'].sort());
  assert.deepEqual(manifest.optional_permissions, ['scripting']);
  assert.deepEqual(
    manifest.optional_host_permissions.sort(),
    ['http://*/*', 'https://*/*'].sort()
  );

  for (const permission of [
    'declarativeNetRequest',
    'storage',
    'scripting',
    'http://*/*',
    'https://*/*'
  ]) {
    assert.ok(policy.includes(permission));
  }
});

test('privacy policy reflects no-runtime-egress contract', async () => {
  const policy = await readFile('PRIVACY.md', 'utf8');
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  const popup = await readFile('src/popup.ts', 'utf8');
  const options = await readFile('src/options.ts', 'utf8');
  const contentFilter = await readFile('src/content-filter.ts', 'utf8');

  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/);
  assert.match(policy, /connect-src 'none'/);
  assert.equal(popup.includes('fetch('), false);
  assert.equal(options.includes('fetch('), false);
  assert.equal(contentFilter.includes('fetch('), false);
  assert.match(policy, /does not download EasyList/i);
  assert.match(policy, /processed transiently/i);
  assert.match(policy, /not upload scanned page text/i);
});

test('standalone privacy page is self-contained and bilingual', async () => {
  const html = await readFile('docs/privacy/index.html', 'utf8');

  assert.match(html, /Jammer Privacy Policy/);
  assert.match(html, /简体中文/);
  assert.match(html, /English/);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /<link[^>]+stylesheet/i);
  assert.doesNotMatch(html, /src=["']https?:\/\//i);
});

test('privacy policy does not claim permissions Jammer does not request', async () => {
  const policy = await readFile('PRIVACY.md', 'utf8');

  for (const forbidden of [
    'tabs',
    'history',
    'cookies',
    'webRequest',
    'debugger',
    'downloads',
    'nativeMessaging'
  ]) {
    assert.match(policy, new RegExp('does not request[^\\n]*' + forbidden, 'i'));
  }
});
