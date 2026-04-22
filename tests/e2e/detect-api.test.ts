/**
 * POST /api/detect — server-side validation and auth tests.
 * These run against the local dev server without a real upstream API call.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

// ── AUTH ──────────────────────────────────────────────────────────────────────

test.describe('POST /api/detect — authentication', () => {
	test('unauthenticated request is allowed for preview (one-shot demo)', async ({ request }) => {
		// Anonymous users get one preview; the endpoint returns 200 or 429 (DEMO_EXHAUSTED) — never 401
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: 'This is a short enough text sample for AI detection testing purposes.' }
		});
		// 200 (first preview), 429 (demo exhausted), or 500 (upstream down) — all valid
		expect([200, 429, 500]).toContain(res.status());
		const body = await res.json();
		// Must never leak PROXY_API_TOKEN
		expect(JSON.stringify(body)).not.toContain('PROXY_API_TOKEN');
	});
});

// ── INPUT VALIDATION ─────────────────────────────────────────────────────────

test.describe('POST /api/detect — input validation', () => {
	test('missing body returns 400', async ({ request }) => {
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: {}
		});
		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.error).toBeTruthy();
	});

	test('missing text field returns 400', async ({ request }) => {
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: { other: 'value' }
		});
		expect(res.status()).toBe(400);
	});

	test('text shorter than 50 chars returns 400', async ({ request }) => {
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: 'Too short.' }
		});
		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.error).toMatch(/50 characters/i);
	});

	test('empty string returns 400', async ({ request }) => {
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: '' }
		});
		expect(res.status()).toBe(400);
	});

	test('whitespace-only text returns 400', async ({ request }) => {
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: '          ' }
		});
		expect(res.status()).toBe(400);
	});

	test('text over 50,000 chars returns 400', async ({ request }) => {
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: 'a'.repeat(50_001) }
		});
		expect(res.status()).toBe(400);
		const body = await res.json();
		expect(body.error).toMatch(/50,000/i);
	});

	test('invalid JSON body returns 400', async ({ request }) => {
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: 'not-json'
		});
		expect(res.status()).toBe(400);
	});

	test('non-string text field returns 400', async ({ request }) => {
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: 12345 }
		});
		expect(res.status()).toBe(400);
	});

	test('text at exactly 50 chars is accepted', async ({ request }) => {
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: 'A'.repeat(50) }
		});
		// 200, 429, or 500 (upstream) — all valid; key is NOT 400
		expect(res.status()).not.toBe(400);
	});
});

// ── SECURITY ─────────────────────────────────────────────────────────────────

test.describe('POST /api/detect — security', () => {
	test('XSS payload in text does not execute and error response is safe', async ({ request }) => {
		const xssPayload = '<script>alert(1)</script>'.repeat(3) + ' This is a longer text to pass the minimum character requirement for the detection endpoint to function correctly.';
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: xssPayload }
		});
		const body = await res.json();
		// Response must be JSON, not raw HTML with executed script
		expect(typeof body).toBe('object');
		// Error text must not re-echo the raw script tag
		if (body.error) {
			expect(body.error).not.toContain('<script>');
		}
	});

	test('SQL injection in text is stored safely (no 500)', async ({ request }) => {
		const sqlPayload = "'; DROP TABLE detections; -- " + 'x'.repeat(50);
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: sqlPayload }
		});
		// Must not cause a 500 DB error
		expect([200, 402, 429]).toContain(res.status());
	});

	test('response never contains PROXY_API_TOKEN literal', async ({ request }) => {
		const res = await request.post('/api/detect', {
			headers: { 'Content-Type': 'application/json' },
			data: { text: 'x'.repeat(50) }
		});
		const text = await res.text();
		expect(text).not.toContain('PROXY_API_TOKEN');
	});
});

// ── RATE LIMIT ───────────────────────────────────────────────────────────────

test.describe('POST /api/detect — rate limit response format', () => {
	test('429 response includes Retry-After header', async ({ page, request }) => {
		test.setTimeout(120_000);
		await loginAs(page);
		const cookies = await page.context().cookies();
		const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

		const body = { text: 'This is AI generated text for testing rate limit header format in the detection API endpoint.' };

		// Send requests until we hit a 429 or exhaust 25 attempts
		let hit429 = false;
		for (let i = 0; i < 25; i++) {
			const res = await request.post('/api/detect', {
				headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
				data: body
			});
			if (res.status() === 429) {
				hit429 = true;
				expect(res.headers()['retry-after']).toBeTruthy();
				const retryAfter = Number(res.headers()['retry-after']);
				expect(retryAfter).toBeGreaterThan(0);
				const resBody = await res.json();
				expect(resBody.error).toBeTruthy();
				break;
			}
		}

		// Only assert Retry-After if rate limiting is configured (Redis may be absent in dev)
		if (hit429) {
			console.log('Rate limit hit and Retry-After header verified.');
		} else {
			console.log('Rate limit not hit (Redis not configured in test env) — skipping header check.');
		}
	});
});
