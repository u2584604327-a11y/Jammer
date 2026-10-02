import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const metadata = JSON.parse(
  await readFile('rules/sources/ublock-security.pinned.json', 'utf8')
);

const RESOURCE_TYPES = {
  script: 'script',
  image: 'image',
  stylesheet: 'stylesheet',
  css: 'stylesheet',
  xmlhttprequest: 'xmlhttprequest',
  xhr: 'xmlhttprequest',
  subdocument: 'sub_frame',
  frame: 'sub_frame',
  font: 'font',
  media: 'media',
  object: 'object',
  ping: 'ping',
  websocket: 'websocket',
  other: 'other',
  document: 'main_frame',
  doc: 'main_frame'
};

const ALL_RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'media',
  'websocket',
  'other'
];

const DEFAULT_SUBRESOURCE_TYPES = ALL_RESOURCE_TYPES.filter((type) => type !== 'main_frame');
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeDomain(value) {
  const domain = value.trim().toLowerCase().replace(/\.$/, '');
  if (!domain || domain.length > 253 || !domain.includes('.')) throw new Error('invalid-domain');
  if (domain.split('.').some((label) => !DOMAIN_LABEL.test(label))) throw new Error('invalid-domain');
  return domain;
}

function parseDomainList(value) {
  const included = [];
  const excluded = [];

  for (const raw of value.split('|')) {
    if (!raw) continue;
    const negate = raw.startsWith('~');
    const domain = normalizeDomain(negate ? raw.slice(1) : raw);
    (negate ? excluded : included).push(domain);
  }

  return {
    included: [...new Set(included)],
    excluded: [...new Set(excluded)]
  };
}

