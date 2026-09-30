import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDomain, normalizeDomainList } from '../.test-build/core/domain.js';

test('normalizes scheme, path, case, and port', () => {
  assert.equal(normalizeDomain('HTTPS://Example.COM:443/path?q=1'), 'example.com');
});

test('deduplicates normalized domains', () => {
  assert.deepEqual(normalizeDomainList(['example.com', 'https://example.com/path']), ['example.com']);
});

test('rejects unsupported schemes', () => {
  assert.throws(() => normalizeDomain('javascript:alert(1)'));
});

test('rejects blank and single-label hosts', () => {
  assert.throws(() => normalizeDomain(''));
  assert.throws(() => normalizeDomain('localhost'));
});
