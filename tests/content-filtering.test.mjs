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

  assert.match(source, /document\.title/);
  assert.match(source, /meta\[name="description"\]/);
  assert.match(source, /h1,h2,h3/);
  assert.match(source, /document\.body\?\.innerText/);
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
