/**
 * Real-CORS regression test for the pageview beacon.
 *
 * The fixture-mocked P40-P43 tests use page.route, which intercepts
 * requests at the browser's network layer *before* CORS enforcement.
 * That's why they passed with the broken sendBeacon+JSON implementation
 * that silently dropped in production.
 *
 * This spec does not use the fixtures mock. It starts two real servers
 * on different 127.0.0.1 ports so the browser treats them as separate
 * origins and enforces CORS for real. If the beacon fails preflight
 * (as sendBeacon+application/json did), `waitForResponse` never resolves
 * and the test times out.
 */
import { test, expect, chromium, Browser } from '@playwright/test';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import type { AddressInfo } from 'net';

const REPO_ROOT = path.resolve(__dirname, '..');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
};

// Minimal static server — serves the real index.html plus everything it
// requests (CSS/fonts fall back to 404 gracefully).
function startStatic(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    const rel = url === '/' ? 'index.html' : url.replace(/^\//, '');
    const full = path.join(REPO_ROOT, rel);
    if (!full.startsWith(REPO_ROOT) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

// Fake API server on a SECOND port so Chromium treats it as cross-origin
// and runs the real CORS preflight / allow-headers dance. Mimics what
// api.jurocompliant.com returns today (Fastify @fastify/cors behavior).
function startApi(allowedOrigin: string): Promise<{ server: http.Server; postCount: { n: number } }> {
  const postCount = { n: 0 };
  const server = http.createServer((req, res) => {
    const cors = {
      'access-control-allow-origin': allowedOrigin,
      'access-control-allow-methods': 'GET,HEAD,POST',
      'access-control-allow-headers': 'Content-Type',
      vary: 'Origin, Access-Control-Request-Headers',
    };
    if (req.method === 'OPTIONS' && req.url === '/api/v1/pageview') {
      res.writeHead(204, cors);
      res.end();
      return;
    }
    if (req.method === 'POST' && req.url === '/api/v1/pageview') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        postCount.n += 1;
        res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((r) =>
    server.listen(0, '127.0.0.1', () => r({ server, postCount })),
  );
}

test.describe('P — pageview beacon real CORS', () => {
  let browser: Browser;
  let staticServer: http.Server;
  let apiServer: http.Server;
  let apiPostCount: { n: number };
  let siteUrl: string;
  let apiUrl: string;

  test.beforeAll(async () => {
    browser = await chromium.launch();
    staticServer = await startStatic();
    const staticPort = (staticServer.address() as AddressInfo).port;
    siteUrl = `http://127.0.0.1:${staticPort}`;
    const api = await startApi(siteUrl);
    apiServer = api.server;
    apiPostCount = api.postCount;
    const apiPort = (apiServer.address() as AddressInfo).port;
    apiUrl = `http://127.0.0.1:${apiPort}`;
  });

  test.afterAll(async () => {
    await browser.close();
    await new Promise<void>((r) => staticServer.close(() => r()));
    await new Promise<void>((r) => apiServer.close(() => r()));
  });

  test('P44: beacon survives real cross-origin CORS — preflight + POST both succeed', async () => {
    const page = await browser.newPage();
    // config.js is loaded before any inline script on the page and sets
    // JURO_API_URL to prod. Override it here so the beacon points at our
    // local cross-origin test API instead.
    await page.route('**/config.js', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.JURO_API_URL = ${JSON.stringify(apiUrl)};`,
      });
    });

    const postResponsePromise = page.waitForResponse(
      (r) => r.url().endsWith('/api/v1/pageview') && r.request().method() === 'POST',
      { timeout: 5_000 },
    );

    await page.goto(siteUrl + '/');
    const postResponse = await postResponsePromise;

    // If sendBeacon+JSON silently dropped, waitForResponse would time out
    // and this line wouldn't run. Reaching it proves the request completed
    // through real CORS enforcement.
    expect(postResponse.status()).toBe(200);
    expect(apiPostCount.n).toBe(1);

    await page.close();
  });
});
