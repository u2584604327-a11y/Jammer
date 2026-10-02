import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('release packager creates deterministic ZIP metadata and SHA-256 sidecar', async () => {
  const source = await readFile('scripts/package-release.mjs', 'utf8');

  assert.match(source, /jammer-\$\{version\}-chromium\.zip/);
  assert.match(source, /RELEASE_INFO\.json/);
  assert.match(source, /\.sha256/);
  assert.match(source, /createHash\('sha256'\)/);
  assert.match(source, /0x04034b50/);
  assert.match(source, /0x02014b50/);
  assert.match(source, /0x06054b50/);
});

test('release audit protects permission and provenance contracts', async () => {
  const source = await readFile('scripts/audit-release.mjs', 'utf8');

  assert.match(source, /declarativeNetRequest/);
  assert.match(source, /storage/);
  assert.match(source, /scripting/);
  assert.match(source, /PROVENANCE\.json/);
  assert.match(source, /COSMETIC_PROVENANCE\.json/);
  assert.match(source, /SECURITY_PROVENANCE\.json/);
  assert.match(source, /content-category-domains\.js/);
  assert.match(source, /cosmetic-specific-rules\.js/);
  assert.match(source, /ad-element-filter\.js/);
  assert.match(source, /THIRD_PARTY_NOTICES\.txt/);
  assert.match(source, /assets\/jammer-cover\.webp/);
  assert.match(source, /raw EasyList text leaked/);
  assert.match(source, /source TypeScript or source maps leaked/);
  assert.match(source, /connect-src 'none'/);
});
