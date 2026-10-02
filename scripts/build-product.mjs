import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runTsc } from './run-tsc.mjs';

await import('./generate-brand-assets.mjs');

const rulesSource = resolve('generated/easylist-adservers.rules.json');
const reportSource = resolve('generated/easylist-adservers.report.json');
const extendedRulesSource = resolve('generated/easylist-network-extended.rules.json');
const extendedReportSource = resolve('generated/easylist-network-extended.report.json');
const privacyRulesSource = resolve('generated/easyprivacy-tracking.rules.json');
const privacyReportSource = resolve('generated/easyprivacy-tracking.report.json');
const phishingRulesSource = resolve('generated/phishing-active.rules.json');
const phishingReportSource = resolve('generated/phishing-active.report.json');
const securityRulesSource = resolve('generated/ublock-security.rules.json');
const securityReportSource = resolve('generated/ublock-security.report.json');
const contentDomainsSource = resolve('generated/content-category-domains.js');
const contentDomainsReportSource = resolve('generated/content-category-domains.report.json');
const cosmeticGeneralSource = resolve('generated/easylist-general-hide.css');
const cosmeticSiteSource = resolve('generated/easylist-canyoublockit.css');
const cosmeticSpecificSource = resolve('generated/easylist-specific-hide.rules.js');
const cosmeticReportSource = resolve('generated/easylist-cosmetic.report.json');

for (const path of [
  rulesSource,
  reportSource,
  extendedRulesSource,
  extendedReportSource,
  privacyRulesSource,
  privacyReportSource,
  phishingRulesSource,
  phishingReportSource,
  securityRulesSource,
  securityReportSource,
  contentDomainsSource,
  contentDomainsReportSource,
  cosmeticGeneralSource,
  cosmeticSiteSource,
  cosmeticSpecificSource,
  cosmeticReportSource
]) {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) {
    throw new Error('Missing generated EasyList rules. Run npm run rules:prepare:easylist first.');
  }
}

const rules = JSON.parse(await readFile(rulesSource, 'utf8'));
const report = JSON.parse(await readFile(reportSource, 'utf8'));
const extendedRules = JSON.parse(await readFile(extendedRulesSource, 'utf8'));
const extendedReport = JSON.parse(await readFile(extendedReportSource, 'utf8'));
const privacyRules = JSON.parse(await readFile(privacyRulesSource, 'utf8'));
const privacyReport = JSON.parse(await readFile(privacyReportSource, 'utf8'));
const phishingRules = JSON.parse(await readFile(phishingRulesSource, 'utf8'));
const phishingReport = JSON.parse(await readFile(phishingReportSource, 'utf8'));
const securityRules = JSON.parse(await readFile(securityRulesSource, 'utf8'));
const securityReport = JSON.parse(await readFile(securityReportSource, 'utf8'));
const contentDomainsReport = JSON.parse(await readFile(contentDomainsReportSource, 'utf8'));
const cosmeticReport = JSON.parse(await readFile(cosmeticReportSource, 'utf8'));

if (rules.length !== 256 || report.compiler.acceptedDomains !== 42940) {
  throw new Error('Unexpected EasyList product baseline');
}

if (extendedRules.length !== 3718 || extendedReport.output.rules !== 3718) {
  throw new Error('Unexpected extended EasyList network baseline');
}

if (privacyRules.length !== 64 || privacyReport.compiler.acceptedDomains !== 534) {
  throw new Error('Unexpected EasyPrivacy product baseline');
}

if (phishingRules.length !== 64 || phishingReport.compiler.acceptedDomains !== 21552) {
  throw new Error('Unexpected phishing navigation baseline');
}

if (securityRules.length !== 4389 || securityReport.output.rules !== 4389) {
  throw new Error('Unexpected badware/resource-abuse security baseline');
}

if (cosmeticReport.output.specificRules !== 8606 || cosmeticReport.output.specificDomains !== 6552) {
  throw new Error('Unexpected EasyList site-specific cosmetic baseline');
}

await rm('.build-js', { recursive: true, force: true });
await rm('dist-product', { recursive: true, force: true });

runTsc(['-p', 'tsconfig.build.json']);

