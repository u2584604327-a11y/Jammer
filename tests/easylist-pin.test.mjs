import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('EasyList source pin is immutable and locally auditable', async () => {
  const metadata = JSON.parse(
    await readFile('rules/sources/easylist-adservers.pinned.json', 'utf8')
  );

  assert.equal(metadata.remoteUpdate, false);
  assert.equal(metadata.source.repository, 'easylist/easylist');
  assert.match(metadata.source.commit, /^[0-9a-f]{40}$/);
  assert.ok(metadata.source.url.includes(metadata.source.commit));
  assert.equal(
    metadata.source.expectedSha256,
    '244344bf3636e070ade00588520ba913c5fcdc3a2049a2d9c27b6352a84f969b'
  );
  assert.equal(metadata.source.expectedSizeBytes, 995208);
  assert.equal(metadata.compiler.bucketCount, 256);
  assert.equal(metadata.compiler.expectedAcceptedDomains, 42940);
  assert.equal(metadata.compiler.expectedEmittedRules, 256);
  assert.equal(metadata.attribution.name, 'The EasyList authors');
});

test('EasyList pin URL does not follow a moving branch', async () => {
  const metadata = JSON.parse(
    await readFile('rules/sources/easylist-adservers.pinned.json', 'utf8')
  );

  assert.equal(metadata.source.url.includes('/master/'), false);
  assert.equal(metadata.source.url.includes('/main/'), false);
});
