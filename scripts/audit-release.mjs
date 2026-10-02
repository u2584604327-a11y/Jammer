import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const PRODUCT_DIR = resolve('dist-product');
const RELEASE_DIR = resolve('release');
const manifest = JSON.parse(await readFile(resolve(PRODUCT_DIR, 'manifest.json'), 'utf8'));
const version = manifest.version;
const zipName = `jammer-${version}-chromium.zip`;
const zip = await readFile(resolve(RELEASE_DIR, zipName));
const metadata = JSON.parse(
  await readFile(resolve(RELEASE_DIR, `jammer-${version}.release.json`), 'utf8')
);

function fail(message) {
  throw new Error(`release-audit: ${message}`);
}

function parseZipNames(buffer) {
  const names = [];
  for (let offset = 0; offset <= buffer.length - 46; offset += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    names.push(name);
    offset += 45 + nameLength + extraLength + commentLength;
  }
  return names.sort();
}

const expectedRequired = ['declarativeNetRequest', 'storage'].sort();
const actualRequired = [...(manifest.permissions ?? [])].sort();
if (JSON.stringify(actualRequired) !== JSON.stringify(expectedRequired)) {
  fail(`required permissions changed: ${JSON.stringify(actualRequired)}`);
}

if (JSON.stringify(manifest.optional_permissions ?? []) !== JSON.stringify(['scripting'])) {
  fail('optional permissions changed');
}

const optionalHosts = [...(manifest.optional_host_permissions ?? [])].sort();
if (JSON.stringify(optionalHosts) !== JSON.stringify(['http://*/*', 'https://*/*'].sort())) {
  fail('optional host permissions changed');
}

for (const forbidden of ['host_permissions','content_scripts','background']) {
  if (forbidden in manifest) fail(`forbidden manifest key present: ${forbidden}`);
}

if (!manifest.content_security_policy?.extension_pages?.includes("connect-src 'none'")) {
  fail('extension CSP no longer blocks network egress');
}

if (manifest.declarative_net_request?.rule_resources?.[0]?.id !== 'ads_static') {
  fail('ads_static ruleset contract changed');
}
const extendedAdsResource = manifest.declarative_net_request?.rule_resources?.find(
  (item) => item.id === 'ads_extended'
);
if (!extendedAdsResource || extendedAdsResource.path !== 'rules/easylist-network-extended.json') {
  fail('ads_extended ruleset contract changed');
}

const privacyResource = manifest.declarative_net_request?.rule_resources?.find(
  (item) => item.id === 'privacy_static'
);
if (!privacyResource || privacyResource.path !== 'rules/easyprivacy-tracking.json') {
  fail('privacy_static ruleset contract changed');
}

const requiredFiles = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'options.html',
  'options.js',
  'content-classifier.js',
  'content-filter.js',
  'styles.css',
  'assets/jammer-cover.webp',
  'PROVENANCE.json',
  'AD_NETWORK_PROVENANCE.json',
  'PRIVACY_PROVENANCE.json',
  'COSMETIC_PROVENANCE.json',
  'THIRD_PARTY_NOTICES.txt',
  'rules/easylist-adservers.json',
  'rules/easylist-network-extended.json',
  'rules/easyprivacy-tracking.json',
  'icons/icon-16.png',
  'icons/icon-32.png',
  'icons/icon-48.png',
  'icons/icon-128.png',
  'cosmetic.css',
  'cosmetic-easylist.css',
  'cosmetic-canyoublockit.css',
  'cosmetic-canyoublockit-local.css'
];

for (const rel of requiredFiles) {
  const info = await stat(resolve(PRODUCT_DIR, rel)).catch(() => null);
  if (!info?.isFile()) fail(`missing product file: ${rel}`);
}

const cover = await readFile(resolve(PRODUCT_DIR, 'assets/jammer-cover.webp'));
if (cover.subarray(0, 4).toString('hex') !== '52494646') fail('invalid Jammer cover WebP');
if (cover.length > 250_000) fail('Jammer cover is unexpectedly large');

for (const size of [16,32,48,128]) {
  const png = await readFile(resolve(PRODUCT_DIR, `icons/icon-${size}.png`));
  const signature = png.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') fail(`invalid PNG icon-${size}`);
}

const zipHash = createHash('sha256').update(zip).digest('hex');
if (zipHash !== metadata.archiveSha256) fail('release archive SHA-256 mismatch');

const shaLine = (await readFile(resolve(RELEASE_DIR, `${zipName}.sha256`), 'utf8')).trim();
if (!shaLine.startsWith(zipHash)) fail('sha256 sidecar mismatch');

const zipNames = parseZipNames(zip);
for (const rel of [...requiredFiles, 'RELEASE_INFO.json']) {
  if (!zipNames.includes(rel)) fail(`archive missing: ${rel}`);
}

if (zipNames.some((name) => name.endsWith('.ts') || name.endsWith('.map'))) {
  fail('source TypeScript or source maps leaked into archive');
}

if (zipNames.some((name) => /easy(?:list|privacy).*\.txt$/i.test(name))) {
  fail('raw EasyList text leaked into archive or raw EasyPrivacy text leaked into archive');
}

if (metadata.version !== version) fail('release metadata version mismatch');

const releaseEntries = await readdir(RELEASE_DIR);
if (!releaseEntries.includes(zipName)) fail('release archive missing from release directory');

console.log(
  `release-audit: PASS version=${version} files=${zipNames.length} sha256=${zipHash}`
);
