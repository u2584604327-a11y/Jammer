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
  assert.equal(metadata.specificHide.expectedSafeRules, 8606);
  assert.equal(metadata.specificHide.expectedUniqueDomains, 6552);
  assert.equal(metadata.specificHide.expectedRejected, 293);
  assert.equal(metadata.runtimeUpdate, false);
});

test('cosmetic compiler only emits CSS-safe selector rules', async () => {
  const source = await readFile('scripts/prepare-easylist-cosmetic.mjs', 'utf8');

  assert.match(source, /expectedSelectors/);
  assert.match(source, /expectedGitBlobSha1/);
  assert.match(source, /specificByDomain/);
  assert.match(source, /easylist-specific-hide\.rules\.js/);
  assert.match(source, /expectedSafeRules/);
  assert.match(source, /display: none !important/);
  assert.match(source, /visibility: hidden !important/);
  assert.match(source, /unsupported-selector/);
});

test('runtime registers generic, canyoublockit, and full site-specific cosmetic layers', async () => {
  const popup = await readFile('src/popup.ts', 'utf8');
  const options = await readFile('src/options.ts', 'utf8');

  for (const source of [popup, options]) {
    assert.match(source, /cosmetic-easylist\.css/);
    assert.match(source, /cosmetic-canyoublockit\.css/);
    assert.match(source, /canyoublockit\.com/);
    assert.match(source, /jammer-cosmetic-canyoublockit/);
    assert.match(source, /jammer-cosmetic-specific/);
    assert.match(source, /cosmetic-specific-rules\.js/);
    assert.match(source, /cosmetic-specific-filter\.js/);
    assert.match(source, /ad-element-filter\.js/);
  }
});

test('local CanYouBlockIt regression CSS hides test-ad anchors without hiding article screenshots', async () => {
  const css = await readFile('src/cosmetic-canyoublockit-local.css', 'utf8');

  assert.match(css, /a\[href="ad\.com"\]/);
  assert.match(css, /elementor-widget-container/);
  assert.doesNotMatch(css, /Capture\.png/);
  assert.doesNotMatch(css, /Screenshot_13/);
});


test('site-specific cosmetic runtime handles dynamic content without remote calls', async () => {
  const source = await readFile('src/cosmetic-specific-filter.ts', 'utf8');

  assert.match(source, /MutationObserver/);
  assert.match(source, /querySelectorAll/);
  assert.match(source, /display", "none", "important"/);
  assert.equal(source.includes('fetch('), false);
});