async function fetchPinned(entry) {
  const response = await fetch(entry.url, {
    redirect: 'error',
    headers: { 'user-agent': 'Jammer-build-pipeline/0.10' }
  });

  if (!response.ok) throw new Error(`${entry.id} fetch failed: HTTP ${response.status}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== entry.expectedSizeBytes) {
    throw new Error(`${entry.id} size mismatch: expected ${entry.expectedSizeBytes}, got ${bytes.length}`);
  }

  const gitHeader = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  const gitBlobSha1 = createHash('sha1').update(gitHeader).update(bytes).digest('hex');
  if (gitBlobSha1 !== entry.expectedGitBlobSha1) {
    throw new Error(`${entry.id} Git blob mismatch: expected ${entry.expectedGitBlobSha1}, got ${gitBlobSha1}`);
  }

  return {
    text: bytes.toString('utf8'),
    sizeBytes: bytes.length,
    gitBlobSha1,
    sha256: createHash('sha256').update(bytes).digest('hex')
  };
}

function compileLine(line, id) {
  if (line.startsWith('@@')) return { rejected: 'exception-rule' };

  const optionIndex = line.lastIndexOf('$');
  const pattern = (optionIndex >= 0 ? line.slice(0, optionIndex) : line).trim();
  const options = optionIndex >= 0
    ? line.slice(optionIndex + 1).split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  if (!pattern || pattern.length > 1024) return { rejected: 'invalid-pattern' };

  if (options.some((option) =>
    option === 'popup' ||
    option === 'badfilter' ||
    option.startsWith('redirect=') ||
    option.startsWith('redirect-rule=') ||
    option.startsWith('rewrite=') ||
    option.startsWith('removeparam=') ||
    option.startsWith('csp=') ||
    option.startsWith('header=')
  )) {
    return { rejected: 'unsupported-action' };
  }

  const includeTypes = [];
  const excludeTypes = [];
  const initiatorDomains = [];
  const excludedInitiatorDomains = [];
  const requestDomains = [];
  const excludedRequestDomains = [];
  const requestMethods = [];

  let domainType;
  let allTypes = false;
  let caseSensitive = false;
  let priority = 50;

  for (let option of options) {
    if (option === '3p') option = 'third-party';
    if (option === '~3p' || option === '1p') option = '~third-party';
    if (option === 'strict3p') option = 'third-party';
    if (option === 'strict1p') option = '~third-party';

    if (option === 'third-party') {
      domainType = 'thirdParty';
      continue;
    }
    if (option === '~third-party') {
      domainType = 'firstParty';
      continue;
    }
    if (option === 'all') {
      allTypes = true;
      continue;
    }
    if (option === 'important') {
      priority = 100;
      continue;
    }
    if (option === 'match-case') {
      caseSensitive = true;
      continue;
    }

    if (option.startsWith('domain=') || option.startsWith('from=')) {
      const raw = option.slice(option.indexOf('=') + 1);
      let parsed;
      try { parsed = parseDomainList(raw); }
      catch { return { rejected: 'invalid-initiator-domain' }; }
      initiatorDomains.push(...parsed.included);
      excludedInitiatorDomains.push(...parsed.excluded);
      continue;
    }

    if (option.startsWith('to=')) {
      let parsed;
      try { parsed = parseDomainList(option.slice(3)); }
      catch { return { rejected: 'invalid-request-domain' }; }
      requestDomains.push(...parsed.included);
      excludedRequestDomains.push(...parsed.excluded);
      continue;
    }

    if (option.startsWith('method=')) {
      const methods = option.slice('method='.length).split('|').map((item) => item.toLowerCase());
      if (methods.some((method) => !['connect','delete','get','head','options','patch','post','put'].includes(method))) {
        return { rejected: 'invalid-method' };
      }
      requestMethods.push(...methods);
      continue;
    }

    const excluded = option.startsWith('~');
    const name = excluded ? option.slice(1) : option;
    const mapped = RESOURCE_TYPES[name];
    if (!mapped) return { rejected: 'unsupported-modifier' };
    (excluded ? excludeTypes : includeTypes).push(mapped);
  }

  let resourceTypes;
  if (allTypes) resourceTypes = [...ALL_RESOURCE_TYPES];
  else if (includeTypes.length > 0) resourceTypes = [...new Set(includeTypes)];
  else if (excludeTypes.length > 0) {
    resourceTypes = DEFAULT_SUBRESOURCE_TYPES.filter((type) => !excludeTypes.includes(type));
  } else resourceTypes = [...DEFAULT_SUBRESOURCE_TYPES];

  if (resourceTypes.length === 0) return { rejected: 'empty-resource-types' };

  const condition = { urlFilter: pattern, resourceTypes };
  if (domainType) condition.domainType = domainType;
  if (caseSensitive) condition.isUrlFilterCaseSensitive = true;
  if (initiatorDomains.length) condition.initiatorDomains = [...new Set(initiatorDomains)];
  if (excludedInitiatorDomains.length) condition.excludedInitiatorDomains = [...new Set(excludedInitiatorDomains)];
  if (requestDomains.length) condition.requestDomains = [...new Set(requestDomains)];
  if (excludedRequestDomains.length) condition.excludedRequestDomains = [...new Set(excludedRequestDomains)];
  if (requestMethods.length) condition.requestMethods = [...new Set(requestMethods)];

  return {
    rule: {
      id,
      priority,
      action: { type: 'block' },
      condition
    }
  };
}

const rules = [];
const reports = [];

for (const entry of metadata.sources) {
  const pinned = await fetchPinned(entry);
  const accepted = [];
  const rejected = [];
  let nextId = entry.ruleIdBase;

  const lines = pinned.text.replace(/\r\n?/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('!') || /^\[.*\]$/.test(line)) continue;

    const result = compileLine(line, nextId);
    if (result.rule) {
      accepted.push(result.rule);
      nextId += 1;
    } else {
      rejected.push({ lineNumber: index + 1, reason: result.rejected, line });
    }
  }

  if (accepted.length !== entry.expectedAccepted) {
    throw new Error(`${entry.id} accepted baseline changed: expected ${entry.expectedAccepted}, got ${accepted.length}`);
  }
  if (rejected.length !== entry.expectedRejected) {
    throw new Error(`${entry.id} rejected baseline changed: expected ${entry.expectedRejected}, got ${rejected.length}`);
  }

  rules.push(...accepted);
  reports.push({
    id: entry.id,
    path: entry.path,
    sizeBytes: pinned.sizeBytes,
    gitBlobSha1: pinned.gitBlobSha1,
    sha256: pinned.sha256,
    accepted: accepted.length,
    rejected: rejected.length,
    rejectedLines: rejected
  });
}

if (rules.length !== metadata.expectedTotalRules) {
  throw new Error(`security rules baseline changed: expected ${metadata.expectedTotalRules}, got ${rules.length}`);
}

const rulesPath = resolve('generated/ublock-security.rules.json');
const reportPath = resolve('generated/ublock-security.report.json');
await mkdir(dirname(rulesPath), { recursive: true });

await writeFile(rulesPath, JSON.stringify(rules, null, 2) + '\n');
await writeFile(reportPath, JSON.stringify({
  repository: metadata.repository,
  commit: metadata.commit,
  license: metadata.license,
  runtimeUpdate: false,
  output: {
    rules: rules.length,
    sources: reports
  }
}, null, 2) + '\n');

console.log(`ublock-security: PASS rules=${rules.length}`);
