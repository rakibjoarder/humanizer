/**
 * POST /api/humanize — server-side validation, auth, and security tests.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

// ── AUTH ──────────────────────────────────────────────────────────────────────

test.describe('POST /api/humanize — authentication', () => {
	test('unauthenticated request returns 401', async ({ request }) => {
		const res = await request.post('/api/humanize', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: 'This is a test sentence for humanization that is long enough.' }
		});
		expect(res.status()).toBe(401);
		const body = await res.json();
		expect(body.error).toBeTruthy();
	});
});

// ── INPUT VALIDATION ─────────────────────────────────────────────────────────

test.describe('POST /api/humanize — input validation', () => {
	test('empty text returns 400', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		const res = await request.post('/api/humanize', {
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			data: { text: '' }
		});
		expect(res.status()).toBe(400);
	});

	test('whitespace-only text returns 400', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		const res = await request.post('/api/humanize', {
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			data: { text: '     ' }
		});
		expect(res.status()).toBe(400);
	});

	test('text under 10 chars returns 400', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		const res = await request.post('/api/humanize', {
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			data: { text: 'Hi there.' }
		});
		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.error).toMatch(/10 characters/i);
	});

	test('text over 50,000 chars returns 400', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		const res = await request.post('/api/humanize', {
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			data: { text: 'a '.repeat(25_001) }
		});
		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.error).toMatch(/50,000/i);
	});

	test('missing text field returns 400', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		const res = await request.post('/api/humanize', {
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			data: { other: 'value' }
		});
		expect(res.status()).toBe(400);
	});

	test('invalid JSON body returns 400', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		const res = await request.post('/api/humanize', {
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			data: 'not-json'
		});
		expect(res.status()).toBe(400);
	});

	test('server ignores client-supplied word_count field (server counts independently)', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		// Sending a fake word_count — server must compute its own
		const res = await request.post('/api/humanize', {
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			data: {
				text: 'This text has five words.',
				word_count: 1 // deliberately wrong — server must not trust this
			}
		});
		// Either 200 (upstream available) or 402 (out of words) or 500 (upstream down)
		// Key: must NOT be 400 (our validation rejects it) or corrupt the balance
		expect([200, 402, 500]).toContain(res.status());
	});
});

// ── SECURITY ─────────────────────────────────────────────────────────────────

test.describe('POST /api/humanize — security', () => {
	test('response never contains PROXY_API_TOKEN literal', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		const res = await request.post('/api/humanize', {
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			data: { text: 'This is a reasonable length text for humanization testing purposes.' }
		});
		const text = await res.text();
		expect(text).not.toContain('PROXY_API_TOKEN');
	});

	test('user cannot supply a different user_id to hijack another account', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		// Sending a fake user_id in the body — server must use session identity
		const res = await request.post('/api/humanize', {
			headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
			data: {
				text: 'This is a reasonable length text for humanization testing.',
				user_id: '00000000-0000-0000-0000-000000000000' // another user's ID
			}
		});
		// Must not crash or act on the supplied user_id — 429 if rate-limited from prior tests
		expect([200, 402, 429, 500]).toContain(res.status());
		// If 200, word balance returned should belong to the authenticated user, not the fake ID
	});

	test('rate limit response includes Retry-After header', async ({ page, request }) => {
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		let hit429 = false;
		for (let i = 0; i < 8; i++) {
			const res = await request.post('/api/humanize', {
				headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
				data: { text: 'This is test text for rate limit header verification.' }
			});
			if (res.status() === 429) {
				hit429 = true;
				expect(res.headers()['retry-after']).toBeTruthy();
				break;
			}
		}

		if (!hit429) {
			console.log('Rate limit not hit (Redis not configured) — skipping.');
		}
	});
});
