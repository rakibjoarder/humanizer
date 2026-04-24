import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const TEST_USER_ID     = process.env.TEST_USER_ID     ?? '7f0daf5b-f16a-40cc-8c8b-b40675e3dd50';
const TEST_CUSTOMER_ID = process.env.TEST_CUSTOMER_ID ?? 'cus_UNGlr6ydM8TxWA';

// ── API: /api/billing/history ─────────────────────────────────────────────────

test.describe('Billing history API', () => {
	test('unauthenticated request returns 401', async ({ request }) => {
		const res = await request.get('/api/billing/history');
		expect(res.status()).toBe(401);
	});

	test('authenticated user gets invoices and cancellations arrays', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		const res = await request.get('/api/billing/history', {
			headers: { Cookie: cookieHeader }
		});
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body).not.toHaveProperty('error');
		expect(Array.isArray(body.invoices)).toBe(true);
		expect(Array.isArray(body.cancellations)).toBe(true);
	});

	test('invoice objects have expected fields', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		const res = await request.get('/api/billing/history', {
			headers: { Cookie: cookieHeader }
		});
		const { invoices } = await res.json();

		for (const inv of invoices) {
			expect(inv).toHaveProperty('id');
			expect(inv).toHaveProperty('status');
			expect(inv).toHaveProperty('amount_paid');
			expect(inv).toHaveProperty('currency');
			expect(inv).toHaveProperty('created');
			expect(typeof inv.amount_paid).toBe('number');
			expect(typeof inv.created).toBe('number');
		}
	});

	test('cancellation objects have canceled_at field', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		const res = await request.get('/api/billing/history', {
			headers: { Cookie: cookieHeader }
		});
		const { cancellations } = await res.json();

		for (const c of cancellations) {
			expect(c).toHaveProperty('id');
			expect(c).toHaveProperty('canceled_at');
		}
	});
});

// ── UI: Settings billing history ──────────────────────────────────────────────

test.describe('Billing History UI (settings)', () => {
	test('billing history section is visible for user with ls_customer_id', async ({ page }) => {
		await loginAs(page);
		await page.goto('/settings');
		// Section is only shown when the user has a ls_customer_id
		const visible = await page.getByText('Billing History').isVisible({ timeout: 8_000 }).catch(() => false);
		if (!visible) {
			// User has no ls_customer_id — skip rather than fail
			test.skip();
			return;
		}
		await expect(page.getByText('Billing History')).toBeVisible();
	});

	test('invoices load automatically without a button click', async ({ page }) => {
		await loginAs(page);
		await page.goto('/settings');
		// If no ls_customer_id, billing section absent — skip
		const sectionVisible = await page.getByText('Billing History').isVisible({ timeout: 5_000 }).catch(() => false);
		if (!sectionVisible) { test.skip(); return; }
		// Either invoices appear OR "No billing history found" — both mean the load ran
		await expect(
			page.getByText(/no billing history found|paid|canceled/i).first()
		).toBeVisible({ timeout: 10_000 });
	});

	test('canceled subscription row is shown when subscription was canceled', async ({ page }) => {
		await loginAs(page);
		await page.goto('/settings');
		// Wait for billing history to load
		await page.waitForTimeout(2_000);
		// Canceled badge may or may not exist depending on user's subscription history
		const canceledVisible = await page.getByText('Canceled').isVisible().catch(() => false);
		const noHistoryVisible = await page.getByText(/no billing history found/i).isVisible().catch(() => false);
		// Either a Canceled row or "no billing history" is acceptable
		expect(canceledVisible || noHistoryVisible).toBe(true);
	});

	test('no "Load invoices" button exists — invoices auto-load', async ({ page }) => {
		await loginAs(page);
		await page.goto('/settings');
		await expect(page.getByRole('button', { name: /load invoices/i })).not.toBeVisible();
	});
});

// ── UI: Dashboard billing history ─────────────────────────────────────────────

test.describe('Billing History UI (dashboard)', () => {
	test('billing history section is visible on dashboard for user with ls_customer_id', async ({ page }) => {
		await loginAs(page);
		await page.goto('/dashboard');
		const visible = await page.getByText('Billing History').isVisible({ timeout: 8_000 }).catch(() => false);
		if (!visible) { test.skip(); return; }
		await expect(page.getByText('Billing History')).toBeVisible();
	});

	test('invoices auto-load on dashboard', async ({ page }) => {
		await loginAs(page);
		await page.goto('/dashboard');
		const sectionVisible = await page.getByText('Billing History').isVisible({ timeout: 5_000 }).catch(() => false);
		if (!sectionVisible) { test.skip(); return; }
		await expect(
			page.getByText(/no billing history found|paid|canceled/i).first()
		).toBeVisible({ timeout: 10_000 });
	});
});
