import { test as base, expect } from '@playwright/test';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import type { AddressInfo } from 'net';

const REPO_ROOT = path.resolve(__dirname, '..');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
};

function startStaticServer(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
    const full = path.join(REPO_ROOT, rel);
    if (!full.startsWith(REPO_ROOT) || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    const ext = path.extname(full);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

export interface ScanResponse {
  url?: string;
  elapsed?: string | number;
  posture?: Array<{ rule: string; status: 'pass' | 'fail'; description?: string }>;
  findings?: Array<{
    id: string;
    sev: 'critical' | 'high' | 'medium';
    title: string;
    desc: string;
    rule: string;
    location: string;
    remediation: string;
  }>;
  error?: string;
}

export interface MockApi {
  respondWith(body: ScanResponse, status?: number): void;
  respondError(status: number, body?: string): void;
  fail(): void;
  requests(): Array<{ url: string; body: any }>;
}

type Fixtures = {
  siteUrl: string;
  mockApi: MockApi;
};

type WorkerFixtures = {
  staticServer: http.Server;
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  staticServer: [
    async ({}, use) => {
      const s = await startStaticServer();
      await use(s);
      await new Promise<void>((r) => s.close(() => r()));
    },
    { scope: 'worker', auto: true },
  ],

  siteUrl: async ({ staticServer }, use) => {
    const { port } = staticServer.address() as AddressInfo;
    await use(`http://127.0.0.1:${port}`);
  },

  mockApi: async ({ page }, use) => {
    let next: { status: number; body: string | ScanResponse } | null = null;
    let shouldFail = false;
    const captured: Array<{ url: string; body: any }> = [];

    await page.route('**/api/scan', async (route) => {
      try {
        captured.push({ url: route.request().url(), body: route.request().postDataJSON() });
      } catch {
        captured.push({ url: route.request().url(), body: null });
      }
      if (shouldFail) {
        await route.abort('failed');
        return;
      }
      if (!next) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'no mock queued for this test' }),
        });
        return;
      }
      const bodyStr = typeof next.body === 'string' ? next.body : JSON.stringify(next.body);
      await route.fulfill({
        status: next.status,
        contentType: 'application/json',
        body: bodyStr,
      });
    });

    await page.route('**formspree.io/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    const api: MockApi = {
      respondWith(body, status = 200) {
        next = { status, body };
        shouldFail = false;
      },
      respondError(status, body = '') {
        next = { status, body };
        shouldFail = false;
      },
      fail() {
        shouldFail = true;
        next = null;
      },
      requests() {
        return [...captured];
      },
    };
    await use(api);
  },
});

export { expect };

export const SAMPLE_FINDINGS_RESPONSE: ScanResponse = {
  url: 'https://example.com',
  elapsed: '12.3',
  posture: [
    { rule: 'Consent Management', status: 'fail' },
    { rule: 'Cookie Compliance', status: 'fail' },
    { rule: 'Notice Requirements', status: 'pass' },
  ],
  findings: [
    {
      id: 'F-001',
      sev: 'critical',
      title: 'Analytics scripts fire before consent',
      desc: 'GA fires on page load before consent banner is shown.',
      rule: 'DPDP § 5',
      location: 'example.com',
      remediation: 'Block tags until explicit consent is granted.',
    },
    {
      id: 'F-002',
      sev: 'high',
      title: 'No Reject All button on first layer',
      desc: 'Consent banner requires multiple clicks to reject.',
      rule: 'GDPR Art. 7',
      location: 'example.com',
      remediation: 'Add a visible Reject All button.',
    },
    {
      id: 'F-003',
      sev: 'high',
      title: 'Tracking cookie before consent',
      desc: '_fbp set prior to banner interaction.',
      rule: 'DPDP § 6',
      location: 'example.com',
      remediation: 'Gate analytics cookies behind consent.',
    },
  ],
};

export const EMPTY_FINDINGS_RESPONSE: ScanResponse = {
  url: 'https://abhyaas.org',
  elapsed: '9.9',
  posture: [
    { rule: 'Consent Management', status: 'pass' },
    { rule: 'Cookie Compliance', status: 'pass' },
    { rule: 'Notice Requirements', status: 'pass' },
  ],
  findings: [],
};
