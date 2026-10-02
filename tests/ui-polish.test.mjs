import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('popup keeps all runtime control IDs after visual redesign', async () => {
  const html = await readFile('popup.html', 'utf8');
  for (const id of [
    'language-select',
    'protection',
    'protection-label',
    'status',
    'cosmetic-enabled',
    'cosmetic-label',
    'cosmetic-hint',
    'cosmetic-status',
    'open-options'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /Build: p54-release-candidate-dev/);
  assert.match(html, /class="brand-mark"/);
});

test('options keeps all runtime control IDs after visual redesign', async () => {
  const html = await readFile('options.html', 'utf8');
  for (const id of [
    'options-title',
    'language-select',
    'master-enabled',
    'master-label',
    'ads-enabled',
    'ads-label',
    'cosmetic-title',
    'cosmetic-enabled',
    'cosmetic-label',
    'cosmetic-description',
    'cosmetic-reload',
    'allowlist-title',
    'allowlist-description',
    'allowlist-input',
    'add-domain',
    'allowlist',
    'message',
    'content-title',
    'content-description'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('styles provide responsive light/dark controls without remote assets', async () => {
  const css = await readFile('src/styles.css', 'utf8');
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /\.switch:checked/);
  assert.match(css, /\.popup-page/);
  assert.match(css, /\.settings-shell/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.doesNotMatch(css, /@import/i);
  assert.doesNotMatch(css, /url\s*\(/i);
});
