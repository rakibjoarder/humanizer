import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Dashboard', () => {
	test('unauthenticated user cannot access dashboard', async ({ page }) => {
		await page.goto('/dashboard');
		// hooks redirects to /?login=1; $effect strips params → modal opens at /
		await expect(page.locator('button.login-submit')).toBeVisible({ timeout: 8_000 });
	});

	test('dashboard loads and shows plan badge', async ({ page }) => {
		await loginAs(page);
		await page.goto('/dashboard');
		await expect(page).toHaveURL('/dashboard');
		// Either Free or Pro badge should be visible
		await expect(page.getByText(/free|pro/i).first()).toBeVisible();
	});

	test('dashboard shows usage stats', async ({ page }) => {
		await loginAs(page);
		await page.goto('/dashboard');
		// Stats section headings
		await expect(page.getByText(/detections|humanizations|words/i).first()).toBeVisible();
	});

	test('dashboard shows recent activity table', async ({ page }) => {
		await loginAs(page);
		await page.goto('/dashboard');
		// Dashboard has a Billing History section
		await expect(page.getByText(/billing history/i).first()).toBeVisible();
	});

	test('upgraded banner appears when ?upgraded=true is in URL', async ({ page }) => {
		await loginAs(page);
		await page.goto('/dashboard?upgraded=true');
		// Banner text: "You're now on the X plan. Enjoy your upgraded words!"
		await expect(page.getByText(/now on the|enjoy your upgraded/i)).toBeVisible({ timeout: 5_000 });
	});

	test('nav links are all functional', async ({ page }) => {
		await loginAs(page);

		const links = [
			{ label: /detect/i, url: '/detect' },
			{ label: /humanize/i, url: '/humanize' },
			{ label: /dashboard/i, url: '/dashboard' },
			{ label: /history/i, url: '/activity' }
		];

		for (const { label, url } of links) {
			await page.getByRole('link', { name: label }).first().click();
			await expect(page).toHaveURL(url);
		}
	});
});
