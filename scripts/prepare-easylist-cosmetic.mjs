import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const metadata = JSON.parse(
  await readFile('rules/sources/easylist-cosmetic.pinned.json', 'utf8')
);

async function fetchPinned(entry, label) {
  const response = await fetch(entry.url, {
    redirect: 'error',
    headers: { 'user-agent': 'Jammer-build-pipeline/0.1' }
  });

  if (!response.ok) {
    throw new Error(`${label} fetch failed: HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());

  if (bytes.length !== entry.expectedSizeBytes) {
    throw new Error(
      `${label} size mismatch: expected ${entry.expectedSizeBytes}, got ${bytes.length}`
    );
  }

  const gitHeader = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  const gitBlobSha1 = createHash('sha1')
    .update(gitHeader)
    .update(bytes)
    .digest('hex');

  if (gitBlobSha1 !== entry.expectedGitBlobSha1) {
    throw new Error(
      `${label} Git blob SHA-1 mismatch: expected ${entry.expectedGitBlobSha1}, got ${gitBlobSha1}`
    );
  }

  return {
    text: bytes.toString('utf8'),
    gitBlobSha1,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sizeBytes: bytes.length
  };
}

function isSafeCssSelector(selector) {
  if (!selector) return false;
  if (/[{}]/.test(selector)) return false;
  if (/\/\*|\*\//.test(selector)) return false;
  if (/^@/.test(selector)) return false;
  if (/:has-text|:matches-css|:xpath|:contains\(|:-abp/i.test(selector)) return false;
  return true;
}

function renderCss(selectors, heading) {
  const lines = [
    '/*',
    ` * ${heading}`,
    ' * Generated at build time from the pinned EasyList snapshot.',
    ' * No runtime network update.',
    ' */',
    ''
  ];

  for (const selector of selectors) {
    lines.push(
      `${selector} { display: none !important; visibility: hidden !important; }`
    );
  }

  return lines.join('\n') + '\n';
}

const general = await fetchPinned(metadata.generalHide, 'EasyList general hide');
const specific = await fetchPinned(metadata.specificHide, 'EasyList specific hide');

const generalSelectors = [];
const rejectedGeneral = [];

for (const rawLine of general.text.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('!')) continue;

  if (!line.startsWith('##')) {
    rejectedGeneral.push({ line, reason: 'unsupported-prefix' });
    continue;
  }

  const selector = line.slice(2).trim();
  if (!isSafeCssSelector(selector)) {
    rejectedGeneral.push({ line, reason: 'unsupported-selector' });
    continue;
  }

  generalSelectors.push(selector);
}

if (generalSelectors.length !== metadata.generalHide.expectedSelectors) {
  throw new Error(
    `EasyList general cosmetic baseline changed: expected ${metadata.generalHide.expectedSelectors}, got ${generalSelectors.length}`
  );
}

if (rejectedGeneral.length !== 0) {
  throw new Error(
    `EasyList general cosmetic parser rejected ${rejectedGeneral.length} unexpected rules`
  );
}

const canYouBlockItSelectors = [];
for (const rawLine of specific.text.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line.startsWith('canyoublockit.com##')) continue;

  const selector = line.slice('canyoublockit.com##'.length).trim();
  if (!isSafeCssSelector(selector)) {
    throw new Error(`Unsupported canyoublockit.com selector: ${selector}`);
  }

  canYouBlockItSelectors.push(selector);
}

if (canYouBlockItSelectors.length === 0) {
  throw new Error('Pinned EasyList no longer contains the canyoublockit.com cosmetic regression rule');
}

const generalPath = resolve('generated/easylist-general-hide.css');
const sitePath = resolve('generated/easylist-canyoublockit.css');
const reportPath = resolve('generated/easylist-cosmetic.report.json');

await mkdir(dirname(generalPath), { recursive: true });

await writeFile(
  generalPath,
  renderCss(generalSelectors, 'EasyList generic cosmetic selectors')
);

await writeFile(
  sitePath,
  renderCss(canYouBlockItSelectors, 'EasyList canyoublockit.com site-specific selectors')
);

const report = {
  source: {
    repository: metadata.repository,
    commit: metadata.commit,
    generalHide: {
      path: metadata.generalHide.path,
      sizeBytes: general.sizeBytes,
      gitBlobSha1: general.gitBlobSha1,
      sha256: general.sha256
    },
    specificHide: {
      path: metadata.specificHide.path,
      sizeBytes: specific.sizeBytes,
      gitBlobSha1: specific.gitBlobSha1,
      sha256: specific.sha256
    }
  },
  license: metadata.license,
  attribution: metadata.attribution,
  runtimeUpdate: false,
  output: {
    genericSelectors: generalSelectors.length,
    canYouBlockItSelectors: canYouBlockItSelectors.length
  }
};

await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');

console.log(
  `easylist-cosmetic: PASS generic=${generalSelectors.length} canyoublockit=${canYouBlockItSelectors.length}`
);
