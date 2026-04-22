import type { Page, BrowserContext } from '@playwright/test';

const EMAIL = process.env.TEST_USER_EMAIL!;
const PASSWORD = process.env.TEST_USER_PASSWORD!;

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY ?? '';

// Cookie name: sb-{project-ref}-auth-token
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? '';
const MAX_CHUNK_SIZE = 3180;

// The SSR server client uses base64url encoding with "base64-" prefix
const BASE64_PREFIX = 'base64-';

function stringToBase64URL(str: string): string {
	// Node.js Buffer supports base64url natively (no padding, URL-safe chars)
	return Buffer.from(str, 'utf8').toString('base64url');
}

function createCookieChunks(key: string, value: string): Array<{ name: string; value: string }> {
	const encoded = encodeURIComponent(value);
	if (encoded.length <= MAX_CHUNK_SIZE) {
		return [{ name: key, value }];
	}
	const chunks: string[] = [];
	let remaining = encoded;
	while (remaining.length > 0) {
		let head = remaining.slice(0, MAX_CHUNK_SIZE);
		const lastEscape = head.lastIndexOf('%');
		if (lastEscape > MAX_CHUNK_SIZE - 3) head = head.slice(0, lastEscape);
		let decoded = '';
		while (head.length > 0) {
			try {
				decoded = decodeURIComponent(head);
				break;
			} catch {
				head = head.slice(0, head.length - 3);
			}
		}
		chunks.push(decoded);
		remaining = remaining.slice(encodeURIComponent(decoded).length);
	}
	return chunks.map((v, i) => ({ name: `${key}.${i}`, value: v }));
}

/**
 * Set Supabase auth cookies directly via REST API — no browser UI needed.
 * Encodes the session as base64url to match @supabase/ssr server client format.
 */
export async function setAuthCookies(
	context: BrowserContext,
	email = EMAIL,
	password = PASSWORD
) {
	if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
		throw new Error('PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be set');
	}

	const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			apikey: SUPABASE_ANON_KEY,
			Authorization: `Bearer ${SUPABASE_ANON_KEY}`
		},
		body: JSON.stringify({ email, password })
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Supabase login failed (${res.status}): ${body}`);
	}

	const session = await res.json();
	const cookieKey = `sb-${PROJECT_REF}-auth-token`;

	// The @supabase/ssr server client uses base64url encoding by default
	const sessionJson = JSON.stringify(session);
	const encoded = BASE64_PREFIX + stringToBase64URL(sessionJson);
	const chunks = createCookieChunks(cookieKey, encoded);

	await context.addCookies(
		chunks.map(({ name, value }) => ({
			name,
			value,
			domain: 'localhost',
			path: '/',
			sameSite: 'Lax' as const
		}))
	);
}

/**
 * Log in via Supabase REST API, then navigate to /dashboard.
 */
export async function loginAs(page: Page, email = EMAIL, password = PASSWORD) {
	await setAuthCookies(page.context(), email, password);
	await page.goto('/dashboard');
	await page.waitForURL('/dashboard', { timeout: 8_000 });
}

/**
 * Log out by clearing all cookies.
 */
export async function logout(page: Page) {
	await page.context().clearCookies();
	await page.goto('/');
}
