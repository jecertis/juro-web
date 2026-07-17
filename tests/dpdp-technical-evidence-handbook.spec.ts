/**
 * DPDP Technical Evidence Handbook — page render + structured data tests.
 *
 * Covers: FAQPage JSON-LD shape (schema.org), Article JSON-LD presence,
 * the Axiom 2 scope disclaimer, and the Section 3 "honest note on tagging"
 * appearing verbatim on the page (BL-MKT-064).
 */
import { test, expect } from './fixtures';

const PATH = '/dpdp-technical-evidence-handbook.html';

test.describe('DPDP Technical Evidence Handbook', () => {
  test('page loads and renders the H1', async ({ page, siteUrl }) => {
    await page.goto(`${siteUrl}${PATH}`);
    await expect(page.locator('h1.post-title')).toHaveText(
      'The DPDP Technical Evidence Handbook: Proving the Security Safeguards under Section 8',
    );
  });

  test('canonical URL and meta description are set', async ({ page, siteUrl }) => {
    await page.goto(`${siteUrl}${PATH}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://jurocompliant.com/dpdp-technical-evidence-handbook',
    );
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(50);
    expect(desc!.length).toBeLessThan(200);
  });

  test('article:author is never Arsh Makker or JeCertis', async ({ page, siteUrl }) => {
    await page.goto(`${siteUrl}${PATH}`);
    const author = await page.locator('meta[property="article:author"]').getAttribute('content');
    expect(author).toBeTruthy();
    expect(author).not.toContain('Arsh Makker');
    expect(author).not.toContain('JeCertis');
  });

  test('Article JSON-LD is present with correct shape', async ({ page, siteUrl }) => {
    await page.goto(`${siteUrl}${PATH}`);
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const blocks = scripts.map((s) => JSON.parse(s));
    const article = blocks.find((b) => b['@type'] === 'Article');
    expect(article).toBeTruthy();
    expect(article['@context']).toBe('https://schema.org');
    expect(article.headline).toBe(
      'The DPDP Technical Evidence Handbook: Proving the Security Safeguards under Section 8',
    );
    expect(article.url).toBe('https://jurocompliant.com/dpdp-technical-evidence-handbook');
  });

  test('FAQPage JSON-LD has correct schema.org shape', async ({ page, siteUrl }) => {
    await page.goto(`${siteUrl}${PATH}`);
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const blocks = scripts.map((s) => JSON.parse(s));
    const faq = blocks.find((b) => b['@type'] === 'FAQPage');
    expect(faq).toBeTruthy();
    expect(faq['@context']).toBe('https://schema.org');
    expect(Array.isArray(faq.mainEntity)).toBe(true);
    // One Question/Answer pair per "###...?" heading in Sections 1-6 of the
    // source handbook (22 question headings across the six control sections).
    expect(faq.mainEntity.length).toBe(22);
    for (const entry of faq.mainEntity) {
      expect(entry['@type']).toBe('Question');
      expect(typeof entry.name).toBe('string');
      expect(entry.name.trim().endsWith('?')).toBe(true);
      expect(entry.acceptedAnswer['@type']).toBe('Answer');
      expect(typeof entry.acceptedAnswer.text).toBe('string');
      expect(entry.acceptedAnswer.text.length).toBeGreaterThan(20);
    }
  });

  test('FAQPage question names match the visible on-page question headings', async ({
    page,
    siteUrl,
  }) => {
    await page.goto(`${siteUrl}${PATH}`);
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const blocks = scripts.map((s) => JSON.parse(s));
    const faq = blocks.find((b) => b['@type'] === 'FAQPage');
    const jsonLdNames: string[] = faq.mainEntity.map((e: any) => e.name);

    const visibleHeadings = await page.locator('.control-entry h3').allTextContents();

    expect(jsonLdNames).toEqual(visibleHeadings);
  });

  test('Axiom 2 scope disclaimer appears verbatim on the page', async ({ page, siteUrl }) => {
    await page.goto(`${siteUrl}${PATH}`);
    await expect(page.locator('.scope-note-label')).toHaveText('Note on scope, per Axiom 2');
    await expect(page.locator('.scope-note')).toContainText(
      'It does not make you "DPDP compliant" and the scanner does not certify compliance.',
    );
    await expect(page.locator('.scope-note')).toContainText(
      'Compliance is a legal determination made by a person, not a scan.',
    );
    await expect(page.locator('.scope-note')).toContainText(
      'If you quote a single answer, it should stay true and stay honest without the rest of the page.',
    );
  });

  test('Section 3 honest note on tagging appears verbatim on the page', async ({
    page,
    siteUrl,
  }) => {
    await page.goto(`${siteUrl}${PATH}`);
    await expect(page.locator('.honest-note-label')).toHaveText('An honest note on tagging');
    await expect(page.locator('.honest-note')).toContainText(
      'these five checks carry a GDPR Art. 32 legal basis, encryption of personal data, which is the same safeguard the DPDP Act asks for',
    );
    await expect(page.locator('.honest-note')).toContainText(
      'The scan output for these five does not yet print a DPDP tag.',
    );
    await expect(page.locator('.honest-note')).toContainText(
      'Do not read the current scan output as showing a DPDP citation for these five.',
    );
  });

  test('Section 7 advisory entries are present and labelled as advisory', async ({
    page,
    siteUrl,
  }) => {
    await page.goto(`${siteUrl}${PATH}`);
    const badges = page.locator('.advisory-badge');
    await expect(badges).toHaveCount(2);
    await expect(page.locator('.advisory-entry h3').nth(0)).toContainText(
      '7a. Processor and Vendor (DPA) obligations',
    );
    await expect(page.locator('.advisory-entry h3').nth(1)).toContainText(
      '7b. Breach notification to the Board and data principals',
    );
  });

  test('no banned claim phrases appear on the page', async ({ page, siteUrl }) => {
    await page.goto(`${siteUrl}${PATH}`);
    const bodyText = await page.locator('body').innerText();
    const banned = [
      'SOC 2 compliant',
      'SOC2 compliant',
      'enterprise-grade',
      'AI-powered compliance',
      'trust center',
      'Trust Center',
      'GRC platform',
      'compliance made easy',
    ];
    for (const phrase of banned) {
      expect(bodyText).not.toContain(phrase);
    }
  });
});
