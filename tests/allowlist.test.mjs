import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAllowlistRules, ALLOWLIST_RULE_ID_BASE } from '../.test-build/core/dnr.js';

test('builds high-priority local allow rules', () => {
  const rules = buildAllowlistRules(['example.com', 'news.example']);
  assert.equal(rules.length, 2);
  assert.equal(rules[0].id, ALLOWLIST_RULE_ID_BASE);
  assert.equal(rules[0].priority, 10000);
  assert.equal(rules[0].action.type, 'allow');
  assert.deepEqual(rules[0].condition.initiatorDomains, ['example.com']);
});
