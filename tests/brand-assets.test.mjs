import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('brand source is local vector artwork with no external references', async () => {
  const svg = await readFile('assets/brand/icon.svg', 'utf8');
  assert.match(svg, /<svg/);
  assert.match(svg, /Jammer icon/);
  assert.match(svg, /linearGradient/);
  assert.doesNotMatch(svg, /https?:\/\//);
  assert.doesNotMatch(svg, /<image/i);
});

test('brand generator creates required Chromium icon sizes', async () => {
  const source = await readFile('scripts/generate-brand-assets.mjs', 'utf8');
  assert.match(source, /\[16, 32, 48, 128\]/);
  assert.match(source, /icon-\$\{size\}\.png/);
  assert.match(source, /IHDR/);
  assert.match(source, /IDAT/);
});
