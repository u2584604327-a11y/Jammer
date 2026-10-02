import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('pins EasyList generic and site-specific cosmetic sources', async () => {
  const metadata = JSON.parse(
    await readFile('rules/sources/easylist-cosmetic.pinned.json', 'utf8')
  );

  assert.equal(metadata.commit, '3f284f851f6380a25c0f7e2447f2b01b1c8ee2d8');
  assert.equal(metadata.generalHide.expectedSizeBytes, 236792);
  assert.equal(
    metadata.generalHide.expectedGitBlobSha1,
    'f2751049c9f5db7a5afe169f5f3f9824e33fd496'
  );
  assert.equal(metadata.generalHide.expectedSelectors, 13631);
  assert.equal(metadata.specificHide.expectedSizeBytes, 437250);
  assert.equal(
    metadata.specificHide.expectedGitBlobSha1,
    '49e3937b6ca2cce86da30bb5a47162f3af7d042b'
  );
  assert.equal(metadata.runtimeUpdate, false);
});

test('cosmetic compiler only emits CSS-safe selector rules', async () => {
  const source = await readFile('scripts/prepare-easylist-cosmetic.mjs', 'utf8');

  assert.match(source, /expectedSelectors/);
  assert.match(source, /expectedGitBlobSha1/);
  assert.match(source, /canyoublockit\.com##/);
  assert.match(source, /display: none !important/);
  assert.match(source, /visibility: hidden !important/);
  assert.match(source, /unsupported-selector/);
});

test('runtime registers generic and canyoublockit cosmetic layers', async () => {
  const popup = await readFile('src/popup.ts', 'utf8');
  const options = await readFile('src/options.ts', 'utf8');

  for (const source of [popup, options]) {
    assert.match(source, /cosmetic-easylist\.css/);
    assert.match(source, /cosmetic-canyoublockit\.css/);
    assert.match(source, /canyoublockit\.com/);
    assert.match(source, /jammer-cosmetic-canyoublockit/);
  }
});
