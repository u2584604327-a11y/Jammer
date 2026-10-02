import test from 'node:test';
import assert from 'node:assert/strict';
import { compileDnrRules, normalizeRuleDomain, parseRuleSource } from '../scripts/rule-pipeline.mjs';

const metadata = {
  id: 'test-source',
  title: 'Test source',
  format: 'mixed-domain',
  provenance: 'repository-owned-test-fixture',
  license: 'project-owned',
  remoteUpdate: false
};

test('normalizes rule domains', () => {
  assert.equal(normalizeRuleDomain('ADS.Example.COM.'), 'ads.example.com');
  assert.throws(() => normalizeRuleDomain('localhost'));
  assert.throws(() => normalizeRuleDomain('-bad.example.com'));
});

test('parses supported domain and hosts syntax and deduplicates', () => {
  const parsed = parseRuleSource(
    [
      '! comment',
      '||ads.example.com^',
      '0.0.0.0 tracker.example.com',
      '127.0.0.1 beacon.example.com',
      '||ADS.EXAMPLE.COM^'
    ].join('\n'),
    metadata
  );
  assert.deepEqual(parsed.accepted, ['ads.example.com', 'beacon.example.com', 'tracker.example.com']);
  assert.equal(parsed.duplicates, 1);
  assert.equal(parsed.rejected.length, 0);
});

test('reports unsupported syntax instead of reinterpreting it', () => {
  const parsed = parseRuleSource(
    [
      '@@||allow.example.com^',
      'example.com##.ad',
      '||modifier.example.com^$script',
      '||path.example.com/banner.js'
    ].join('\n'),
    metadata
  );
  assert.equal(parsed.accepted.length, 0);
  assert.deepEqual(
    parsed.rejected.map((item) => item.reason),
    [
      'exception-rule-not-supported',
      'cosmetic-rule-not-supported',
      'adblock-modifier-not-supported',
      'complex-adblock-rule-not-supported'
    ]
  );
});

test('compiler output is deterministic across input ordering', () => {
  const a = compileDnrRules('||b.example.com^\n||a.example.com^', metadata);
  const b = compileDnrRules('||a.example.com^\n||b.example.com^', metadata);
  assert.deepEqual(a.rules, b.rules);
});

test('compiler emits block-only DNR rules with stable positive IDs', () => {
  const compiled = compileDnrRules('||ads.example.com^\n0.0.0.0 tracker.example.com', metadata);
  assert.equal(compiled.rules.length, 2);
  for (const rule of compiled.rules) {
    assert.ok(Number.isInteger(rule.id));
    assert.ok(rule.id > 0 && rule.id <= 0x7fffffff);
    assert.equal(rule.action.type, 'block');
    assert.equal('redirect' in rule.action, false);
    assert.equal('requestHeaders' in rule.action, false);
    assert.equal('responseHeaders' in rule.action, false);
  }
});

test('metadata requires explicit local-only remote update policy', () => {
  assert.throws(() =>
    compileDnrRules('||ads.example.com^', { ...metadata, remoteUpdate: true })
  );
});
