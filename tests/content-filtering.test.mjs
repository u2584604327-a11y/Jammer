import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

async function classifier() {
  delete globalThis.JammerContentClassifier;
  await import(pathToFileURL(resolve('.test-build/content-classifier.js')).href + `?t=${Date.now()}-${Math.random()}`);
  return globalThis.JammerContentClassifier;
}

const none = {
  gambling: false,
  explicit: false,
  violence: false,
  scam: false,
  clickbait: false
};

test('content classifier stays inert when every category is disabled', async () => {
  const api = await classifier();
  const result = api.classify(
    {
      title: 'Online casino bonus and sports betting',
      description: '',
      headings: '',
      body: 'pornography gore guaranteed profit'
    },
    none
  );
  assert.deepEqual(result, []);
});

test('content classifier catches strong selected gambling signals', async () => {
  const api = await classifier();
  const result = api.classify(
    {
      title: 'Best online casino bonus',
      description: 'Sports betting offers',
      headings: '',
      body: ''
    },
    { ...none, gambling: true }
  );
  assert.equal(result[0]?.category, 'gambling');
  assert.ok(result[0].score >= 4);
  assert.ok(result[0].matchedTerms.includes('online casino'));
});

test('isolated generic word remains below threshold', async () => {
  const api = await classifier();
  const result = api.classify(
    {
      title: '',
      description: '',
      headings: '',
      body: 'A history article discusses the architecture of an old casino building.'
    },
    { ...none, gambling: true }
  );
  assert.deepEqual(result, []);
});

test('content classifier supports Chinese scam and explicit signals', async () => {
  const api = await classifier();
  const scam = api.classify(
    {
      title: '保证收益',
      description: '',
      headings: '',
      body: '联系客服解冻，先交保证金。'
    },
    { ...none, scam: true }
  );
  assert.equal(scam[0]?.category, 'scam');

  const explicit = api.classify(
    {
      title: '成人视频',
      description: '',
      headings: '',
      body: '成人网站'
    },
    { ...none, explicit: true }
  );
  assert.equal(explicit[0]?.category, 'explicit');
});

test('prominent clickbait signals are weighted more than body-only signals', async () => {
  const api = await classifier();
  const titleMatch = api.classify(
    { title: "You won't believe this", description: '', headings: '', body: '' },
    { ...none, clickbait: true }
  );
  assert.equal(titleMatch[0]?.category, 'clickbait');

  const bodyOnly = api.classify(
    { title: '', description: '', headings: '', body: "you won't believe" },
    { ...none, clickbait: true }
  );
  assert.deepEqual(bodyOnly, []);
});

test('content runtime is local-only and does not inspect form values', async () => {
  const source = await readFile('src/content-filter.ts', 'utf8');

  for (const remotePrimitive of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'EventSource']) {
    assert.equal(source.includes(remotePrimitive), false);
  }

  assert.match(source, /JAMMER_CONTENT_FILTER_CANDIDATE_SELECTOR/);
  assert.match(source, /role='article'/);
  assert.match(source, /class\*='recommend'/);
  assert.match(source, /h1,h2,h3,h4/);
  assert.match(source, /innerText/);
  assert.match(source, /aria-label/);
  assert.match(source, /img\[alt\]/);
  assert.match(source, /MutationObserver/);
  assert.doesNotMatch(source, /querySelectorAll<[^>]*>\(["']input/i);
  assert.doesNotMatch(source, /password/i);
});

test('content filtering is opt-in and uses separate local exceptions', async () => {
  const config = await readFile('src/core/config.ts', 'utf8');
  const options = await readFile('src/options.ts', 'utf8');
  const popup = await readFile('src/popup.ts', 'utf8');

  assert.match(config, /contentEnabled:\s*false/);
  for (const category of ['gambling', 'explicit', 'violence', 'scam', 'clickbait']) {
    assert.match(config, new RegExp(`${category}: false`));
  }
  assert.match(config, /contentAllowlist/);
  assert.match(options, /jammer-content-filter/);
  assert.match(options, /content-classifier\.js/);
  assert.match(options, /content-filter\.js/);
  assert.match(popup, /content-classifier\.js/);
  assert.match(popup, /content-filter\.js/);
});


test('content runtime masks matched elements instead of covering the whole page', async () => {
  const source = await readFile('src/content-filter.ts', 'utf8');

  assert.match(source, /data-jammer-content-masked/);
  assert.match(source, /data-jammer-content-placeholder/);
  assert.match(source, /Show this content/);
  assert.match(source, /显示这段内容/);
  assert.match(source, /insertBefore\(placeholder, element\)/);
  assert.match(source, /display", "none", "important"/);
  assert.doesNotMatch(source, /position:fixed;inset:0;z-index:2147483647/);
  assert.doesNotMatch(source, /Show this page/);
});

test('content runtime offers an explicit leave-page action without tabs permission', async () => {
  const source = await readFile('src/content-filter.ts', 'utf8');
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));

  assert.match(source, /Leave this page/);
  assert.match(source, /退出此网页/);
  assert.match(source, /history\.back\(\)/);
  assert.match(source, /location\.replace\("about:blank"\)/);
  assert.equal(manifest.permissions.includes('tabs'), false);
});

test('content runtime evaluates smaller blocks first and rescans dynamic feeds', async () => {
  const source = await readFile('src/content-filter.ts', 'utf8');

  assert.match(source, /jammerContentFilterElementDepth/);
  assert.match(source, /depthDelta/);
  assert.match(source, /JAMMER_CONTENT_FILTER_BATCH_SIZE/);
  assert.match(source, /jammerContentPendingRoots/);
  assert.match(source, /jammerContentFilterDrainScans/);
  assert.doesNotMatch(source, /slice\(0, 300\)/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /characterData:\s*true/);
});

test('classifier recall uses repeated-signal scoring and expanded variants', async () => {
  const source = await readFile('src/content-classifier.ts', 'utf8');
  assert.match(source, /jammerCountOccurrences/);
  assert.match(source, /matchedTerms\.length >= 2/);
  assert.match(source, /真人荷官/);
  assert.match(source, /成人视频/);
  assert.match(source, /冒充客服/);
  assert.match(source, /before it gets deleted/);
  assert.match(source, /jammerDeobfuscateContent/);
  assert.match(source, /jammerCompactContent/);
  assert.match(source, /注册送彩金/);
  assert.match(source, /adult webcam/);
  assert.match(source, /导师带单/);
});


test('high-recall classifier catches obfuscated and repeated signals', async () => {
  const api = await classifier();

  const explicit = api.classify(
    { title: '', description: '', headings: '', body: 'p.0.r.n video' },
    { ...none, explicit: true }
  );
  assert.equal(explicit[0]?.category, 'explicit');

  const gambling = api.classify(
    { title: '', description: '', headings: '', body: '送彩金 彩金 盘口' },
    { ...none, gambling: true }
  );
  assert.equal(gambling[0]?.category, 'gambling');
});

test('content runtime has no fixed page-wide candidate cap', async () => {
  const source = await readFile('src/content-filter.ts', 'utf8');

  assert.match(source, /for \(let index = 0; index < candidates\.length; index \+= 1\)/);
  assert.match(source, /JAMMER_CONTENT_FILTER_BATCH_SIZE = 90/);
  assert.match(source, /JAMMER_CONTENT_FILTER_PENDING_ROOT_LIMIT = 80/);
  assert.doesNotMatch(source, /candidates\.slice\(0,\s*\d+\)/);
});
