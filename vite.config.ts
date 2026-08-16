import { defineConfig, type Plugin } from 'vite';

const ADMIN_CODE = '446908865';
const bannedAccounts = new Map<string, number>();
const publicProfiles = new Map<string, unknown>();
const BAN_DURATION_MS = 24 * 60 * 60 * 1000;

const sharedBanApi = (): Plugin => ({
  name: 'shared-ban-api',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (url.pathname === '/api/profiles' && request.method === 'GET') {
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Cache-Control', 'no-store');
        response.end(JSON.stringify([...publicProfiles.values()]));
        return;
      }
      if (url.pathname === '/api/profiles' && request.method === 'POST') {
        let body = '';
        request.setEncoding('utf8');
        request.on('data', (chunk) => { body += chunk; });
        request.on('end', () => {
          try {
            const profile = JSON.parse(body) as { username?: unknown };
            const username = typeof profile.username === 'string' ? profile.username.trim().toLowerCase() : '';
            if (!/^[a-z0-9_-]{3,20}$/.test(username)) {
              response.statusCode = 400;
              response.end(JSON.stringify({ error: 'Invalid profile.' }));
              return;
            }
            publicProfiles.set(username, { ...profile, username });
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ ok: true }));
          } catch {
            response.statusCode = 400;
            response.end(JSON.stringify({ error: 'Invalid request.' }));
          }
        });
        return;
      }
      if (url.pathname === '/api/account-status' && request.method === 'GET') {
        const username = (url.searchParams.get('username') ?? '').trim().toLowerCase();
        const expiresAt = bannedAccounts.get(username) ?? 0;
        if (expiresAt > 0 && expiresAt <= Date.now()) bannedAccounts.delete(username);
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Cache-Control', 'no-store');
        response.end(JSON.stringify({ banned: /^[a-z0-9_-]{3,20}$/.test(username) && bannedAccounts.has(username), expiresAt }));
        return;
      }
      if (url.pathname !== '/api/admin/ban' || request.method !== 'POST') {
        if (url.pathname !== '/api/admin/unban' || request.method !== 'POST') {
          next();
          return;
        }
      }
      let body = '';
      request.setEncoding('utf8');
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        try {
          const payload = JSON.parse(body) as { code?: unknown; username?: unknown };
          const username = typeof payload.username === 'string' ? payload.username.trim().toLowerCase() : '';
          if (payload.code !== ADMIN_CODE || !/^[a-z0-9_-]{3,20}$/.test(username)) {
            response.statusCode = 403;
            response.end(JSON.stringify({ error: 'Unauthorized or invalid username.' }));
            return;
          }
          if (url.pathname === '/api/admin/unban') {
            bannedAccounts.delete(username);
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ banned: false, username }));
            return;
          }
          const expiresAt = Date.now() + BAN_DURATION_MS;
          bannedAccounts.set(username, expiresAt);
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ banned: true, username, expiresAt }));
        } catch {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: 'Invalid request.' }));
        }
      });
    });
  },
});

const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' ws: wss:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
};

export default defineConfig({
  base: '/fish-rain/',
  plugins: [sharedBanApi()],
  server: {
    port: 5173,
    headers: securityHeaders,
  },
  preview: {
    headers: securityHeaders,
  },
});
