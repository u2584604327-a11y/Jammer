import { rm } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runTsc } from './run-tsc.mjs';

await rm('.test-build', { recursive: true, force: true });
runTsc(['-p', 'tsconfig.build.json', '--outDir', '.test-build']);
const files = readdirSync('tests').filter((name) => name.endsWith('.test.mjs')).map((name) => `tests/${name}`);
execFileSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
