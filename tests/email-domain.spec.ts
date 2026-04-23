import { test, expect, SAMPLE_FINDINGS_RESPONSE } from './fixtures';

test.describe('helpers — pure', () => {
  test('isPersonalMailProvider recognises common providers', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    const results = await page.evaluate(() => {
      const h = (window as any).__juroEmailHelpers;
      return {
        gmail: h.isPersonalMailProvider('a@gmail.com'),
        yahooUK: h.isPersonalMailProvider('a@yahoo.co.uk'),
        proton: h.isPersonalMailProvider('a@proton.me'),
        work: h.isPersonalMailProvider('a@kapiva.in'),
        weird: h.isPersonalMailProvider('no-at-sign'),
      };
    });
    expect(results).toEqual({
      gmail: true, yahooUK: true, proton: true, work: false, weird: false,
    });
  });

  test('shouldWarnAboutEmail: warns iff personal AND mismatched domain', async ({ page, siteUrl }) => {
    await page.goto(siteUrl);
    const r = await page.evaluate(() => {
      const h = (window as any).__juroEmailHelpers;
      return {
        match: h.shouldWarnAboutEmail('ceo@kapiva.in', 'kapiva.in'),
        personalMismatch: h.shouldWarnAboutEmail('ceo@gmail.com', 'kapiva.in'),
        workMismatch: h.shouldWarnAboutEmail('ceo@parent-co.com', 'kapiva.in'),
        wwwPrefix: h.shouldWarnAboutEmail('ceo@kapiva.in', 'www.kapiva.in'),
        caseInsensitive: h.shouldWarnAboutEmail('CEO@Gmail.com', 'kapiva.in'),
      };
    });
    expect(r).toEqual({
      match: false,
      personalMismatch: true,
      workMismatch: false,
      wwwPrefix: false,
      caseInsensitive: true,
    });
  });
});

test.describe('G — email-capture modal (post-scan)', () => {
  test.beforeEach(async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();
    await expect(page.locator('#resultsArea')).toBeVisible();
    // Modal auto-opens ~2.5s after last card. Wait for it.
    await expect(page.locator('#emailModal')).toBeVisible({ timeout: 8_000 });
  });

  test('G25: modal auto-opens after successful scan with findings; domain label populated', async ({ page }) => {
    await expect(page.locator('#modalDomainLabel')).toHaveText('example.com');
    await expect(page.locator('#modalDomainField')).toHaveValue('example.com');
  });

  test('G26: domain-matched email submits silently', async ({ page }) => {
    await page.locator('#modalEmail').fill('ceo@example.com');
    await page.locator('#emailForm .modal-submit').click();

    // No notice.
    await expect(page.locator('#noticeDialog')).not.toHaveClass(/is-open/);
    // Success state eventually shows.
    await expect(page.locator('#modalSuccess')).toBeVisible({ timeout: 5_000 });
  });

  test('G27: personal-mail mismatch → soft notice, form stays open', async ({ page }) => {
    await page.locator('#modalEmail').fill('ceo@gmail.com');
    await page.locator('#emailForm .modal-submit').click();

    const dialog = page.locator('#noticeDialog');
    await expect(dialog).toHaveClass(/is-open/);
    await expect(page.locator('#noticeMessage')).toContainText('work email');
    await expect(page.locator('#noticeMessage')).toContainText('@example.com');
    // Form not yet submitted, modal still visible.
    await expect(page.locator('#emailForm')).toBeVisible();
    await expect(page.locator('#modalSuccess')).toBeHidden();
  });

  test('G28: non-personal mismatch (parent/subsidiary) is accepted silently', async ({ page }) => {
    await page.locator('#modalEmail').fill('ceo@parent-co.com');
    await page.locator('#emailForm .modal-submit').click();

    await expect(page.locator('#noticeDialog')).not.toHaveClass(/is-open/);
    await expect(page.locator('#modalSuccess')).toBeVisible({ timeout: 5_000 });
  });

  test('G29: after dismissing soft notice, resubmitting the same email proceeds', async ({ page }) => {
    await page.locator('#modalEmail').fill('ceo@gmail.com');
    await page.locator('#emailForm .modal-submit').click();
    await expect(page.locator('#noticeDialog')).toHaveClass(/is-open/);

    await page.locator('#noticeOk').click();
    await page.locator('#emailForm .modal-submit').click();

    await expect(page.locator('#modalSuccess')).toBeVisible({ timeout: 5_000 });
  });

  test('G29b: changing the email to a different personal provider re-triggers the warn', async ({ page }) => {
    await page.locator('#modalEmail').fill('ceo@gmail.com');
    await page.locator('#emailForm .modal-submit').click();
    await expect(page.locator('#noticeDialog')).toHaveClass(/is-open/);

    await page.locator('#noticeOk').click();
    await page.locator('#modalEmail').fill('ceo@yahoo.com');
    await page.locator('#emailForm .modal-submit').click();

    // Warn fires again for the new personal email.
    await expect(page.locator('#noticeDialog')).toHaveClass(/is-open/);
    await expect(page.locator('#modalSuccess')).toBeHidden();
  });
});

