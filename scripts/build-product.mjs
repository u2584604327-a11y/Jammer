import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runTsc } from './run-tsc.mjs';

const rulesSource = resolve('generated/easylist-adservers.rules.json');
const reportSource = resolve('generated/easylist-adservers.report.json');

for (const path of [rulesSource, reportSource]) {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) {
    throw new Error('Missing generated EasyList rules. Run npm run rules:prepare:easylist first.');
  }
}

const rules = JSON.parse(await readFile(rulesSource, 'utf8'));
const report = JSON.parse(await readFile(reportSource, 'utf8'));

if (rules.length !== 256 || report.compiler.acceptedDomains !== 42940) {
  throw new Error('Unexpected EasyList product baseline');
}

await rm('.build-js', { recursive: true, force: true });
await rm('dist-product', { recursive: true, force: true });

runTsc(['-p', 'tsconfig.build.json']);

await mkdir('dist-product/rules', { recursive: true });
await cp('.build-js', 'dist-product', { recursive: true });
await cp('src/styles.css', 'dist-product/styles.css');
await cp('src/cosmetic.css', 'dist-product/cosmetic.css');
await cp('options.html', 'dist-product/options.html');

let popupHtml = await readFile('popup.html', 'utf8');
popupHtml = popupHtml.replace('Build: p42-bilingual-dev', 'Build: p42-bilingual-product');
await writeFile('dist-product/popup.html', popupHtml);

const manifest = {
  manifest_version: 3,
  name: 'Jammer',
  version: '0.4.0',
  description: 'Local-first ad blocking with transparent, user-controlled rules.',
  permissions: ['declarativeNetRequest', 'storage'],
  optional_permissions: ['scripting'],
  optional_host_permissions: ['http://*/*', 'https://*/*'],
  action: {
    default_title: 'Jammer',
    default_popup: 'popup.html'
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

const notice = `Jammer 0.4.0

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
if (builtManifest.version !== '0.4.0') throw new Error('Unexpected product version');
if (builtManifest.declarative_net_request.rule_resources[0].id !== 'ads_static') {
  throw new Error('Product ruleset ID must remain ads_static for existing controls');
}
if (builtManifest.declarative_net_request.rule_resources[0].path !== 'rules/easylist-adservers.json') {
  throw new Error('Product ruleset path mismatch');
}

console.log(
  `product-build: PASS version=0.4.0 domains=${report.compiler.acceptedDomains} rules=${rules.length}`
);
