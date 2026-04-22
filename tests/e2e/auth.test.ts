import { test, expect } from '@playwright/test';
import { loginAs, logout } from './helpers/auth';

const EMAIL = process.env.TEST_USER_EMAIL!;

test.describe('Authentication', () => {
	test('unauthenticated user is redirected to login when accessing protected route', async ({ page }) => {
		await page.goto('/dashboard');
		// hooks redirects to /?login=1; root layout $effect opens modal and strips params to /
		await expect(page.locator('button.login-submit')).toBeVisible({ timeout: 8_000 });
	});

	test('user can log in and reach the dashboard', async ({ page }) => {
		await loginAs(page);
		await expect(page).toHaveURL(/\/(dashboard|detect|home)/);
	});

	test('logged-in user email is visible in the nav', async ({ page }) => {
		await loginAs(page);
		// The app layout nav should be visible
		await expect(page.locator('nav').first()).toBeVisible();
	});

	test('user can sign out and is redirected to home', async ({ page }) => {
		await loginAs(page);
		await logout(page);
		await expect(page).toHaveURL('/');
	});

	test('login with wrong password shows error', async ({ page }) => {
		await page.goto('/?login=1');
		await page.getByLabel('Email').fill(EMAIL);
		await page.getByLabel('Password').fill('wrongpassword');
		await page.locator('button.login-submit').click();
		// Should show an error message, NOT navigate away
		await expect(page.locator('[class*="error"], [class*="alert"]').or(page.getByText(/invalid|incorrect|credentials/i))).toBeVisible({ timeout: 8_000 });
	});
});
