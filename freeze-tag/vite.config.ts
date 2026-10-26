import { defineConfig, type Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stat } from 'node:fs/promises';

type WorkerApp = {
  fetch(request: Request): Promise<Response>;
};

type MiddlewareServer = {
  middlewares: {
    use(handler: (request: IncomingMessage, response: ServerResponse, next: () => void) => void): void;
  };
};

const readBody = async (request: IncomingMessage): Promise<Buffer | undefined> => {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > 550_000) throw new Error('Request body is too large.');
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
};

const productionApiAdapter = (): Plugin => {
  const workers = new Map<string, { version: string; promise: Promise<{ default: WorkerApp }> }>();
  const loadWorker = async (sourcePath: string) => {
    const workerPath = resolve(sourcePath);
    const metadata = await stat(workerPath);
    const version = `${metadata.mtimeMs}-${metadata.size}`;
    const previous = workers.get(workerPath);
    if (previous?.version === version) return previous.promise;
    const promise = import(`${pathToFileURL(workerPath).href}?v=${version}`) as Promise<{ default: WorkerApp }>;
    workers.set(workerPath, { version, promise });
    try { return await promise; }
    catch (error) { workers.delete(workerPath); throw error; }
  };

  const install = (server: MiddlewareServer, sourcePath: string) => {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1:5174');
      if (!url.pathname.startsWith('/api/')) {
        next();
        return;
      }

      void (async () => {
        try {
          const worker = await loadWorker(sourcePath);
          const body = await readBody(request);
          const apiRequest = new Request(url, {
            method: request.method,
            headers: request.headers as HeadersInit,
            body,
          });
          const apiResponse = await worker.default.fetch(apiRequest);
          response.statusCode = apiResponse.status;
          apiResponse.headers.forEach((value, name) => response.setHeader(name, value));
          response.end(Buffer.from(await apiResponse.arrayBuffer()));
        } catch (error) {
          response.statusCode = 503;
          response.setHeader('Content-Type', 'application/json');
          response.setHeader('Cache-Control', 'no-store');
          response.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Local game service is unavailable.',
          }));
        }
      })();
    });
  };

  return {
    name: 'production-api-adapter',
    configureServer: (server) => install(server, 'server/game-api.mjs'),
    configurePreviewServer: (server) => install(server, 'dist/server/index.js'),
  };
};

const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self' ws: wss:",
    "font-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(self), payment=(), usb=()',
};

export default defineConfig({
  base: '/freeze-tag/',
  plugins: [productionApiAdapter()],
  server: {
    port: 5174,
    headers: securityHeaders,
    fs: {
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/server/**', '**/scripts/**'],
    },
  },
  preview: {
    port: 4174,
    headers: securityHeaders,
  },
});
