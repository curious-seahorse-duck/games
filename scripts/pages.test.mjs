import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assemblePages, GAMES } from './assemble-pages.mjs';

const site = new URL('../site/', import.meta.url);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'arcade-pages-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(site, path.join(root, 'site'), { recursive: true });
  for (const game of GAMES) {
    const dist = path.join(root, game, 'dist');
    await mkdir(path.join(dist, 'assets'), { recursive: true });
    await writeFile(path.join(dist, 'index.html'), '<!doctype html><link rel="stylesheet" href="./assets/game.css"><script type="module" src="./assets/game.js"></script>');
    await writeFile(path.join(dist, 'assets', 'game.js'), `console.log(${JSON.stringify(game)});`);
    await writeFile(path.join(dist, 'assets', 'game.css'), 'body { margin: 0; }');
    await mkdir(path.join(dist, 'server'));
    await writeFile(path.join(dist, 'server', 'index.js'), 'SERVER_ONLY_SECRET');
    await mkdir(path.join(dist, '.openai'));
    await writeFile(path.join(dist, '.openai', 'hosting.json'), '{}');
    await writeFile(path.join(dist, 'unexpected-secret.txt'), 'PRIVATE');
  }
  return root;
}

test('packages both games and the home page without server files, and clears stale output', async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, '_site'));
  await writeFile(path.join(root, '_site', 'stale.js'), 'OLD');
  const output = await assemblePages(root);
  assert.deepEqual((await readdir(output)).sort(), ['.nojekyll', 'fish-rain', 'freeze-tag', 'index.html', 'style.css']);
  for (const game of GAMES) {
    assert.deepEqual((await readdir(path.join(output, game))).sort(), ['assets', 'index.html']);
    assert.equal(await readFile(path.join(output, game, 'assets', 'game.js'), 'utf8'), `console.log(${JSON.stringify(game)});`);
  }
});

test('home links and game assets resolve under both a project path and a domain root', async (t) => {
  const output = await assemblePages(await fixture(t));
  const home = await readFile(path.join(output, 'index.html'), 'utf8');
  for (const base of ['https://example.github.io/fish-rain/', 'https://games.example/']) {
    for (const game of GAMES) {
      assert.ok(home.includes(`href="./${game}/"`));
      const gameUrl = new URL(`./${game}/`, base);
      const html = await readFile(path.join(output, game, 'index.html'), 'utf8');
      for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        assert.equal(new URL(match[1], gameUrl).href, `${base}${game}/assets/${path.basename(match[1])}`);
        await readFile(path.join(output, game, match[1]));
      }
    }
  }
});

test('rejects absolute asset paths without replacing the previous site', async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, '_site'));
  await writeFile(path.join(root, '_site', 'index.html'), 'previous release');
  await writeFile(path.join(root, 'fish-rain', 'dist', 'index.html'), '<script src="/assets/game.js"></script>');
  await assert.rejects(assemblePages(root), /relative built asset URL/);
  assert.equal(await readFile(path.join(root, '_site', 'index.html'), 'utf8'), 'previous release');
});

test('rejects missing entry assets and unbuilt TypeScript entries', async (t) => {
  const root = await fixture(t);
  await rm(path.join(root, 'freeze-tag', 'dist', 'assets', 'game.js'));
  await assert.rejects(assemblePages(root), /ENOENT/);
  await writeFile(path.join(root, 'freeze-tag', 'dist', 'index.html'), '<script type="module" src="/src/main.ts"></script>');
  await assert.rejects(assemblePages(root), /No built JavaScript entry/);
});

test('rejects unexpected files inside the published asset directory', async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'freeze-tag', 'dist', 'assets', 'private.env'), 'PRIVATE');
  await assert.rejects(assemblePages(root), /Unexpected game asset/);
});
