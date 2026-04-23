/**
 * /detect page — UI behaviour, character counter, gauge, badge, actions.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const SAMPLE_TEXT = 'In today\'s rapidly evolving digital landscape, the fundamentally transformative power of AI-driven technologies has revolutionized operational efficiency and created unprecedented opportunities for stakeholders to leverage data-driven insights.';

test.describe('Detect page — route protection', () => {
	test('unauthenticated user is redirected away from /detect', async ({ page }) => {
		await page.goto('/detect');
		// hooks.server.ts redirects to /?login=1 — login modal opens
		await expect(page.locator('button.login-submit')).toBeVisible({ timeout: 8_000 });
		expect(page.url()).not.toContain('/detect');
	});
});

test.describe('Detect page — UI elements', () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page);
		await page.goto('/detect');
		await expect(page.getByRole('heading', { name: /detect/i })).toBeVisible();
	});

	test('word counter updates live as user types', async ({ page }) => {
		const textarea = page.locator('textarea').first();
		await textarea.fill('Hello world this is a test sentence with more than fifty characters total');
		// Counter format is "N / M,000 words" (localized numbers). Two counters exist — use first().
		await expect(page.getByText(/[\d,]+ \/ [\d,]+ words/).first()).toBeVisible();
	});

	test('Analyze button is disabled when input is too short', async ({ page }) => {
		const textarea = page.locator('textarea').first();
		await textarea.fill('Too short');
		const btn = page.getByRole('button', { name: /analyze/i });
		await expect(btn).toBeDisabled();
	});

	test('Analyze button is enabled when input meets 50-char minimum', async ({ page }) => {
		const textarea = page.locator('textarea').first();
		await textarea.fill(SAMPLE_TEXT);
		await page.waitForTimeout(300);
		const btn = page.getByRole('button', { name: /analyze/i });
		await expect(btn).toBeEnabled({ timeout: 5_000 });
	});

	test('word counter is visible when text is entered', async ({ page }) => {
		const textarea = page.locator('textarea').first();
		await textarea.fill(SAMPLE_TEXT);
		// Word counter always shown in CardHeader right slot
		await expect(page.getByText(/[\d,]+ \/ [\d,]+ words/).first()).toBeVisible();
	});

	test('Clear button resets input', async ({ page }) => {
		const shell = page.locator('.detect-page');
		const input = shell.getByRole('textbox', { name: /text input/i });
		await input.fill(SAMPLE_TEXT);
		await shell.getByRole('button', { name: /^clear$/i }).click();
		await expect(input).toHaveValue('', { timeout: 5_000 });
	});

	test('Paste sample button populates textarea', async ({ page }) => {
		const shell = page.locator('.detect-page');
		await shell.getByRole('button', { name: /paste sample/i }).click();
		const input = shell.getByRole('textbox', { name: /text input/i });
		await expect(input).not.toHaveValue('', { timeout: 10_000 });
		const val = await input.inputValue();
		expect(val.length).toBeGreaterThan(50);
	});

	test('placeholder state shows help text when no result', async ({ page }) => {
		await expect(page.getByText(/paste at least 50 characters/i)).toBeVisible();
	});
});

test.describe('Detect page — after detection', () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page);
		await page.goto('/detect');
	});

	test('result panel shows score and verdict after analyze', async ({ page }) => {
		test.setTimeout(60_000);
		const textarea = page.locator('textarea').first();
		await textarea.fill(SAMPLE_TEXT);
		await page.waitForTimeout(300);

		const analyzeBtn = page.getByRole('button', { name: /analyze/i });
		await expect(analyzeBtn).toBeEnabled({ timeout: 5_000 });
		await analyzeBtn.click();

		// Loading state appears first
		await expect(page.locator('.detect-result-loading')).toBeVisible({ timeout: 5_000 });

		// Wait for result (upstream can take up to 40s)
		await expect(page.locator('.dr-panel')).toBeVisible({ timeout: 45_000 });

		// Score cards should be visible
		await expect(page.getByText(/AI-generated/i)).toBeVisible();
		await expect(page.getByText(/Human-written/i)).toBeVisible();
	});

	test('Humanize this text button appears after detect result', async ({ page }) => {
		test.setTimeout(60_000);
		const textarea = page.locator('textarea').first();
		await textarea.fill(SAMPLE_TEXT);
		await page.waitForTimeout(300);

		const analyzeBtn = page.getByRole('button', { name: /analyze/i });
		await expect(analyzeBtn).toBeEnabled({ timeout: 5_000 });
		await analyzeBtn.click();

		await expect(page.locator('.dr-panel')).toBeVisible({ timeout: 45_000 });
		await expect(page.getByRole('button', { name: /humanize this text/i })).toBeVisible();
	});

	test('Copy report button copies text to clipboard', async ({ page, context }) => {
		test.setTimeout(60_000);
		await context.grantPermissions(['clipboard-read', 'clipboard-write']);

		const textarea = page.locator('textarea').first();
		await textarea.fill(SAMPLE_TEXT);
		await page.waitForTimeout(300);

		const analyzeBtn = page.getByRole('button', { name: /analyze/i });
		await expect(analyzeBtn).toBeEnabled({ timeout: 5_000 });
		await analyzeBtn.click();

		await expect(page.locator('.dr-panel')).toBeVisible({ timeout: 45_000 });
		await page.getByRole('button', { name: /copy report/i }).click();
		await expect(page.getByRole('button', { name: /copied/i })).toBeVisible({ timeout: 3_000 });
	});
});
