import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const CARD = process.env.STRIPE_TEST_CARD_NUMBER ?? '4242424242424242';
const EXPIRY = process.env.STRIPE_TEST_CARD_EXPIRY ?? '12/34';
const CVC = process.env.STRIPE_TEST_CARD_CVC ?? '123';

test.describe('Stripe checkout flow', () => {
	test('checkout API returns a Stripe URL for authenticated user', async ({ page, request }) => {
		// Sign in and grab cookies
		await loginAs(page);

		// Get the cookies from the logged-in browser context
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		// Call the checkout API directly
		const res = await request.post('/api/stripe/checkout', {
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			data: {
				priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? 'price_1TNzEcH3Var8GvAxbFnr7GMf',
				billingCycle: 'monthly'
			}
		});

		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
	});

	test('checkout API returns 401 for unauthenticated request', async ({ request }) => {
		const res = await request.post('/api/stripe/checkout', {
			headers: { 'Content-Type': 'application/json' },
			data: { priceId: 'price_test', billingCycle: 'monthly' }
		});
		expect(res.status()).toBe(401);
	});

	test('checkout API returns 400 for missing priceId', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		const res = await request.post('/api/stripe/checkout', {
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			data: { billingCycle: 'monthly' }
		});
		expect(res.status()).toBe(400);
	});

	test('checkout API returns 400 for invalid billingCycle', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		const res = await request.post('/api/stripe/checkout', {
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			data: { priceId: 'price_test', billingCycle: 'weekly' }
		});
		expect(res.status()).toBe(400);
	});

	test('full checkout flow: login → pricing → Stripe → dashboard shows Pro', async ({ page }) => {
		await loginAs(page);
		// Logged-in users are redirected from /pricing → /humanize; use /plans instead
		await page.goto('/plans');

		// Wait for plan state to fully load (profile query is async)
		const openDashLink = page.getByRole('link', { name: /open dashboard/i });
		const startProBtn = page.getByRole('button', { name: /start pro/i });
		await expect(openDashLink.or(startProBtn)).toBeVisible({ timeout: 10_000 });

		// If already Pro, skip checkout — user already completed this flow
		if (await openDashLink.isVisible()) {
			return;
		}

		// Click Start Pro
		await startProBtn.click();

		// Wait for Stripe checkout page
		await page.waitForURL(/checkout\.stripe\.com/, { timeout: 12_000 });

		// Fill in the Stripe test card
		await page.getByPlaceholder(/card number/i).fill(CARD);
		await page.getByPlaceholder(/mm \/ yy|expiry/i).fill(EXPIRY);
		await page.getByPlaceholder(/cvc|cvv/i).fill(CVC);

		// Some Stripe checkout forms ask for name + email
		const nameField = page.getByPlaceholder(/full name|cardholder/i);
		if (await nameField.isVisible()) await nameField.fill('Test User');
		const emailField = page.getByPlaceholder(/email/i);
		if (await emailField.isVisible()) await emailField.fill(process.env.TEST_USER_EMAIL!);

		// Submit
		await page.getByRole('button', { name: /subscribe|pay|confirm/i }).click();

		// Stripe redirects to our success URL: /dashboard?upgraded=true&session_id=...
		await page.waitForURL(/dashboard.*upgraded=true/, { timeout: 20_000 });

		// Dashboard should show "Pro" plan
		await expect(page.getByText(/pro/i)).toBeVisible();

		// Upgraded banner should appear
		await expect(page.getByText(/pro|upgrade|congratulations/i)).toBeVisible();
	});
});
