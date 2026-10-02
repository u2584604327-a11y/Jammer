import { spawnSync } from 'node:child_process';

function finish(result) {
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

export function runTsc(args) {
  const direct = spawnSync('tsc', args, { stdio: 'inherit' });
  if (!direct.error) {
    finish(direct);
    return;
  }
  if (direct.error.code !== 'ENOENT') throw direct.error;

  // When invoked through npm scripts, npm_execpath points to npm-cli.js.
  // Calling npm through the current Node executable avoids spawning .cmd files
  // directly, which can fail with EINVAL on Windows/Node 24.
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    const viaNpm = spawnSync(
      process.execPath,
      [npmExecPath, 'exec', '--yes', '--package=typescript@5.8.3', '--', 'tsc', ...args],
      { stdio: 'inherit' }
    );
    finish(viaNpm);
    return;
  }

  if (process.platform === 'win32') {
    const command = ['npx.cmd', '--yes', '-p', 'typescript@5.8.3', 'tsc', ...args].join(' ');
    const viaCmd = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], {
      stdio: 'inherit'
    });
    finish(viaCmd);
    return;
  }

  finish(spawnSync('npx', ['--yes', '-p', 'typescript@5.8.3', 'tsc', ...args], { stdio: 'inherit' }));
}
