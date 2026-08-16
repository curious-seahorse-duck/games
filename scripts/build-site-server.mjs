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
const ADMIN_CODE = '446908865';
const bannedAccounts = new Map();
const publicProfiles = new Map();
const BAN_DURATION_MS = 24 * 60 * 60 * 1000;
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/api/profiles' && request.method === 'GET') {
      return Response.json([...publicProfiles.values()], {
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    if (url.pathname === '/api/profiles' && request.method === 'POST') {
      try {
        const profile = await request.json();
        const username = typeof profile?.username === 'string' ? profile.username.trim().toLowerCase() : '';
        if (!/^[a-z0-9_-]{3,20}$/.test(username) || typeof profile !== 'object' || profile === null) {
          return Response.json({ error: 'Invalid profile.' }, { status: 400 });
        }
        publicProfiles.set(username, { ...profile, username });
        return Response.json({ ok: true });
      } catch {
        return Response.json({ error: 'Invalid request.' }, { status: 400 });
      }
    }
    if (url.pathname === '/api/account-status' && request.method === 'GET') {
      const username = (url.searchParams.get('username') ?? '').trim().toLowerCase();
      const expiresAt = bannedAccounts.get(username) ?? 0;
      if (expiresAt > 0 && expiresAt <= Date.now()) bannedAccounts.delete(username);
      return Response.json({ banned: /^[a-z0-9_-]{3,20}$/.test(username) && bannedAccounts.has(username), expiresAt }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    if (url.pathname === '/api/admin/ban' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const username = typeof payload?.username === 'string' ? payload.username.trim().toLowerCase() : '';
        if (payload?.code !== ADMIN_CODE || !/^[a-z0-9_-]{3,20}$/.test(username)) {
          return Response.json({ error: 'Unauthorized or invalid username.' }, { status: 403 });
        }
        const expiresAt = Date.now() + BAN_DURATION_MS;
        bannedAccounts.set(username, expiresAt);
        return Response.json({ banned: true, username, expiresAt });
      } catch {
        return Response.json({ error: 'Invalid request.' }, { status: 400 });
      }
    }
    if (url.pathname === '/api/admin/unban' && request.method === 'POST') {
      try {
        const payload = await request.json();
        const username = typeof payload?.username === 'string' ? payload.username.trim().toLowerCase() : '';
        if (payload?.code !== ADMIN_CODE || !/^[a-z0-9_-]{3,20}$/.test(username)) {
          return Response.json({ error: 'Unauthorized or invalid username.' }, { status: 403 });
        }
        bannedAccounts.delete(username);
        return Response.json({ banned: false, username });
      } catch {
        return Response.json({ error: 'Invalid request.' }, { status: 400 });
      }
    }
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
