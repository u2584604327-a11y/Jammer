import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('popup exposes local bilingual selector and direct cosmetic control', async () => {
  const html = await readFile('popup.html', 'utf8');
  const source = await readFile('src/popup.ts', 'utf8');

  assert.match(html, /id="language-select"/);
  assert.match(html, /value="zh-CN"/);
  assert.match(html, /value="en"/);
  assert.match(html, /id="cosmetic-enabled"/);

  assert.match(source, /navigator\.language/);
  assert.match(source, /"zh-CN"/);
  assert.match(source, /Page ad cleanup/);
  assert.match(source, /页面广告清理/);
  assert.match(source, /popupPermissionRequest/);
  assert.match(source, /popupPermissionRemove/);
});

test('options exposes the same bilingual preference', async () => {
  const html = await readFile('options.html', 'utf8');
  const source = await readFile('src/options.ts', 'utf8');

  assert.match(html, /id="language-select"/);
  assert.match(source, /Jammer 设置/);
  assert.match(source, /Jammer Options/);
  assert.match(source, /language: "auto"/);
});

test('language preference is local settings state only', async () => {
  const config = await readFile('src/core/config.ts', 'utf8');
  const popup = await readFile('src/popup.ts', 'utf8');
  const options = await readFile('src/options.ts', 'utf8');

  assert.match(config, /language: JammerLanguage/);
  assert.match(config, /language: "auto"/);
  assert.equal(popup.includes('fetch('), false);
  assert.equal(options.includes('fetch('), false);
});
