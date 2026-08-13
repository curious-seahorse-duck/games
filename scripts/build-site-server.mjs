import { mkdir, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });

const assetFiles = ['index.html'];
for (const name of await readdir('dist/assets')) assetFiles.push(path.join('assets', name));
const embeddedAssets = {};
for (const name of assetFiles) {
  embeddedAssets[`/${name.replaceAll('\\', '/')}`] = await readFile(path.join('dist', name), 'utf8');
}

await writeFile(
  'dist/server/index.js',
  `const assets = ${JSON.stringify(embeddedAssets)};
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/') url.pathname = '/index.html';
    const body = assets[url.pathname];
    if (body === undefined) return new Response('Not found', { status: 404 });
    const extension = url.pathname.slice(url.pathname.lastIndexOf('.'));
    return new Response(body, {
      headers: { 'Content-Type': contentTypes[extension] ?? 'application/octet-stream' },
    });
  },
};
`,
  'utf8',
);
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
