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

test('cosmetic filtering is opt-in and CSS-only', async () => {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  const options = await readFile('src/options.ts', 'utf8');

  assert.deepEqual(manifest.optional_permissions, ['scripting']);
  assert.deepEqual(
    [...manifest.optional_host_permissions].sort(),
    ['http://*/*', 'https://*/*'].sort()
  );
  assert.equal('host_permissions' in manifest, false);
  assert.equal('content_scripts' in manifest, false);

  assert.match(options, /css: \["cosmetic\.css"\]/);
  assert.match(options, /permissions\.request/);
  assert.match(options, /permissions\.remove/);
  assert.match(options, /excludeMatches/);
  assert.equal(options.includes('js:'), false);
  assert.equal(options.includes('executeScript'), false);
});

test('allowlist domains are converted into cosmetic exclusions', async () => {
  const options = await readFile('src/options.ts', 'utf8');

  assert.match(options, /\*:\/\/\$\{domain\}\/\*/);
  assert.match(options, /\*:\/\/\*\.\$\{domain\}\/\*/);
  assert.match(options, /\\d\{1,3\}/);
  assert.match(options, /return \[exact\]/);
});
