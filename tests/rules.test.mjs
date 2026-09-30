import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rules = JSON.parse(await readFile('rules/ads.json', 'utf8'));

function fixtureMatches(url, filter) {
  const match = /^\|\|([^\^]+)\^$/.exec(filter);
  if (!match) return false;
  return new URL(url).hostname === match[1] || new URL(url).hostname.endsWith(`.${match[1]}`);
}

test('rule IDs are unique and actions are block-only', () => {
  assert.equal(new Set(rules.map((rule) => rule.id)).size, rules.length);
  for (const rule of rules) {
    assert.equal(rule.action.type, 'block');
    assert.equal('redirect' in rule.action, false);
    assert.equal('requestHeaders' in rule.action, false);
    assert.equal('responseHeaders' in rule.action, false);
  }
});

test('fixture ad domain is blocked and ordinary domain is not', () => {
  assert.equal(rules.some((rule) => fixtureMatches('https://ads.jammer.invalid/banner.js', rule.condition.urlFilter)), true);
  assert.equal(rules.some((rule) => fixtureMatches('https://example.com/app.js', rule.condition.urlFilter)), false);
});
