import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rules = JSON.parse(await readFile('rules/ads.json', 'utf8'));

function fixtureMatches(url, filter) {
  const domainMatch = /^\|\|([^\^]+)\^$/.exec(filter);
  if (domainMatch) {
    const hostname = new URL(url).hostname;
    return hostname === domainMatch[1] || hostname.endsWith(`.${domainMatch[1]}`);
  }
  if (filter.startsWith('|') && filter.endsWith('|')) {
    return url === filter.slice(1, -1);
  }
  return false;
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

test('localhost runtime fixture ad script is blocked exactly', () => {
  assert.equal(
    rules.some((rule) => fixtureMatches('http://127.0.0.1:8765/jammer-fixture/ad.js', rule.condition.urlFilter)),
    true
  );
  assert.equal(
    rules.some((rule) => fixtureMatches('http://127.0.0.1:8765/jammer-fixture/clean.js', rule.condition.urlFilter)),
    false
  );
});
