import { json } from '@sveltejs/kit';
import { STRIPE_SECRET_KEY } from '$env/static/private';
import { stripe } from '$lib/server/stripe';

export const GET = async () => {
	const results: Record<string, unknown> = {};

	// Test 1: raw fetch
	try {
		const r = await fetch('https://api.stripe.com/v1/account', {
			headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` }
		});
		results.rawFetch = { status: r.status, ok: r.ok };
	} catch (e) {
		results.rawFetch = { error: String(e) };
	}

	// Test 2: raw fetch with AbortSignal (like SDK does)
	try {
		const r = await fetch('https://api.stripe.com/v1/account', {
			headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
			signal: AbortSignal.timeout(10000)
		});
		results.rawFetchWithSignal = { status: r.status, ok: r.ok };
	} catch (e) {
		results.rawFetchWithSignal = { error: String(e) };
	}

	// Test 2b: https.request (what NodeHttpClient uses)
	try {
		const https = await import('node:https');
		const result = await new Promise<string>((resolve, reject) => {
			const req = https.request(
				'https://api.stripe.com/v1/account',
				{ headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } },
				(res) => {
					let data = '';
					res.on('data', (c: string) => (data += c));
					res.on('end', () => resolve(`${res.statusCode}: ${data.slice(0, 50)}`));
				}
			);
			req.on('error', reject);
			req.end();
		});
		results.httpsRequest = { ok: true, result };
	} catch (e) {
		results.httpsRequest = { error: String(e) };
	}

	// Test 3: Stripe SDK with NodeHttpClient
	try {
		const Stripe = (await import('stripe')).default;
		const s = new Stripe(STRIPE_SECRET_KEY, {
			apiVersion: '2025-02-24.acacia',
			httpClient: Stripe.createNodeHttpClient()
		});
		const account = await s.accounts.retrieve();
		results.stripeNode = { id: account.id };
	} catch (e) {
		results.stripeNode = { error: e instanceof Error ? e.message : String(e) };
	}

	// Test 4: Stripe SDK with default (imported stripe instance)
	try {
		const account = await stripe.accounts.retrieve();
		results.stripeDefault = { id: account.id };
	} catch (e) {
		results.stripeDefault = { error: e instanceof Error ? e.message : String(e) };
	}

	results.keyPrefix = STRIPE_SECRET_KEY.slice(0, 12) + '...';
	results.nodeVersion = process.version;

	return json(results);
};