await mkdir('dist-product/rules', { recursive: true });
await mkdir('dist-product/icons', { recursive: true });
await mkdir('dist-product/assets', { recursive: true });
await cp('.build-js', 'dist-product', { recursive: true });
await cp('src/styles.css', 'dist-product/styles.css');
await cp('assets/brand/jammer-cover.webp', 'dist-product/assets/jammer-cover.webp');
for (const size of [16, 32, 48, 128]) {
  await cp(`generated/brand/icon-${size}.png`, `dist-product/icons/icon-${size}.png`);
}
await cp('src/cosmetic.css', 'dist-product/cosmetic.css');
await cp(cosmeticGeneralSource, 'dist-product/cosmetic-easylist.css');
await cp(cosmeticSiteSource, 'dist-product/cosmetic-canyoublockit.css');
await cp('src/cosmetic-canyoublockit-local.css', 'dist-product/cosmetic-canyoublockit-local.css');
await cp(cosmeticSpecificSource, 'dist-product/cosmetic-specific-rules.js');
await cp(contentDomainsSource, 'dist-product/content-category-domains.js');
await cp('options.html', 'dist-product/options.html');

let popupHtml = await readFile('popup.html', 'utf8');
popupHtml = popupHtml.replace('Build: p65-high-coverage-dev', 'Build: p65-high-coverage-product');
await writeFile('dist-product/popup.html', popupHtml);

const manifest = {
  manifest_version: 3,
  name: 'Jammer',
  version: '0.10.0',
  description: 'Local-first high-coverage ad, tracker, badware, phishing, secure-navigation, and selective content filtering.',
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png'
  },
  permissions: ['declarativeNetRequest', 'storage'],
  optional_permissions: ['scripting'],
  optional_host_permissions: ['http://*/*', 'https://*/*'],
  action: {
    default_title: 'Jammer',
    default_popup: 'popup.html',
    default_icon: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png'
    }
  },
  options_page: 'options.html',
  declarative_net_request: {
    rule_resources: [
      {
        id: 'ads_static',
        enabled: true,
        path: 'rules/easylist-adservers.json'
      },
      {
        id: 'ads_extended',
        enabled: true,
        path: 'rules/easylist-network-extended.json'
      },
      {
        id: 'privacy_static',
        enabled: true,
        path: 'rules/easyprivacy-tracking.json'
      },
      {
        id: 'phishing_static',
        enabled: true,
        path: 'rules/phishing-active.json'
      },
      {
        id: 'security_static',
        enabled: true,
        path: 'rules/ublock-security.json'
      }
    ]
  },
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'none'; connect-src 'none'"
  }
};

