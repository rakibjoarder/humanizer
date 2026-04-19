import type { Page } from '@playwright/test';

const EMAIL = process.env.TEST_USER_EMAIL!;
const PASSWORD = process.env.TEST_USER_PASSWORD!;

/**
 * Log in via the login modal on the marketing home page.
 * After this resolves the browser is authenticated and on /dashboard.
 */
export async function loginAs(page: Page, email = EMAIL, password = PASSWORD) {
	// Clear any existing session so the login modal always shows
	await page.context().clearCookies();
	await page.goto('/?login=1');

	// Wait for the modal to render
	await page.locator('button.login-submit').waitFor({ state: 'visible', timeout: 5_000 });

	// Fill modal fields — labels are "Email" and "Password"
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(password);
	await page.locator('button.login-submit').click();

	// Wait for modal to close (submit button disappears) → login succeeded
	await page.locator('button.login-submit').waitFor({ state: 'hidden', timeout: 12_000 });

	// Navigate to dashboard — session cookie is now set
	await page.goto('/dashboard');
	await page.waitForURL('/dashboard', { timeout: 8_000 });
}

/**
 * Log out by clicking the user menu sign-out option.
 */
export async function logout(page: Page) {
	// Clear all cookies to simulate sign out — simpler and more reliable than UI flow
	await page.context().clearCookies();
	await page.goto('/');
}
