import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const metadata = JSON.parse(
  await readFile('rules/sources/phishing-active.pinned.json', 'utf8')
);

const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeDomain(value) {
  const domain = String(value).trim().toLowerCase().replace(/\.$/, '');
  if (!domain || domain.length > 253 || !domain.includes('.')) {
    throw new Error('invalid-domain');
  }
  const labels = domain.split('.');
  if (labels.some((label) => !DOMAIN_LABEL.test(label))) {
    throw new Error('invalid-domain');
  }
  return domain;
}

function fnv1a32(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

const response = await fetch(metadata.url, {
  redirect: 'error',
  headers: { 'user-agent': 'Jammer-build-pipeline/0.8' }
});

if (!response.ok) {
  throw new Error(`Pinned phishing source fetch failed: HTTP ${response.status}`);
}

const bytes = Buffer.from(await response.arrayBuffer());
const gitHeader = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
const gitBlobSha1 = createHash('sha1')
  .update(gitHeader)
  .update(bytes)
  .digest('hex');

if (gitBlobSha1 !== metadata.expectedGitBlobSha1) {
  throw new Error(
    `Pinned phishing Git blob mismatch: expected ${metadata.expectedGitBlobSha1}, got ${gitBlobSha1}`
  );
}

const domains = [];
const seen = new Set();
let invalidLines = 0;
let duplicates = 0;

for (const rawLine of bytes.toString('utf8').replace(/\r\n?/g, '\n').split('\n')) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;

  let domain;
  try {
    domain = normalizeDomain(line);
  } catch {
    invalidLines += 1;
    continue;
  }

  if (seen.has(domain)) {
    duplicates += 1;
    continue;
  }

  seen.add(domain);
  domains.push(domain);
}

domains.sort((a, b) => a.localeCompare(b));

if (domains.length !== metadata.expectedAcceptedDomains) {
  throw new Error(
    `Pinned phishing domain baseline changed: expected ${metadata.expectedAcceptedDomains}, got ${domains.length}`
  );
}
if (invalidLines !== metadata.expectedInvalidLines) {
  throw new Error(
    `Pinned phishing invalid-line baseline changed: expected ${metadata.expectedInvalidLines}, got ${invalidLines}`
  );
}
if (duplicates !== metadata.expectedDuplicates) {
  throw new Error(
    `Pinned phishing duplicate baseline changed: expected ${metadata.expectedDuplicates}, got ${duplicates}`
  );
}

const buckets = Array.from({ length: metadata.bucketCount }, () => []);
for (const domain of domains) {
  buckets[fnv1a32(domain) % metadata.bucketCount].push(domain);
}

const rules = [];
for (let index = 0; index < buckets.length; index += 1) {
  const requestDomains = buckets[index];
  if (requestDomains.length === 0) continue;

  rules.push({
    id: metadata.ruleIdBase + index,
    priority: 50,
    action: { type: 'block' },
    condition: {
      requestDomains,
      resourceTypes: ['main_frame', 'sub_frame']
    }
  });
}

if (rules.length !== metadata.expectedEmittedRules) {
  throw new Error(
    `Pinned phishing rule baseline changed: expected ${metadata.expectedEmittedRules}, got ${rules.length}`
  );
}

const rulesPath = resolve('generated/phishing-active.rules.json');
const reportPath = resolve('generated/phishing-active.report.json');
await mkdir(dirname(rulesPath), { recursive: true });

await writeFile(rulesPath, JSON.stringify(rules, null, 2) + '\n');
await writeFile(
  reportPath,
  JSON.stringify({
    source: {
      repository: metadata.repository,
      commit: metadata.commit,
      path: metadata.path,
      gitBlobSha1,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      sizeBytes: bytes.length
    },
    license: metadata.license,
    runtimeUpdate: false,
    compiler: {
      acceptedDomains: domains.length,
      invalidLines,
      duplicates,
      bucketCount: metadata.bucketCount,
      emittedRules: rules.length,
      minDomainsPerRule: Math.min(...buckets.map((bucket) => bucket.length)),
      maxDomainsPerRule: Math.max(...buckets.map((bucket) => bucket.length))
    }
  }, null, 2) + '\n'
);

console.log(
  `phishing-active: PASS domains=${domains.length} rules=${rules.length} invalid=${invalidLines} duplicates=${duplicates}`
);
