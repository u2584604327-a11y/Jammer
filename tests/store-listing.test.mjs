import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('store listing copy exists in English and Chinese', async () => {
  const en = await readFile('docs/store/EN.md', 'utf8');
  const zh = await readFile('docs/store/ZH-CN.md', 'utf8');

  assert.match(en, /Jammer/);
  assert.match(en, /declarativeNetRequest/);
  assert.match(en, /no telemetry/i);
  assert.match(zh, /Jammer/);
  assert.match(zh, /无遥测/);
  assert.match(zh, /页面广告清理/);
  assert.match(zh, /内容过滤/);
  assert.match(en, /content warnings/i);
});

test('store copy does not claim unsupported capabilities', async () => {
  const combined =
    (await readFile('docs/store/EN.md', 'utf8')) +
    (await readFile('docs/store/ZH-CN.md', 'utf8'));

  for (const unsupported of [
    'AI filtering',
    'machine learning',
    'malware protection',
    'VPN',
    'password manager'
  ]) {
    assert.equal(combined.includes(unsupported), false);
  }
});

test('store preparation documents current visual asset dimensions', async () => {
  const doc = await readFile('docs/P56_STORE_LISTING.md', 'utf8');
  assert.match(doc, /300×300/);
  assert.match(doc, /440×280/);
  assert.match(doc, /1400×560/);
  assert.match(doc, /1280×800/);
  assert.match(doc, /0\.7\.0/);
});
