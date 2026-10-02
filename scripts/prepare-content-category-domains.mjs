import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const metadata = JSON.parse(
  await readFile('rules/sources/content-category-domains.pinned.json', 'utf8')
);

const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeDomain(value) {
  const domain = String(value).trim().toLowerCase().replace(/\.$/, '');
  if (!domain || domain.length > 253 || !domain.includes('.')) return null;
  const labels = domain.split('.');
  if (labels.some((label) => !DOMAIN_LABEL.test(label))) return null;
  return domain;
}

async function fetchPinned(entry) {
  const response = await fetch(entry.url, {
    redirect: 'error',
    headers: { 'user-agent': 'Jammer-build-pipeline/0.10' }
  });

  if (!response.ok) {
    throw new Error(`${entry.category} content-domain source fetch failed: HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== entry.expectedSizeBytes) {
    throw new Error(
      `${entry.category} source size mismatch: expected ${entry.expectedSizeBytes}, got ${bytes.length}`
    );
  }

  const gitHeader = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  const gitBlobSha1 = createHash('sha1')
    .update(gitHeader)
    .update(bytes)
    .digest('hex');

  if (gitBlobSha1 !== entry.expectedGitBlobSha1) {
    throw new Error(
      `${entry.category} Git blob mismatch: expected ${entry.expectedGitBlobSha1}, got ${gitBlobSha1}`
    );
  }

  const domains = new Set();
  for (const rawLine of bytes.toString('utf8').replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    const candidate = parts.length >= 2 ? parts[1] : parts[0];
    const domain = normalizeDomain(candidate);
    if (!domain || domain === 'localhost' || domain.endsWith('.localhost')) continue;
    domains.add(domain);
  }

  if (domains.size !== entry.expectedDomains) {
    throw new Error(
      `${entry.category} domain baseline changed: expected ${entry.expectedDomains}, got ${domains.size}`
    );
  }

  return {
    domains: [...domains].sort((a, b) => a.localeCompare(b)),
    report: {
      category: entry.category,
      path: entry.path,
      sizeBytes: bytes.length,
      gitBlobSha1,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      domains: domains.size
    }
  };
}

const output = {};
const reports = [];

for (const entry of metadata.sources) {
  const result = await fetchPinned(entry);
  output[entry.category] = result.domains;
  reports.push(result.report);
}

const jsPath = resolve('generated/content-category-domains.js');
const reportPath = resolve('generated/content-category-domains.report.json');
await mkdir(dirname(jsPath), { recursive: true });

await writeFile(
  jsPath,
  `globalThis.JammerContentCategoryDomains = ${JSON.stringify(output)};\n`
);

await writeFile(
  reportPath,
  JSON.stringify({
    repository: metadata.repository,
    commit: metadata.commit,
    license: metadata.license,
    runtimeUpdate: false,
    sources: reports
  }, null, 2) + '\n'
);

console.log(
  `content-category-domains: PASS gambling=${output.gambling.length} explicit=${output.explicit.length}`
);