test.describe('D-11 — gate modal soft-notice', () => {
  test('D-11a: personal email in gate → soft notice, scan not yet run', async ({ page, siteUrl, mockApi }) => {
    await page.addInitScript(() => localStorage.setItem('juro_has_scanned', '1'));
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#gateModal')).toBeVisible();
    await page.locator('#gateEmail').fill('ceo@gmail.com');
    await page.locator('#gateForm .modal-submit').click();

    await expect(page.locator('#noticeDialog')).toHaveClass(/is-open/);
    await expect(page.locator('#noticeMessage')).toContainText('@example.com');
    expect(mockApi.requests()).toHaveLength(0);
  });

  test('D-11: matched work email in gate → scan begins', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
    await page.addInitScript(() => localStorage.setItem('juro_has_scanned', '1'));
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();

    await expect(page.locator('#gateModal')).toBeVisible();
    await page.locator('#gateEmail').fill('ceo@example.com');
    await page.locator('#gateForm .modal-submit').click();

    await expect(page.locator('#resultsArea')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('H — lead submission POST body', () => {
  test('H30: post-scan modal submit posts email/source/consent_version with utm_* from query string', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
    await page.goto(`${siteUrl}/?utm_source=hn&utm_medium=post&utm_campaign=launch-week`);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();
    await expect(page.locator('#resultsArea')).toBeVisible();
    await expect(page.locator('#emailModal')).toBeVisible({ timeout: 8_000 });

    await page.locator('#modalEmail').fill('ceo@example.com');
    await page.locator('#emailForm .modal-submit').click();
    await expect(page.locator('#modalSuccess')).toBeVisible({ timeout: 5_000 });

    const leads = mockApi.leadsRequests();
    expect(leads).toHaveLength(1);
    expect(leads[0].url).toMatch(/\/api\/v1\/leads$/);
    expect(leads[0].body).toMatchObject({
      email: 'ceo@example.com',
      source: 'homepage',
      consent_version: '2026-04',
      utm_source: 'hn',
      utm_medium: 'post',
      utm_campaign: 'launch-week',
    });
  });

  test('H31: pre-scan gate submit posts email/source=homepage/consent_version', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
    await page.addInitScript(() => localStorage.setItem('juro_has_scanned', '1'));
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();
    await expect(page.locator('#gateModal')).toBeVisible();

    await page.locator('#gateEmail').fill('ceo@example.com');
    await page.locator('#gateForm .modal-submit').click();
    await expect(page.locator('#resultsArea')).toBeVisible({ timeout: 15_000 });

    const leads = mockApi.leadsRequests();
    expect(leads.length).toBeGreaterThanOrEqual(1);
    expect(leads[0].body).toMatchObject({
      email: 'ceo@example.com',
      source: 'homepage',
      consent_version: '2026-04',
    });
  });

  test('H32: soft-notice path does not post a lead (no body leaks during warn)', async ({ page, siteUrl, mockApi }) => {
    mockApi.respondWith(SAMPLE_FINDINGS_RESPONSE);
    await page.goto(siteUrl);
    await page.locator('#urlInput').fill('example.com');
    await page.locator('#consentBox').check();
    await page.locator('#scanBtn').click();
    await expect(page.locator('#resultsArea')).toBeVisible();
    await expect(page.locator('#emailModal')).toBeVisible({ timeout: 8_000 });

    await page.locator('#modalEmail').fill('ceo@gmail.com');
    await page.locator('#emailForm .modal-submit').click();
    await expect(page.locator('#noticeDialog')).toHaveClass(/is-open/);

    // The warn intercepts before submitLead() is called — no POST should have left.
    expect(mockApi.leadsRequests()).toHaveLength(0);
  });
});
