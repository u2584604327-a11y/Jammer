import { spawnSync } from 'node:child_process';

export function runTsc(args) {
  const direct = spawnSync('tsc', args, { stdio: 'inherit' });
  if (!direct.error) {
    if (direct.status !== 0) process.exit(direct.status ?? 1);
    return;
  }
  if (direct.error.code !== 'ENOENT') throw direct.error;

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const fallback = spawnSync(npx, ['--yes', '-p', 'typescript@5.8.3', 'tsc', ...args], { stdio: 'inherit' });
  if (fallback.error) throw fallback.error;
  if (fallback.status !== 0) process.exit(fallback.status ?? 1);
}
