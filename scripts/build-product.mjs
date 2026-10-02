import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runTsc } from './run-tsc.mjs';

await import('./generate-brand-assets.mjs');

const rulesSource = resolve('generated/easylist-adservers.rules.json');
const reportSource = resolve('generated/easylist-adservers.report.json');
const cosmeticGeneralSource = resolve('generated/easylist-general-hide.css');
const cosmeticSiteSource = resolve('generated/easylist-canyoublockit.css');
const cosmeticReportSource = resolve('generated/easylist-cosmetic.report.json');

for (const path of [rulesSource, reportSource, cosmeticGeneralSource, cosmeticSiteSource, cosmeticReportSource]) {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) {
    throw new Error('Missing generated EasyList rules. Run npm run rules:prepare:easylist first.');
  }
}

const rules = JSON.parse(await readFile(rulesSource, 'utf8'));
const report = JSON.parse(await readFile(reportSource, 'utf8'));
const cosmeticReport = JSON.parse(await readFile(cosmeticReportSource, 'utf8'));

if (rules.length !== 256 || report.compiler.acceptedDomains !== 42940) {
  throw new Error('Unexpected EasyList product baseline');
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
await cp('options.html', 'dist-product/options.html');

let popupHtml = await readFile('popup.html', 'utf8');
popupHtml = popupHtml.replace('Build: p55-cover-integration-dev', 'Build: p55-cover-integration-product');
await writeFile('dist-product/popup.html', popupHtml);

const manifest = {
  manifest_version: 3,
  name: 'Jammer',
  version: '0.6.0',
  description: 'Local-first ad blocking with transparent, user-controlled rules.',
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
      }
    ]
  },
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'none'; connect-src 'none'"
  }
};

await writeFile('dist-product/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
await cp(rulesSource, 'dist-product/rules/easylist-adservers.json');
await cp(reportSource, 'dist-product/PROVENANCE.json');
await cp(cosmeticReportSource, 'dist-product/COSMETIC_PROVENANCE.json');

const notice = `Jammer 0.6.0

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

Jammer does not download this filter list at extension runtime.
`;
await writeFile('dist-product/THIRD_PARTY_NOTICES.txt', notice);

for (const file of ['dist-product/popup.js', 'dist-product/options.js']) {
  const info = await stat(file);
  if (!info.isFile() || info.size === 0) throw new Error(`Missing runtime entry: ${file}`);
  const source = await readFile(file, 'utf8');
  if (/^\s*(?:import|export)\s/m.test(source)) {
    throw new Error(`Runtime entry must be self-contained classic script: ${file}`);
  }
}

const builtManifest = JSON.parse(await readFile('dist-product/manifest.json', 'utf8'));
if (builtManifest.version !== '0.6.0') throw new Error('Unexpected product version');
if (builtManifest.declarative_net_request.rule_resources[0].id !== 'ads_static') {
  throw new Error('Product ruleset ID must remain ads_static for existing controls');
}
if (builtManifest.declarative_net_request.rule_resources[0].path !== 'rules/easylist-adservers.json') {
  throw new Error('Product ruleset path mismatch');
}

console.log(
  `product-build: PASS version=0.6.0 domains=${report.compiler.acceptedDomains} rules=${rules.length} cosmetic=${cosmeticReport.output.genericSelectors}`
);
