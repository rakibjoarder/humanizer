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

	// Test 3: Stripe SDK
	try {
		const account = await stripe.accounts.retrieve();
		results.stripeSdk = { id: account.id };
	} catch (e) {
		results.stripeSdk = { error: e instanceof Error ? e.message : String(e) };
	}

	results.keyPrefix = STRIPE_SECRET_KEY.slice(0, 12) + '...';
	results.nodeVersion = process.version;

	return json(results);
};
