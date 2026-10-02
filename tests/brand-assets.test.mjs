import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('brand source is local vector artwork with no external references', async () => {
  const svg = await readFile('assets/brand/icon.svg', 'utf8');
  assert.match(svg, /<svg/);
  assert.match(svg, /Jammer icon/);
  assert.match(svg, /linearGradient/);
  assert.doesNotMatch(svg, /(?:href|src)=["']https?:\/\//i);
  assert.doesNotMatch(svg, /<image/i);
});

test('brand generator creates required Chromium icon sizes', async () => {
  const source = await readFile('scripts/generate-brand-assets.mjs', 'utf8');
  assert.match(source, /\[16, 32, 48, 128\]/);
  assert.match(source, /icon-\$\{size\}\.png/);
  assert.match(source, /IHDR/);
  assert.match(source, /IDAT/);
});

test('social preview has local vector source and deterministic PNG generator', async () => {
  const svg = await readFile('assets/brand/social-preview.svg', 'utf8');
  const generator = await readFile('scripts/generate-social-preview.mjs', 'utf8');

  assert.match(svg, /viewBox="0 0 1280 640"/);
  assert.match(svg, />Jammer</);
  assert.doesNotMatch(svg, /(?:href|src)=["']https?:\/\//i);

  assert.match(generator, /const WIDTH = 1280/);
  assert.match(generator, /const HEIGHT = 640/);
  assert.match(generator, /social-preview\.png/);
  assert.match(generator, /1_000_000/);
  assert.match(generator, /IHDR/);
  assert.match(generator, /IDAT/);
});
