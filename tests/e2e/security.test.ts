/**
 * Security headers, token isolation, and access control tests.
 */
import { test, expect } from '@playwright/test';

// ── Security headers ──────────────────────────────────────────────────────────

test.describe('Security headers', () => {
	test('home page includes X-Content-Type-Options: nosniff', async ({ request }) => {
		const res = await request.get('/');
		expect(res.headers()['x-content-type-options']).toBe('nosniff');
	});

	test('home page includes X-Frame-Options: DENY', async ({ request }) => {
		const res = await request.get('/');
		expect(res.headers()['x-frame-options']).toBe('DENY');
	});

	test('home page includes Referrer-Policy', async ({ request }) => {
		const res = await request.get('/');
		expect(res.headers()['referrer-policy']).toBeTruthy();
	});

	test('home page includes Content-Security-Policy header', async ({ request }) => {
		const res = await request.get('/');
		const csp = res.headers()['content-security-policy'];
		expect(csp).toBeTruthy();
		// textaihumanizer.xyz must NOT be in connect-src (proxy token stays server-side)
		expect(csp).not.toContain('textaihumanizer.xyz');
		// default-src must restrict to self
		expect(csp).toContain("default-src 'self'");
	});

	test('API route includes security headers', async ({ request }) => {
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: 'x'.repeat(50) }
		});
		expect(res.headers()['x-content-type-options']).toBe('nosniff');
		expect(res.headers()['x-frame-options']).toBe('DENY');
	});
});

// ── PROXY_API_TOKEN isolation ─────────────────────────────────────────────────

test.describe('PROXY_API_TOKEN isolation', () => {
	test('detect API response never contains token literal', async ({ request }) => {
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: 'This is a test for token leakage in detection endpoint responses.' }
		});
		const text = await res.text();
		expect(text).not.toContain('PROXY_API_TOKEN');
		// Should never contain a bearer token pattern that looks like our proxy token
		expect(text).not.toMatch(/Bearer\s+[A-Za-z0-9_\-]{20,}/);
	});

	test('humanize API error response does not leak token', async ({ request }) => {
		// Unauthenticated — will get 401 fast without touching upstream
		const res = await request.post('/api/humanize', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: 'This is a test for token leakage in humanize error responses.' }
		});
		const text = await res.text();
		expect(text).not.toContain('PROXY_API_TOKEN');
	});

	test('error responses contain no stack traces', async ({ request }) => {
		// Invalid JSON — triggers early 400 without reaching upstream
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: 'this-is-not-json'
		});
		const text = await res.text();
		// Stack traces would contain "at " patterns
		expect(text).not.toMatch(/\s+at\s+\w+\s*\(/);
		expect(text).not.toContain('node_modules');
	});
});

// ── Authorization — horizontal privilege escalation ───────────────────────────

test.describe('Authorization', () => {
	test('unauthenticated POST /api/humanize returns 401 not 500', async ({ request }) => {
		const res = await request.post('/api/humanize', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: 'Some text here that is long enough for testing.' }
		});
		expect(res.status()).toBe(401);
		const body = await res.json();
		expect(body.error).toBeTruthy();
	});

	test('unauthenticated GET /api/billing/history returns 401', async ({ request }) => {
		const res = await request.get('/api/billing/history');
		expect(res.status()).toBe(401);
	});

	test('unauthenticated POST /api/billing/portal returns 401', async ({ request }) => {
		const res = await request.post('/api/billing/portal');
		expect(res.status()).toBe(401);
	});

	test('unauthenticated POST /api/stripe/checkout returns 401', async ({ request }) => {
		const res = await request.post('/api/stripe/checkout', {
			headers: { 'Content-Type': 'application/json' },
			data: { priceId: 'price_test', billingCycle: 'monthly' }
		});
		expect(res.status()).toBe(401);
	});

	test('unauthenticated DELETE /api/account/delete returns 401', async ({ request }) => {
		const res = await request.delete('/api/account/delete');
		expect(res.status()).toBe(401);
	});
});

// ── Content-Type validation ───────────────────────────────────────────────────

test.describe('Content-Type handling', () => {
	test('detect endpoint with no Content-Type returns 400 not 500', async ({ request }) => {
		const res = await request.post('/api/detect', {
			data: 'plain text without content type header'
		});
		// Should fail gracefully (400 or 415) — not 500
		expect(res.status()).not.toBe(500);
		expect([400, 415]).toContain(res.status());
	});

	test('detect endpoint with huge body does not crash server', async ({ request }) => {
		const hugeBody = { text: 'a'.repeat(100_000) };
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: hugeBody
		});
		// 400 expected (over limit) — must not be 500 or hang
		expect(res.status()).toBe(400);
	});
});
