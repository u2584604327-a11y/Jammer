const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function normalizeRuleDomain(value) {
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

function parseHostsLine(line) {
  const match = /^(?:0\.0\.0\.0|127\.0\.0\.1)\s+([^\s#]+)(?:\s+#.*)?$/.exec(line);
  return match ? match[1] : null;
}

function parseAdblockDomainLine(line) {
  const match = /^\|\|([a-zA-Z0-9.-]+)\^$/.exec(line);
  return match ? match[1] : null;
}

function rejectReason(line, format) {
  if (line.startsWith('@@')) return 'exception-rule-not-supported';
  if (line.includes('##') || line.includes('#@#')) return 'cosmetic-rule-not-supported';
  if (line.includes('$')) return 'adblock-modifier-not-supported';
  if (line.startsWith('/') && line.endsWith('/')) return 'regex-rule-not-supported';
  if (line.includes('*')) return 'wildcard-rule-not-supported';
  if (line.startsWith('||')) return 'complex-adblock-rule-not-supported';
  if (format === 'domains') return 'invalid-domain';
  return 'unsupported-syntax';
}

export function parseRuleSource(text, metadata) {
  const format = metadata?.format ?? 'mixed-domain';
  const accepted = [];
  const rejected = [];
  let duplicates = 0;
  const seen = new Set();

  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trim();
    const lineNumber = index + 1;

    if (!line || line.startsWith('!') || /^\[.*\]$/.test(line)) continue;

    let candidate = parseHostsLine(line) ?? parseAdblockDomainLine(line);
    if (!candidate && format === 'domains' && !/\s/.test(line)) {
      candidate = line;
    }

    if (!candidate) {
      rejected.push({ lineNumber, reason: rejectReason(line, format), line });
      continue;
    }

    let domain;
    try {
      domain = normalizeRuleDomain(candidate);
    } catch {
      rejected.push({ lineNumber, reason: 'invalid-domain', line });
      continue;
    }

    if (seen.has(domain)) {
      duplicates += 1;
      continue;
    }

    seen.add(domain);
    accepted.push(domain);
  }

  accepted.sort((a, b) => a.localeCompare(b));
  return { accepted, rejected, duplicates };
}

function fnv1a32(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function fnv1a31(value) {
  const positive = fnv1a32(value) & 0x7fffffff;
  return positive === 0 ? 1 : positive;
}

export function assignStableRuleIds(domains) {
  const used = new Set();
  const ids = new Map();

  for (const domain of [...domains].sort((a, b) => a.localeCompare(b))) {
    let id = fnv1a31(domain);
    while (used.has(id)) {
      id += 1;
      if (id > 0x7fffffff) id = 1;
    }
    used.add(id);
    ids.set(domain, id);
  }

  return ids;
}

export function compileDnrRules(text, metadata) {
  validateMetadata(metadata);
  const parsed = parseRuleSource(text, metadata);
  const ids = assignStableRuleIds(parsed.accepted);

  const rules = parsed.accepted.map((domain) => ({
    id: ids.get(domain),
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `||${domain}^`
    }
  }));

  return {
    rules,
    report: {
      source: metadata,
      accepted: rules.length,
      duplicates: parsed.duplicates,
      rejected: parsed.rejected.length,
      rejectedLines: parsed.rejected
    }
  };
}

export function bucketDomains(domains, bucketCount = 256) {
  if (!Number.isInteger(bucketCount) || bucketCount < 1 || bucketCount > 4096) {
    throw new Error('invalid-bucket-count');
  }

  const buckets = Array.from({ length: bucketCount }, () => []);
  for (const domain of [...domains].sort((a, b) => a.localeCompare(b))) {
    const index = fnv1a32(domain) % bucketCount;
    buckets[index].push(domain);
  }

  return buckets;
}

export function compileDnrRequestDomainBuckets(text, metadata, options = {}) {
  validateMetadata(metadata);
  const bucketCount = options.bucketCount ?? 256;
  const ruleIdBase = options.ruleIdBase ?? 10_000_000;

  if (!Number.isInteger(ruleIdBase) || ruleIdBase < 1 || ruleIdBase > 0x7fffffff) {
    throw new Error('invalid-rule-id-base');
  }
  if (ruleIdBase + bucketCount - 1 > 0x7fffffff) {
    throw new Error('rule-id-range-overflow');
  }

  const parsed = parseRuleSource(text, metadata);
  const buckets = bucketDomains(parsed.accepted, bucketCount);
  const rules = [];

  for (let index = 0; index < buckets.length; index += 1) {
    const domains = buckets[index];
    if (domains.length === 0) continue;

    rules.push({
      id: ruleIdBase + index,
      priority: 1,
      action: { type: 'block' },
      condition: {
        requestDomains: domains
      }
    });
  }

  const sizes = rules.map((rule) => rule.condition.requestDomains.length);

  return {
    rules,
    report: {
      source: metadata,
      mode: 'requestDomains-buckets',
      acceptedDomains: parsed.accepted.length,
      duplicates: parsed.duplicates,
      rejected: parsed.rejected.length,
      rejectedLines: parsed.rejected,
      requestedBucketCount: bucketCount,
      emittedRules: rules.length,
      minDomainsPerRule: sizes.length ? Math.min(...sizes) : 0,
      maxDomainsPerRule: sizes.length ? Math.max(...sizes) : 0,
      averageDomainsPerRule: sizes.length
        ? Number((parsed.accepted.length / sizes.length).toFixed(2))
        : 0
    }
  };
}

export function validateMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') throw new Error('metadata-required');
  for (const field of ['id', 'title', 'format', 'provenance', 'license']) {
    if (typeof metadata[field] !== 'string' || !metadata[field].trim()) {
      throw new Error(`metadata-${field}-required`);
    }
  }
  if (metadata.remoteUpdate !== false) {
    throw new Error('runtime-remote-update-must-be-false');
  }
}


const NETWORK_RESOURCE_TYPE_MAP = {
  script: 'script',
  image: 'image',
  stylesheet: 'stylesheet',
  xmlhttprequest: 'xmlhttprequest',
  subdocument: 'sub_frame',
  document: 'main_frame',
  font: 'font',
  media: 'media',
  object: 'object',
  ping: 'ping',
  websocket: 'websocket',
  other: 'other'
};

function parseEasyListNetworkPatternLine(line) {
  if (!line || line.startsWith('!') || /^\[.*\]$/.test(line)) return { kind: 'skip' };
  if (line.startsWith('@@')) return { kind: 'reject', reason: 'exception-rule-not-supported' };
  if (
    line.includes('##') ||
    line.includes('#@#') ||
    line.includes('#?#') ||
    line.includes('#$#')
  ) {
    return { kind: 'reject', reason: 'cosmetic-rule-not-supported' };
  }
  if (line.startsWith('/') && /^\/.*\/[a-z]*$/i.test(line)) {
    return { kind: 'reject', reason: 'regex-rule-not-supported' };
  }

  const modifierIndex = line.indexOf('$');
  const urlFilter = (modifierIndex >= 0 ? line.slice(0, modifierIndex) : line).trim();
  const modifiers = (modifierIndex >= 0 ? line.slice(modifierIndex + 1) : '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!urlFilter || urlFilter.length > 500 || /\s/.test(urlFilter)) {
    return { kind: 'reject', reason: 'invalid-url-filter' };
  }

  const resourceTypes = [];
  const excludedResourceTypes = [];
  let domainType;
  let priority = 1;
  let isUrlFilterCaseSensitive = false;

  for (const modifier of modifiers) {
    if (modifier === 'third-party') {
      domainType = 'thirdParty';
      continue;
    }
    if (modifier === '~third-party') {
      domainType = 'firstParty';
      continue;
    }
    if (modifier === 'important') {
      priority = 2;
      continue;
    }
    if (modifier === 'match-case') {
      isUrlFilterCaseSensitive = true;
      continue;
    }

    const excluded = modifier.startsWith('~');
    const key = excluded ? modifier.slice(1) : modifier;
    const mapped = NETWORK_RESOURCE_TYPE_MAP[key];
    if (mapped) {
      (excluded ? excludedResourceTypes : resourceTypes).push(mapped);
      continue;
    }

    return { kind: 'reject', reason: 'unsupported-modifier' };
  }

  const condition = { urlFilter };
  if (isUrlFilterCaseSensitive) condition.isUrlFilterCaseSensitive = true;

  const uniqueIncluded = [...new Set(resourceTypes)].sort();
  const uniqueExcluded = [...new Set(excludedResourceTypes)].sort();

  if (uniqueIncluded.length > 0) {
    condition.resourceTypes = uniqueIncluded;
  } else if (!uniqueExcluded.includes('main_frame')) {
    uniqueExcluded.push('main_frame');
  }

  if (uniqueExcluded.length > 0) {
    condition.excludedResourceTypes = uniqueExcluded.sort();
  }
  if (domainType) condition.domainType = domainType;

  return {
    kind: 'accept',
    rule: {
      priority,
      action: { type: 'block' },
      condition
    }
  };
}

export function compileEasyListNetworkPatternRules(sources) {
  const accepted = new Map();
  const rejected = [];
  let skipped = 0;

  for (const source of sources) {
    const lines = String(source.text).replace(/\r\n?/g, '\n').split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      const parsed = parseEasyListNetworkPatternLine(line);

      if (parsed.kind === 'skip') {
        skipped += 1;
        continue;
      }
      if (parsed.kind === 'reject') {
        rejected.push({
          source: source.path,
          lineNumber: index + 1,
          reason: parsed.reason,
          line
        });
        continue;
      }

      const key = JSON.stringify(parsed.rule);
      if (!accepted.has(key)) accepted.set(key, parsed.rule);
    }
  }

  const ordered = [...accepted.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, rule], index) => ({
      id: index + 1,
      ...rule
    }));

  return {
    rules: ordered,
    report: {
      mode: 'easylist-urlFilter-patterns',
      emittedRules: ordered.length,
      rejected: rejected.length,
      skipped,
      rejectedLines: rejected
    }
  };
}
