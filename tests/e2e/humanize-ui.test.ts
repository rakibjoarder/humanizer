/**
 * /humanize page — UI behaviour, loading state, copy, recheck, output fallback.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const AI_TEXT = 'In today\'s rapidly evolving digital landscape, the fundamentally transformative power of AI-driven technologies has revolutionized operational efficiency. Furthermore, comprehensive data-driven paradigms have empowered stakeholders to leverage unprecedented synergy across multifaceted workflows.';

test.describe('Humanize page — route protection', () => {
	test('unauthenticated user is redirected from /humanize', async ({ page }) => {
		await page.goto('/humanize');
		await expect(page.locator('button.login-submit')).toBeVisible({ timeout: 8_000 });
		expect(page.url()).not.toContain('/humanize');
	});
});

test.describe('Humanize page — input controls', () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page);
		await page.goto('/humanize');
		await expect(page.getByRole('heading', { name: /humanize/i })).toBeVisible();
	});

	test('Humanize button disabled when input is empty', async ({ page }) => {
		const btn = page.getByRole('button', { name: /^humanize$/i });
		await expect(btn).toBeDisabled();
	});

	test('Humanize button disabled when input is too short (< 10 chars)', async ({ page }) => {
		const textarea = page.locator('textarea').first();
		await textarea.fill('Hi.');
		const btn = page.getByRole('button', { name: /^humanize$/i });
		await expect(btn).toBeDisabled();
	});

	test('Humanize button enabled when input meets minimum', async ({ page }) => {
		const textarea = page.locator('textarea').first();
		await textarea.fill(AI_TEXT);
		await page.waitForTimeout(300);
		const btn = page.getByRole('button', { name: /^humanize$/i });
		await expect(btn).toBeEnabled({ timeout: 5_000 });
	});

	test('word counter shows correct count', async ({ page }) => {
		const textarea = page.locator('textarea').first();
		await textarea.fill('Hello world test');
		// Counter format is "N / 3,000 words" (localized)
		await expect(page.getByText(/[\d,]+ \/ [\d,]+ words/).first()).toBeVisible();
	});

	test('over-limit warning shown when text exceeds 3,000 words', async ({ page }) => {
		const textarea = page.locator('textarea').first();
		// Humanize TextEditor has no maxWords, so text is not trimmed — 3001 words triggers overLimit
		await textarea.fill('word '.repeat(3001));
		await page.waitForTimeout(300);
		await expect(page.getByText(/exceeds.*word limit/i)).toBeVisible({ timeout: 5_000 });
		const btn = page.getByRole('button', { name: /^humanize$/i });
		await expect(btn).toBeDisabled();
	});
});

test.describe('Humanize page — loading and output', () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page);
		await page.goto('/humanize');
	});

	test('Humanize button disabled during processing', async ({ page }) => {
		test.setTimeout(60_000);
		// Upstream can return in milliseconds; delay the API so loading state is observable
		await page.route('**/api/humanize', async (route) => {
			if (route.request().method() !== 'POST') return route.continue();
			await new Promise((r) => setTimeout(r, 2_500));
			await route.continue();
		});

		const textarea = page.locator('textarea').first();
		await textarea.fill(AI_TEXT);
		await page.waitForTimeout(300);

		const btn = page.getByRole('button', { name: /^humanize$/i });
		await expect(btn).toBeEnabled({ timeout: 5_000 });
		await btn.click();

		await expect(btn).toBeDisabled({ timeout: 3_000 });
		await expect(btn).toHaveAttribute('aria-busy', 'true', { timeout: 3_000 });
		await page.unroute('**/api/humanize');
	});

	test('progress indicator visible during humanization', async ({ page }) => {
		test.setTimeout(60_000);
		const textarea = page.locator('textarea').first();
		await textarea.fill(AI_TEXT);
		await page.waitForTimeout(300);

		const btn = page.getByRole('button', { name: /^humanize$/i });
		await expect(btn).toBeEnabled({ timeout: 5_000 });
		await btn.click();

		// Loading state shows elapsed timer
		await expect(page.getByText(/elapsed:/i)).toBeVisible({ timeout: 5_000 });
	});

	test('output section shows result and copy button after humanize', async ({ page }) => {
		test.setTimeout(180_000);
		const textarea = page.locator('textarea').first();
		await textarea.fill(AI_TEXT);
		await page.waitForTimeout(300);

		const btn = page.getByRole('button', { name: /^humanize$/i });
		await expect(btn).toBeEnabled({ timeout: 5_000 });
		await btn.click();

		// Upstream can take up to 130s
		await expect(
			page.getByRole('button', { name: /copy output/i })
		).toBeVisible({ timeout: 150_000 });
	});

	test('Re-check detection navigates to /detect page', async ({ page }) => {
		test.setTimeout(180_000);
		await page.route('**/api/humanize', async (route) => {
			if (route.request().method() !== 'POST') return route.continue();
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					humanized_text:
						'This is a mocked humanized paragraph with enough substance to satisfy downstream checks and navigation tests without relying on live upstream or word balance.',
					word_count: 24,
					words_balance: 999_999
				})
			});
		});
		try {
			const textarea = page.locator('textarea').first();
			await textarea.fill(AI_TEXT);
			await page.waitForTimeout(300);

			const btn = page.getByRole('button', { name: /^humanize$/i });
			await expect(btn).toBeEnabled({ timeout: 5_000 });
			await btn.click();
			await expect(page.getByRole('button', { name: /copy output/i })).toBeVisible({ timeout: 30_000 });

			await page.getByRole('button', { name: /re-check detection/i }).first().click();
			await expect(page).toHaveURL((url) => url.pathname === '/detect');
		} finally {
			await page.unroute('**/api/humanize');
		}
	});

	test('Re-check detection pre-fills detect textarea with humanized output', async ({ page }) => {
		test.setTimeout(180_000);
		const textarea = page.locator('textarea').first();
		await textarea.fill(AI_TEXT);
		await page.waitForTimeout(300);

		const btn = page.getByRole('button', { name: /^humanize$/i });
		await expect(btn).toBeEnabled({ timeout: 5_000 });
		await btn.click();
		await expect(page.getByRole('button', { name: /copy output/i })).toBeVisible({ timeout: 150_000 });

		await page.getByRole('button', { name: /re-check detection/i }).first().click();
		await expect(page).toHaveURL((url) => url.pathname === '/detect');

		// detect_prefill key → detect page auto-fills textarea
		const detectTextarea = page.locator('textarea').first();
		await expect(detectTextarea).not.toHaveValue('', { timeout: 5_000 });
	});
});
