import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { compileDnrRequestDomainBuckets } from './rule-pipeline.mjs';

const metadataPath = resolve('rules/sources/easyprivacy-tracking.pinned.json');
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));

const response = await fetch(metadata.source.url, {
  redirect: 'error',
  headers: {
    'user-agent': 'Jammer-build-pipeline/0.7'
  }
});

if (!response.ok) {
  throw new Error(`Pinned EasyPrivacy source fetch failed: HTTP ${response.status}`);
}

const bytes = Buffer.from(await response.arrayBuffer());

if (bytes.length !== metadata.source.expectedSizeBytes) {
  throw new Error(
    `Pinned EasyPrivacy source size mismatch: expected ${metadata.source.expectedSizeBytes}, got ${bytes.length}`
  );
}

const gitBlobHeader = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
const gitBlobSha1 = createHash('sha1')
  .update(gitBlobHeader)
  .update(bytes)
  .digest('hex');

if (gitBlobSha1 !== metadata.source.expectedGitBlobSha1) {
  throw new Error(
    `Pinned EasyPrivacy Git blob mismatch: expected ${metadata.source.expectedGitBlobSha1}, got ${gitBlobSha1}`
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
    throw new Error(`Pinned EasyPrivacy compiler baseline changed for ${label}: expected ${wanted}, got ${actual}`);
  }
}

const privacyResourceTypes = [
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other'
];

const rules = compiled.rules.map((rule) => ({
  ...rule,
  condition: {
    ...rule.condition,
    resourceTypes: privacyResourceTypes
  }
}));

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
    gitBlobSha1,
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
  },
  scope: {
    mainFrameBlocked: false,
    resourceTypes: privacyResourceTypes
  }
};

const rulesPath = resolve('generated/easyprivacy-tracking.rules.json');
const reportPath = resolve('generated/easyprivacy-tracking.report.json');
await mkdir(dirname(rulesPath), { recursive: true });
await writeFile(rulesPath, JSON.stringify(rules, null, 2) + '\n');
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');

console.log(
  `easyprivacy-pinned: gitBlob=${gitBlobSha1} domains=${report.compiler.acceptedDomains} rules=${report.compiler.emittedRules} rejected=${report.compiler.rejected}`
);
