import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { compileDnrRequestDomainBuckets } from './rule-pipeline.mjs';

const [, , sourcePath, metadataPath, outputPath, reportPath, bucketCountArg] = process.argv;

if (!sourcePath || !metadataPath || !outputPath) {
  console.error('Usage: node scripts/compile-domain-buckets.mjs <source.txt> <metadata.json> <rules.json> [report.json] [bucketCount]');
  process.exit(2);
}

const bucketCount = bucketCountArg === undefined ? 256 : Number(bucketCountArg);
const source = await readFile(resolve(sourcePath), 'utf8');
const metadata = JSON.parse(await readFile(resolve(metadataPath), 'utf8'));
const compiled = compileDnrRequestDomainBuckets(source, metadata, { bucketCount });

const rulesOutput = resolve(outputPath);
await mkdir(dirname(rulesOutput), { recursive: true });
await writeFile(rulesOutput, JSON.stringify(compiled.rules, null, 2) + '\n');

if (reportPath) {
  const reportOutput = resolve(reportPath);
  await mkdir(dirname(reportOutput), { recursive: true });
  await writeFile(reportOutput, JSON.stringify(compiled.report, null, 2) + '\n');
}

console.log(
  `compiled-buckets: domains=${compiled.report.acceptedDomains} rules=${compiled.report.emittedRules} min=${compiled.report.minDomainsPerRule} max=${compiled.report.maxDomainsPerRule} avg=${compiled.report.averageDomainsPerRule}`
);
