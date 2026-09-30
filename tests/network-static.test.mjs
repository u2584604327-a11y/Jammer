import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (path.endsWith('.ts')) out.push(path);
  }
  return out;
}

test('runtime source contains no external networking primitives', async () => {
  const forbidden = ['fetch(', 'XMLHttpRequest', 'WebSocket', 'EventSource'];
  for (const file of await walk('src')) {
    const source = await readFile(file, 'utf8');
    for (const token of forbidden) {
      assert.equal(source.includes(token), false, `${file} contains ${token}`);
    }
  }
});
