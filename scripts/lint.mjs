import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOTS = ['src', 'scripts', 'tests'];
const FORBIDDEN = [
  'chrome.tabs', 'chrome.history', 'chrome.cookies', 'chrome.webRequest',
  'chrome.debugger', 'chrome.downloads', 'eval(', 'new Function('
];

const COSMETIC_API_ALLOWED_FILES = new Set([
  join('src', 'options.ts'),
  join('src', 'popup.ts')
]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

let failed = false;
for (const root of ROOTS) {
  for (const file of await walk(root)) {
    if (!['.ts', '.mjs'].includes(extname(file))) continue;
    const source = await readFile(file, 'utf8');
    const lines = source.split('\n');
    lines.forEach((line, index) => {
      if (/\s+$/.test(line) && line.length > 0) {
        console.error(`${file}:${index + 1}: trailing whitespace`);
        failed = true;
      }
    });

    if (file.startsWith('src/')) {
      for (const token of FORBIDDEN) {
        if (source.includes(token)) {
          console.error(`${file}: forbidden token ${token}`);
          failed = true;
        }
      }

      if (
        (source.includes('chrome.scripting') || source.includes('chrome.permissions')) &&
        !COSMETIC_API_ALLOWED_FILES.has(file)
      ) {
        console.error(`${file}: cosmetic permission APIs are restricted to popup/options control code`);
        failed = true;
      }
    }
  }
}

if (failed) process.exit(1);
console.log('lint: PASS');
