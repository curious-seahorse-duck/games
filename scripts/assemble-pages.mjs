import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GAMES = ['fish-rain', 'freeze-tag'];
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

async function verifyAssets(directory, html) {
  // Absolute /assets URLs break under a GitHub project site's /repository/ path.
  const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((match) => match[1]);
  const scripts = references.filter((reference) => reference.endsWith('.js'));
  if (!scripts.length) throw new Error(`No built JavaScript entry in ${directory}.`);
  for (const reference of references) {
    if (!reference.startsWith('./assets/')) throw new Error(`Expected a relative built asset URL, got ${reference}.`);
    const target = path.resolve(directory, reference);
    if (!target.startsWith(path.resolve(directory, 'assets') + path.sep)) throw new Error('Asset escapes its directory.');
    await readFile(target);
  }
  // Publish a static allowlist. In particular, never copy dist/server or .openai.
  async function checkFiles(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed: ${entry.name}`);
      if (entry.isDirectory()) await checkFiles(path.join(folder, entry.name));
      else if (!/\.(?:js|css)$/.test(entry.name)) throw new Error(`Unexpected game asset: ${entry.name}`);
    }
  }
  await checkFiles(path.join(directory, 'assets'));
}

export async function assemblePages(root = repositoryRoot) {
  // Validate every build before replacing the previous generated site.
  const builds = [];
  for (const game of GAMES) {
    const directory = path.join(root, game, 'dist');
    const html = await readFile(path.join(directory, 'index.html'), 'utf8');
    await verifyAssets(directory, html);
    builds.push({ game, directory, html });
  }
  const home = await readFile(path.join(root, 'site', 'index.html'), 'utf8');
  const stylesheet = await readFile(path.join(root, 'site', 'style.css'), 'utf8');
  const output = path.resolve(root, '_site');
  if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== '_site') throw new Error('Invalid site output directory.');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'index.html'), home);
  await writeFile(path.join(output, 'style.css'), stylesheet);
  await writeFile(path.join(output, '.nojekyll'), '');
  for (const { game, directory, html } of builds) {
    await mkdir(path.join(output, game));
    await writeFile(path.join(output, game, 'index.html'), html);
    await cp(path.join(directory, 'assets'), path.join(output, game, 'assets'), { recursive: true });
  }
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`GitHub Pages site ready: ${await assemblePages()}`);
}
