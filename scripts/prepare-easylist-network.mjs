import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { compileEasyListNetworkPatternRules } from './rule-pipeline.mjs';

const metadataPath = resolve('rules/sources/easylist-network-patterns.pinned.json');
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
const sources = [];

for (const source of metadata.sources) {
  const response = await fetch(source.url, {
    redirect: 'error',
    headers: { 'user-agent': 'Jammer-build-pipeline/0.8' }
  });

  if (!response.ok) {
    throw new Error(`Pinned EasyList network source fetch failed for ${source.path}: HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== source.expectedSizeBytes) {
    throw new Error(
      `Pinned EasyList network source size mismatch for ${source.path}: expected ${source.expectedSizeBytes}, got ${bytes.length}`
    );
  }

  const gitBlobHeader = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  const gitBlobSha1 = createHash('sha1')
    .update(gitBlobHeader)
    .update(bytes)
    .digest('hex');

  if (gitBlobSha1 !== source.expectedGitBlobSha1) {
    throw new Error(
      `Pinned EasyList network Git blob mismatch for ${source.path}: expected ${source.expectedGitBlobSha1}, got ${gitBlobSha1}`
    );
  }

  sources.push({
    path: source.path,
    text: bytes.toString('utf8'),
    gitBlobSha1,
    sizeBytes: bytes.length
  });
}

const compiled = compileEasyListNetworkPatternRules(sources);
const expected = metadata.compiler;

if (compiled.report.emittedRules !== expected.expectedEmittedRules) {
  throw new Error(
    `EasyList network pattern rule count changed: expected ${expected.expectedEmittedRules}, got ${compiled.report.emittedRules}`
  );
}
if (compiled.report.rejected !== expected.expectedRejectedRules) {
  throw new Error(
    `EasyList network pattern rejected count changed: expected ${expected.expectedRejectedRules}, got ${compiled.report.rejected}`
  );
}
if (compiled.report.skipped !== expected.expectedSkippedLines) {
  throw new Error(
    `EasyList network pattern skipped count changed: expected ${expected.expectedSkippedLines}, got ${compiled.report.skipped}`
  );
}

const rejectionByReason = {};
for (const item of compiled.report.rejectedLines) {
  rejectionByReason[item.reason] = (rejectionByReason[item.reason] ?? 0) + 1;
}

const report = {
  source: {
    commit: metadata.sources[0].commit,
    files: sources.map((source) => ({
      path: source.path,
      gitBlobSha1: source.gitBlobSha1,
      sizeBytes: source.sizeBytes
    }))
  },
  license: metadata.license,
  attribution: metadata.attribution,
  compiler: {
    mode: compiled.report.mode,
    emittedRules: compiled.report.emittedRules,
    rejected: compiled.report.rejected,
    skipped: compiled.report.skipped,
    rejectionByReason
  },
  safety: {
    action: 'block-only',
    defaultMainFrameExcluded: true,
    exceptionRulesCompiled: false,
    regexRulesCompiled: false,
    runtimeRemoteUpdate: false
  }
};

const rulesPath = resolve('generated/easylist-network-patterns.rules.json');
const reportPath = resolve('generated/easylist-network-patterns.report.json');
await mkdir(dirname(rulesPath), { recursive: true });
await writeFile(rulesPath, JSON.stringify(compiled.rules, null, 2) + '\n');
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');

console.log(
  `easylist-network-patterns: rules=${report.compiler.emittedRules} rejected=${report.compiler.rejected} skipped=${report.compiler.skipped}`
);