await writeFile('dist-product/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
await cp(rulesSource, 'dist-product/rules/easylist-adservers.json');
await cp(extendedRulesSource, 'dist-product/rules/easylist-network-extended.json');
await cp(privacyRulesSource, 'dist-product/rules/easyprivacy-tracking.json');
await cp(phishingRulesSource, 'dist-product/rules/phishing-active.json');
await cp(securityRulesSource, 'dist-product/rules/ublock-security.json');
await cp(reportSource, 'dist-product/PROVENANCE.json');
await cp(extendedReportSource, 'dist-product/AD_NETWORK_PROVENANCE.json');
await cp(privacyReportSource, 'dist-product/PRIVACY_PROVENANCE.json');
await cp(phishingReportSource, 'dist-product/PHISHING_PROVENANCE.json');
await cp(securityReportSource, 'dist-product/SECURITY_PROVENANCE.json');
await cp(cosmeticReportSource, 'dist-product/COSMETIC_PROVENANCE.json');

const notice = `Jammer 0.10.0

Network ad-blocking rules are generated at build time from:
EasyList repository: ${report.source.repository}
Pinned commit: ${report.source.commit}
Source path: ${report.source.path}
SHA-256: ${report.source.sha256}

Reviewed repository-component license:
${report.license}

Attribution:
The EasyList authors

License information:
https://easylist.to/pages/licence.html

Additional banner/path/ad-script blocking rules are generated at build time from pinned EasyList general, specific, and third-party network sources.
Compiled rules: ${extendedReport.output.rules}

Privacy/tracker blocking rules are generated at build time from:
EasyPrivacy repository: ${privacyReport.source.repository}
Pinned commit: ${privacyReport.source.commit}
Source path: ${privacyReport.source.path}
Git blob SHA-1: ${privacyReport.source.gitBlobSha1}

Known-phishing navigation rules are generated at build time from:
Repository: ${phishingReport.source.repository}
Pinned commit: ${phishingReport.source.commit}
Source path: ${phishingReport.source.path}
Git blob SHA-1: ${phishingReport.source.gitBlobSha1}
License: ${phishingReport.license}

Badware/resource-abuse blocking rules are generated at build time from pinned uBlockOrigin/uAssets badware and resource-abuse sources.\nCompiled rules: ${securityReport.output.rules}\nLicense: ${securityReport.license}\n
Content-category domain signals are generated at build time from the pinned StevenBlack/hosts gambling-only and porn-only variants.\nGambling domains: ${contentDomainsReport.sources.find((item) => item.category === 'gambling')?.domains ?? 0}\nExplicit-content domains: ${contentDomainsReport.sources.find((item) => item.category === 'explicit')?.domains ?? 0}\n
Jammer does not download these filter lists at extension runtime.
`;
await writeFile('dist-product/THIRD_PARTY_NOTICES.txt', notice);

for (const file of ['dist-product/popup.js', 'dist-product/options.js', 'dist-product/content-classifier.js', 'dist-product/content-filter.js', 'dist-product/cosmetic-specific-filter.js', 'dist-product/cosmetic-specific-rules.js', 'dist-product/content-category-domains.js']) {
  const info = await stat(file);
  if (!info.isFile() || info.size === 0) throw new Error(`Missing runtime entry: ${file}`);
  const source = await readFile(file, 'utf8');
  if (/^\s*(?:import|export)\s/m.test(source)) {
    throw new Error(`Runtime entry must be self-contained classic script: ${file}`);
  }
}

const builtManifest = JSON.parse(await readFile('dist-product/manifest.json', 'utf8'));
if (builtManifest.version !== '0.10.0') throw new Error('Unexpected product version');
if (builtManifest.declarative_net_request.rule_resources[0].id !== 'ads_static') {
  throw new Error('Product ruleset ID must remain ads_static for existing controls');
}
if (builtManifest.declarative_net_request.rule_resources[0].path !== 'rules/easylist-adservers.json') {
  throw new Error('Product ads ruleset path mismatch');
}
const extendedResource = builtManifest.declarative_net_request.rule_resources.find(
  (item) => item.id === 'ads_extended'
);
if (!extendedResource || extendedResource.path !== 'rules/easylist-network-extended.json') {
  throw new Error('Product extended ads ruleset path mismatch');
}
const privacyResource = builtManifest.declarative_net_request.rule_resources.find(
  (item) => item.id === 'privacy_static'
);
if (!privacyResource || privacyResource.path !== 'rules/easyprivacy-tracking.json') {
  throw new Error('Product privacy ruleset path mismatch');
}
const phishingResource = builtManifest.declarative_net_request.rule_resources.find(
  (item) => item.id === 'phishing_static'
);
if (!phishingResource || phishingResource.path !== 'rules/phishing-active.json') {
  throw new Error('Product phishing ruleset path mismatch');
}
const securityResource = builtManifest.declarative_net_request.rule_resources.find(
  (item) => item.id === 'security_static'
);
if (!securityResource || securityResource.path !== 'rules/ublock-security.json') {
  throw new Error('Product security ruleset path mismatch');
}

console.log(
  `product-build: PASS version=0.10.0 adsDomains=${report.compiler.acceptedDomains} extendedRules=${extendedRules.length} privacyDomains=${privacyReport.compiler.acceptedDomains} phishingDomains=${phishingReport.compiler.acceptedDomains} securityRules=${securityRules.length} adsRules=${rules.length} privacyRules=${privacyRules.length} phishingRules=${phishingRules.length} cosmeticGeneric=${cosmeticReport.output.genericSelectors} cosmeticSpecific=${cosmeticReport.output.specificRules}`
);
