import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { runTsc } from './run-tsc.mjs';

await import('./generate-brand-assets.mjs');

await rm('.build-js', { recursive: true, force: true });
await rm('dist', { recursive: true, force: true });

runTsc(['-p', 'tsconfig.build.json']);

await mkdir('dist/icons', { recursive: true });
await mkdir('dist/assets', { recursive: true });
for (const file of ['manifest.json', 'popup.html', 'options.html']) {
  await cp(file, join('dist', file));
}
await cp('src/styles.css', 'dist/styles.css');
await cp('assets/brand/jammer-cover.webp', 'dist/assets/jammer-cover.webp');
for (const size of [16, 32, 48, 128]) {
  await cp(`generated/brand/icon-${size}.png`, `dist/icons/icon-${size}.png`);
}
await cp('src/cosmetic.css', 'dist/cosmetic.css');
await cp('src/cosmetic-easylist.css', 'dist/cosmetic-easylist.css');
await cp('src/cosmetic-canyoublockit.css', 'dist/cosmetic-canyoublockit.css');
await cp('src/cosmetic-canyoublockit-local.css', 'dist/cosmetic-canyoublockit-local.css');
await cp('src/cosmetic-specific-rules.js', 'dist/cosmetic-specific-rules.js');
await cp('src/content-category-domains.js', 'dist/content-category-domains.js');
await cp('rules', 'dist/rules', { recursive: true });
await cp('.build-js', 'dist', { recursive: true });

for (const file of ['dist/popup.js', 'dist/options.js', 'dist/content-classifier.js', 'dist/content-filter.js', 'dist/cosmetic-specific-filter.js', 'dist/cosmetic-specific-rules.js', 'dist/content-category-domains.js']) {
  const info = await stat(file);
  if (!info.isFile() || info.size === 0) {
    throw new Error(`Missing runtime entry: ${file}`);
  }
  const source = await readFile(file, 'utf8');
  if (/^\s*(?:import|export)\s/m.test(source)) {
    throw new Error(`Runtime entry must be self-contained classic script: ${file}`);
  }
}

for (const file of ['dist/popup.html', 'dist/options.html']) {
  const html = await readFile(file, 'utf8');
  if (/type=["']module["']/i.test(html)) {
    throw new Error(`Runtime HTML must not use module entry scripts: ${file}`);
  }
}

const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
if (manifest.version !== '0.9.0') {
  throw new Error('Unexpected dist manifest version');
}
const popupHtml = await readFile('dist/popup.html', 'utf8');
if (!popupHtml.includes('Build: p64-secure-navigation-dev')) {
  throw new Error('Popup build marker missing from dist');
}

console.log('build: PASS');
