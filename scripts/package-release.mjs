import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const PRODUCT_DIR = resolve('dist-product');
const RELEASE_DIR = resolve('release');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function listFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(current, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, path));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function dosTimeDate() {
  const time = 0;
  const date = (1 << 5) | 1;
  return { time, date };
}

function makeLocalHeader(nameBuffer, data, crc) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  const { time, date } = dosTimeDate();
  header.writeUInt16LE(time, 10);
  header.writeUInt16LE(date, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function makeCentralHeader(nameBuffer, data, crc, localOffset) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  const { time, date } = dosTimeDate();
  header.writeUInt16LE(time, 12);
  header.writeUInt16LE(date, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(nameBuffer.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(localOffset, 42);
  return header;
}

function makeEndRecord(entries, centralSize, centralOffset) {
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries, 8);
  end.writeUInt16LE(entries, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);
  return end;
}

const manifestPath = resolve(PRODUCT_DIR, 'manifest.json');
const manifestInfo = await stat(manifestPath).catch(() => null);
if (!manifestInfo?.isFile()) {
  throw new Error('dist-product is missing. Run npm run build:product first.');
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const version = manifest.version;

const sourceFiles = await listFiles(PRODUCT_DIR);
const fileRecords = [];

for (const path of sourceFiles) {
  const data = await readFile(path);
  const rel = relative(PRODUCT_DIR, path).split(sep).join('/');
  fileRecords.push({
    path: rel,
    data,
    sha256: createHash('sha256').update(data).digest('hex')
  });
}

const releaseInfo = {
  product: 'Jammer',
  version,
  manifestVersion: manifest.manifest_version,
  requiredPermissions: manifest.permissions,
  optionalPermissions: manifest.optional_permissions,
  optionalHostPermissions: manifest.optional_host_permissions,
  files: fileRecords.map(({ path, data, sha256 }) => ({
    path,
    bytes: data.length,
    sha256
  }))
};

const releaseInfoBuffer = Buffer.from(JSON.stringify(releaseInfo, null, 2) + '\n');
fileRecords.push({
  path: 'RELEASE_INFO.json',
  data: releaseInfoBuffer,
  sha256: createHash('sha256').update(releaseInfoBuffer).digest('hex')
});

fileRecords.sort((a, b) => a.path.localeCompare(b.path));

const localParts = [];
const centralParts = [];
let offset = 0;

for (const file of fileRecords) {
  const name = Buffer.from(file.path, 'utf8');
  const crc = crc32(file.data);
  const localHeader = makeLocalHeader(name, file.data, crc);
  localParts.push(localHeader, name, file.data);

  const centralHeader = makeCentralHeader(name, file.data, crc, offset);
  centralParts.push(centralHeader, name);

  offset += localHeader.length + name.length + file.data.length;
}

const centralOffset = offset;
const central = Buffer.concat(centralParts);
const zip = Buffer.concat([
  ...localParts,
  central,
  makeEndRecord(fileRecords.length, central.length, centralOffset)
]);

await mkdir(RELEASE_DIR, { recursive: true });
const zipName = `jammer-${version}-chromium.zip`;
const zipPath = resolve(RELEASE_DIR, zipName);
await writeFile(zipPath, zip);

const zipSha256 = createHash('sha256').update(zip).digest('hex');
await writeFile(resolve(RELEASE_DIR, `${zipName}.sha256`), `${zipSha256}  ${zipName}\n`);

const externalMetadata = {
  product: 'Jammer',
  version,
  archive: zipName,
  archiveBytes: zip.length,
  archiveSha256: zipSha256,
  packagedFiles: fileRecords.length,
  permissions: {
    required: manifest.permissions,
    optional: manifest.optional_permissions,
    optionalHosts: manifest.optional_host_permissions
  }
};

await writeFile(
  resolve(RELEASE_DIR, `jammer-${version}.release.json`),
  JSON.stringify(externalMetadata, null, 2) + '\n'
);

console.log(
  `release-package: PASS version=${version} files=${fileRecords.length} bytes=${zip.length} sha256=${zipSha256}`
);
