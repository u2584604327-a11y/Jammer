import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { compileDnrRequestDomainBuckets } from './rule-pipeline.mjs';

const metadataPath = resolve('rules/sources/easylist-adservers.pinned.json');
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));

const response = await fetch(metadata.source.url, {
  redirect: 'error',
  headers: {
    'user-agent': 'Jammer-build-pipeline/0.1'
  }
});

if (!response.ok) {
  throw new Error(`Pinned source fetch failed: HTTP ${response.status}`);
}

const bytes = Buffer.from(await response.arrayBuffer());
const sha256 = createHash('sha256').update(bytes).digest('hex');

if (bytes.length !== metadata.source.expectedSizeBytes) {
  throw new Error(
    `Pinned source size mismatch: expected ${metadata.source.expectedSizeBytes}, got ${bytes.length}`
  );
}

if (sha256 !== metadata.source.expectedSha256) {
  throw new Error(
    `Pinned source SHA-256 mismatch: expected ${metadata.source.expectedSha256}, got ${sha256}`
  );
}

const sourceText = bytes.toString('utf8');
const compiled = compileDnrRequestDomainBuckets(sourceText, metadata, {
  bucketCount: metadata.compiler.bucketCount,
  ruleIdBase: metadata.compiler.ruleIdBase
});

const expected = metadata.compiler;
for (const [label, actual, wanted] of [
  ['accepted domains', compiled.report.acceptedDomains, expected.expectedAcceptedDomains],
  ['rejected rules', compiled.report.rejected, expected.expectedRejectedRules],
  ['duplicates', compiled.report.duplicates, expected.expectedDuplicates],
  ['emitted rules', compiled.report.emittedRules, expected.expectedEmittedRules]
]) {
  if (actual !== wanted) {
    throw new Error(`Pinned compiler baseline changed for ${label}: expected ${wanted}, got ${actual}`);
  }
}

const rejectionByReason = {};
for (const item of compiled.report.rejectedLines) {
  rejectionByReason[item.reason] = (rejectionByReason[item.reason] ?? 0) + 1;
}

const report = {
  source: {
    repository: metadata.source.repository,
    commit: metadata.source.commit,
    commitTimestamp: metadata.source.commitTimestamp,
    path: metadata.source.path,
    sha256,
    sizeBytes: bytes.length
  },
  license: metadata.license,
  attribution: metadata.attribution,
  compiler: {
    mode: compiled.report.mode,
    bucketCount: compiled.report.requestedBucketCount,
    acceptedDomains: compiled.report.acceptedDomains,
    duplicates: compiled.report.duplicates,
    rejected: compiled.report.rejected,
    rejectionByReason,
    emittedRules: compiled.report.emittedRules,
    minDomainsPerRule: compiled.report.minDomainsPerRule,
    maxDomainsPerRule: compiled.report.maxDomainsPerRule,
    averageDomainsPerRule: compiled.report.averageDomainsPerRule
  }
};

const rulesPath = resolve('generated/easylist-adservers.rules.json');
const reportPath = resolve('generated/easylist-adservers.report.json');
await mkdir(dirname(rulesPath), { recursive: true });
await writeFile(rulesPath, JSON.stringify(compiled.rules, null, 2) + '\n');
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');

console.log(
  `easylist-pinned: sha256=${sha256} domains=${report.compiler.acceptedDomains} rules=${report.compiler.emittedRules} rejected=${report.compiler.rejected}`
);
