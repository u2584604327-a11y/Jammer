import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { runTsc } from './run-tsc.mjs';

await rm('.build-js', { recursive: true, force: true });
await rm('dist', { recursive: true, force: true });

runTsc(['-p', 'tsconfig.build.json']);

await mkdir('dist', { recursive: true });
for (const file of ['manifest.json', 'popup.html', 'options.html']) {
  await cp(file, join('dist', file));
}
await cp('src/styles.css', 'dist/styles.css');
await cp('rules', 'dist/rules', { recursive: true });
await cp('.build-js', 'dist', { recursive: true });

for (const file of ['dist/popup.js', 'dist/options.js']) {
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

console.log('build: PASS');
