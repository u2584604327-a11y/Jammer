import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { compileDnrRules } from './rule-pipeline.mjs';

const [, , sourcePath, metadataPath, outputPath, reportPath] = process.argv;

if (!sourcePath || !metadataPath || !outputPath) {
  console.error('Usage: node scripts/compile-rules.mjs <source.txt> <metadata.json> <rules.json> [report.json]');
  process.exit(2);
}

const source = await readFile(resolve(sourcePath), 'utf8');
const metadata = JSON.parse(await readFile(resolve(metadataPath), 'utf8'));
const compiled = compileDnrRules(source, metadata);

const rulesOutput = resolve(outputPath);
await mkdir(dirname(rulesOutput), { recursive: true });
await writeFile(rulesOutput, JSON.stringify(compiled.rules, null, 2) + '\n');

if (reportPath) {
  const reportOutput = resolve(reportPath);
  await mkdir(dirname(reportOutput), { recursive: true });
  await writeFile(reportOutput, JSON.stringify(compiled.report, null, 2) + '\n');
}

console.log(`compiled: accepted=${compiled.report.accepted} duplicates=${compiled.report.duplicates} rejected=${compiled.report.rejected}`);
