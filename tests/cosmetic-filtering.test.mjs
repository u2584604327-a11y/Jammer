import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('cosmetic stylesheet is local CSS only', async () => {
  const css = await readFile('src/cosmetic.css', 'utf8');

  assert.match(css, /adsbygoogle/);
  assert.match(css, /data-ad-slot/);
  assert.match(css, /display:\s*none\s*!important/);
  assert.doesNotMatch(css, /@import/i);
  assert.doesNotMatch(css, /url\s*\(/i);
  assert.doesNotMatch(css, /javascript:/i);
});

test('page ad cleanup is opt-in and combines packaged CSS with local heuristics', async () => {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  const options = await readFile('src/options.ts', 'utf8');

  assert.deepEqual(manifest.optional_permissions, ['scripting']);
  assert.deepEqual(
    [...manifest.optional_host_permissions].sort(),
    ['http://*/*', 'https://*/*'].sort()
  );
  assert.equal('host_permissions' in manifest, false);
  assert.equal('content_scripts' in manifest, false);

  assert.match(options, /css: \["cosmetic\.css", "cosmetic-easylist\.css"\]/);
  assert.match(options, /permissions\.request/);
  assert.match(options, /permissions\.remove/);
  assert.match(options, /excludeMatches/);
  assert.match(
    options,
    /id:\s*OPTIONS_COSMETIC_SCRIPT_ID[\s\S]*?css:\s*\["cosmetic\.css", "cosmetic-easylist\.css"\][\s\S]*?runAt:\s*"document_start"/
  );
  assert.match(
    options,
    /id:\s*OPTIONS_CONTENT_SCRIPT_ID[\s\S]*?js:\s*\["content-classifier\.js", "content-filter\.js"\]/
  );
  assert.match(
    options,
    /id:\s*OPTIONS_AD_HEURISTIC_SCRIPT_ID[\s\S]*?js:\s*\["ad-cleanup\.js"\]/
  );
  assert.equal(options.includes('executeScript'), false);
});

test('allowlist domains are converted into cosmetic exclusions', async () => {
  const options = await readFile('src/options.ts', 'utf8');

  assert.match(options, /\*:\/\/\$\{domain\}\/\*/);
  assert.match(options, /\*:\/\/\*\.\$\{domain\}\/\*/);
  assert.match(options, /\\d\{1,3\}/);
  assert.match(options, /return \[exact\]/);
});

test('popup can directly enable and disable cosmetic permission', async () => {
  const popup = await readFile('src/popup.ts', 'utf8');

  assert.match(popup, /chrome\.permissions\.request/);
  assert.match(popup, /chrome\.permissions\.remove/);
  assert.match(popup, /css: \["cosmetic\.css", "cosmetic-easylist\.css"\]/);
  assert.match(popup, /cosmeticEnabled/);
});


test('heuristic ad cleanup targets dynamic and self-hosted banners locally', async () => {
  const source = await readFile('src/ad-cleanup.ts', 'utf8');

  assert.match(source, /JAMMER_STANDARD_AD_SIZES/);
  assert.match(source, /jammerAdIsWideBanner/);
  assert.match(source, /jammerAdIsCrossOriginLink/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /data-ad-slot/);
  assert.match(source, /googleadservices|googlesyndication/);
  assert.match(source, /送彩金|casino|betting/);
  assert.match(source, /display", "none", "important"/);

  for (const remotePrimitive of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'EventSource']) {
    assert.equal(source.includes(remotePrimitive), false);
  }
  assert.doesNotMatch(source, /input\.value|password/i);
});
