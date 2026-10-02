import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const metadata = JSON.parse(
  await readFile('rules/sources/easyprivacy-network-extended.pinned.json', 'utf8')
);

const RESOURCE_TYPES = {
  script: 'script',
  image: 'image',
  stylesheet: 'stylesheet',
  xmlhttprequest: 'xmlhttprequest',
  subdocument: 'sub_frame',
  font: 'font',
  media: 'media',
  object: 'object',
  ping: 'ping',
  websocket: 'websocket',
  other: 'other'
};

const DEFAULT_SUBRESOURCE_TYPES = [
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

const DOMAIN_RE = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

function normalizeDomain(value) {
  const domain = value.trim().toLowerCase().replace(/\.$/, '');
  if (!domain || domain.length > 253 || !domain.includes('.') || !DOMAIN_RE.test(domain)) {
    throw new Error('invalid-domain');
  }
  return domain;
}

async function fetchPinned(entry) {
  const response = await fetch(entry.url, {
    redirect: 'error',
    headers: { 'user-agent': 'Jammer-build-pipeline/0.9' }
  });
  if (!response.ok) throw new Error(`${entry.id} fetch failed: HTTP ${response.status}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  const gitHeader = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  const gitBlobSha1 = createHash('sha1').update(gitHeader).update(bytes).digest('hex');

  if (gitBlobSha1 !== entry.expectedGitBlobSha1) {
    throw new Error(
      `${entry.id} Git blob mismatch: expected ${entry.expectedGitBlobSha1}, got ${gitBlobSha1}`
    );
  }

  return {
    text: bytes.toString('utf8'),
    sizeBytes: bytes.length,
    gitBlobSha1,
    sha256: createHash('sha256').update(bytes).digest('hex')
  };
}

function parseDomainModifier(value) {
  const included = [];
  const excluded = [];

  for (const raw of value.split('|')) {
    if (!raw) continue;
    const negate = raw.startsWith('~');
    const normalized = normalizeDomain(negate ? raw.slice(1) : raw);
    (negate ? excluded : included).push(normalized);
  }

  return {
    included: [...new Set(included)],
    excluded: [...new Set(excluded)]
  };
}

function compileLine(line, id) {
  if (line.startsWith('@@')) return { rejected: 'exception-rule-not-supported' };
  if (line.includes('##') || line.includes('#@#')) return { rejected: 'cosmetic-rule-not-network' };

  const optionIndex = line.lastIndexOf('$');
  const pattern = (optionIndex >= 0 ? line.slice(0, optionIndex) : line).trim();
  const options = optionIndex >= 0
    ? line.slice(optionIndex + 1).split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  if (!pattern || pattern.length > 1024) return { rejected: 'invalid-url-filter' };
  if (pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2) {
    return { rejected: 'regex-filter-not-converted' };
  }

  if (
    options.some((option) =>
      option === 'popup' ||
      option === 'document' ||
      option === '~document' ||
      option.startsWith('rewrite=') ||
      option.startsWith('redirect=') ||
      option.startsWith('removeparam=') ||
      option.startsWith('csp=') ||
      option.startsWith('header=') ||
      option.startsWith('permissions=')
    )
  ) {
    return { rejected: 'unsupported-action-or-navigation-modifier' };
  }

  const includeTypes = [];
  const excludeTypes = [];
  let domainType;
  const initiatorDomains = [];
  const excludedInitiatorDomains = [];

  for (const option of options) {
    if (option === 'third-party') {
      domainType = 'thirdParty';
      continue;
    }
    if (option === '~third-party') {
      domainType = 'firstParty';
      continue;
    }

    if (option.startsWith('domain=')) {
      let parsed;
      try {
        parsed = parseDomainModifier(option.slice('domain='.length));
      } catch {
        return { rejected: 'invalid-domain-modifier' };
      }
      initiatorDomains.push(...parsed.included);
      excludedInitiatorDomains.push(...parsed.excluded);
      continue;
    }

    const excluded = option.startsWith('~');
    const resourceName = excluded ? option.slice(1) : option;
    const mapped = RESOURCE_TYPES[resourceName];

    if (!mapped) return { rejected: 'unsupported-modifier' };
    (excluded ? excludeTypes : includeTypes).push(mapped);
  }

  let resourceTypes;
  if (includeTypes.length > 0) {
    resourceTypes = [...new Set(includeTypes)];
  } else if (excludeTypes.length > 0) {
    resourceTypes = DEFAULT_SUBRESOURCE_TYPES.filter(
      (type) => !excludeTypes.includes(type)
    );
  } else {
    resourceTypes = [...DEFAULT_SUBRESOURCE_TYPES];
  }

  if (resourceTypes.length === 0) return { rejected: 'empty-resource-types' };

  const condition = {
    urlFilter: pattern,
    resourceTypes
  };
  if (domainType) condition.domainType = domainType;
  if (initiatorDomains.length > 0) condition.initiatorDomains = [...new Set(initiatorDomains)];
  if (excludedInitiatorDomains.length > 0) {
    condition.excludedInitiatorDomains = [...new Set(excludedInitiatorDomains)];
  }

  return {
    rule: {
      id,
      priority: 2,
      action: { type: 'block' },
      condition
    }
  };
}

function compileSource(text, entry) {
  const rules = [];
  const rejected = [];
  let nextId = entry.ruleIdBase;

  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('!') || /^\[.*\]$/.test(line)) continue;

    const result = compileLine(line, nextId);
    if (result.rule) {
      rules.push(result.rule);
      nextId += 1;
    } else {
      rejected.push({
        lineNumber: index + 1,
        reason: result.rejected,
        line
      });
    }
  }

  return { rules, rejected };
}

const allRules = [];
const sourceReports = [];

for (const entry of metadata.sources) {
  const pinned = await fetchPinned(entry);
  const compiled = compileSource(pinned.text, entry);

  if (compiled.rules.length !== entry.expectedAccepted) {
    throw new Error(
      `${entry.id} accepted baseline changed: expected ${entry.expectedAccepted}, got ${compiled.rules.length}`
    );
  }
  if (compiled.rejected.length !== entry.expectedRejected) {
    throw new Error(
      `${entry.id} rejected baseline changed: expected ${entry.expectedRejected}, got ${compiled.rejected.length}`
    );
  }

  allRules.push(...compiled.rules);
  sourceReports.push({
    id: entry.id,
    path: entry.path,
    sizeBytes: pinned.sizeBytes,
    gitBlobSha1: pinned.gitBlobSha1,
    sha256: pinned.sha256,
    accepted: compiled.rules.length,
    rejected: compiled.rejected.length,
    rejectedLines: compiled.rejected
  });
}

if (allRules.length !== metadata.expectedTotalRules) {
  throw new Error(
    `Extended EasyPrivacy total changed: expected ${metadata.expectedTotalRules}, got ${allRules.length}`
  );
}

const rulesPath = resolve('generated/easyprivacy-network-extended.rules.json');
const reportPath = resolve('generated/easyprivacy-network-extended.report.json');
await mkdir(dirname(rulesPath), { recursive: true });
await writeFile(rulesPath, JSON.stringify(allRules, null, 2) + '\n');
await writeFile(
  reportPath,
  JSON.stringify({
    repository: metadata.repository,
    commit: metadata.commit,
    license: metadata.license,
    runtimeUpdate: false,
    scope: {
      mainFrameBlocked: false,
      purpose: 'tracking, analytics, beacon, email-pixel and privacy endpoint subresources'
    },
    output: {
      rules: allRules.length,
      sources: sourceReports
    }
  }, null, 2) + '\n'
);

console.log(
  `easyprivacy-network-extended: PASS rules=${allRules.length} sources=${sourceReports.length}`
);
