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
    'privacy-enabled',
    'privacy-label',
    'privacy-hint',
    'privacy-status',
    'phishing-enabled',
    'phishing-label',
    'phishing-hint',
    'phishing-status',
    'cosmetic-enabled',
    'cosmetic-label',
    'cosmetic-hint',
    'cosmetic-status',
    'content-enabled',
    'content-label',
    'content-hint',
    'content-status',
    'open-options'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /Build: p64-secure-navigation-dev/);
  assert.match(html, /class="brand-mark"/);
});

test('options embeds the packaged Jammer cover artwork', async () => {
  const html = await readFile('options.html', 'utf8');
  assert.match(html, /class="brand-cover"/);
  assert.match(html, /assets\/jammer-cover\.webp/);
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
    'privacy-enabled',
    'privacy-label',
    'privacy-description',
    'phishing-enabled',
    'phishing-label',
    'phishing-description',
    'secure-navigation-enabled',
    'secure-navigation-label',
    'secure-navigation-description',
    'blocked-title',
    'blocked-description',
    'blocked-domain-input',
    'add-blocked-domain',
    'blocked-domains',
    'blocked-message',
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
    'content-enabled',
    'content-master-label',
    'content-description',
    'content-reload',
    'content-gambling',
    'content-explicit',
    'content-violence',
    'content-scam',
    'content-clickbait',
    'content-allowlist-title',
    'content-allowlist-description',
    'content-allowlist-input',
    'add-content-domain',
    'content-allowlist',
    'content-message'
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
