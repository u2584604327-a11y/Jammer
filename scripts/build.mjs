import { cp, mkdir, rm } from 'node:fs/promises';
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
console.log('build: PASS');
