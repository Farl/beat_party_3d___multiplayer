import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('Pages build points the frontend at the configured PartyServer host', () => {
  execFileSync(process.execPath, ['scripts/prepare-pages.mjs'], { env: { ...process.env, PARTYKIT_HOST: 'socket.example.workers.dev' } });
  assert.equal(readFileSync('dist/env.js', 'utf8'), 'export const PARTYKIT_HOST = "socket.example.workers.dev";');
  assert.ok(readFileSync('dist/index.html', 'utf8').includes('https://esm.sh/websim-socket@0.1.1'));
});

test('an invalid or missing host fails before replacing the previous build', () => {
  const before = readFileSync('dist/env.js', 'utf8');
  for (const host of ['', 'https://socket.example.workers.dev/path', 'bad";alert(1);//']) {
    const result = spawnSync(process.execPath, ['scripts/prepare-pages.mjs'], { env: { ...process.env, PARTYKIT_HOST: host } });
    assert.notEqual(result.status, 0);
    assert.equal(readFileSync('dist/env.js', 'utf8'), before);
  }
});
