import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const rulesSource = resolve('generated/easylist-adservers.rules.json');
const reportSource = resolve('generated/easylist-adservers.report.json');
const sentinelSource = resolve('fixtures/easylist-smoke/sentinel.json');

for (const path of [rulesSource, reportSource, sentinelSource]) {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) {
    throw new Error('Missing generated EasyList rules. Run npm run rules:prepare:easylist first.');
  }
}

const rules = JSON.parse(await readFile(rulesSource, 'utf8'));
const report = JSON.parse(await readFile(reportSource, 'utf8'));

if (rules.length !== 256) {
  throw new Error(`Unexpected smoke ruleset count: ${rules.length}`);
}

for (const rule of rules) {
  if (rule.action?.type !== 'block') {
    throw new Error('Smoke ruleset contains a non-block action');
  }
  if (!Array.isArray(rule.condition?.requestDomains) || rule.condition.requestDomains.length === 0) {
    throw new Error('Smoke ruleset contains an invalid requestDomains condition');
  }
}

const out = resolve('dist-easylist-smoke');
await rm(out, { recursive: true, force: true });
await mkdir(resolve(out, 'rules'), { recursive: true });

await cp(rulesSource, resolve(out, 'rules/easylist-adservers.json'));
await cp(reportSource, resolve(out, 'PROVENANCE.json'));
await cp(sentinelSource, resolve(out, 'rules/smoke-sentinel.json'));

const manifest = {
  manifest_version: 3,
  name: 'Jammer EasyList smoke build',
  version: '0.0.2',
  description: 'Pinned EasyList build-time smoke profile for Jammer validation.',
  permissions: ['declarativeNetRequest'],
  action: {
    default_title: 'Jammer EasyList smoke build',
    default_popup: 'popup.html'
  },
  declarative_net_request: {
    rule_resources: [
      {
        id: 'easylist_adservers',
        enabled: true,
        path: 'rules/easylist-adservers.json'
      },
      {
        id: 'smoke_sentinel',
        enabled: true,
        path: 'rules/smoke-sentinel.json'
      }
    ]
  },
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'none'; connect-src 'none'"
  }
};

const popup = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jammer EasyList smoke</title>
<style>body{font-family:system-ui,sans-serif;min-width:310px;padding:14px;line-height:1.45}code{word-break:break-all}</style></head>
<body>
<h1>Jammer EasyList smoke</h1>
<p>Rules: ${rules.length} requestDomains buckets</p>
<p>Accepted domains: ${report.compiler.acceptedDomains}</p>
<p>Pinned commit:<br><code>${report.source.commit}</code></p>
<p>Runtime network updates: none</p>\n<p><strong>Sentinel test:</strong> with this smoke extension enabled, <code>https://example.com/</code> must be blocked. Disable the whole extension and it must load normally.</p>
</body>
</html>`;

const notice = `Jammer EasyList smoke build

This validation build contains rules generated at build time from:
EasyList repository: ${report.source.repository}
Pinned commit: ${report.source.commit}
Source path: ${report.source.path}
SHA-256: ${report.source.sha256}

License declared for this reviewed repository component:
${report.license}

Attribution:
The EasyList authors

License information:
https://easylist.to/pages/licence.html

This smoke profile is for Jammer compatibility validation and is not the normal product build.\n\nA repository-owned sentinel rule blocks example.com only in this smoke profile so local environments with DNS-level ad blocking can verify the ruleset deterministically.
`;

await writeFile(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(resolve(out, 'popup.html'), popup);
await writeFile(resolve(out, 'THIRD_PARTY_NOTICES.txt'), notice);

console.log(
  `easylist-smoke-build: PASS rules=${rules.length} domains=${report.compiler.acceptedDomains}`
);
