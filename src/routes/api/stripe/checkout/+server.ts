import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe';
import { getUserProfile } from '$lib/server/auth';

// ── POST /api/stripe/checkout ─────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals, url }) => {
	// 1. Require auth
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'You must be logged in to start a checkout.' }, { status: 401 });
	}

	// 2. Parse body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body.' }, { status: 400 });
	}

	if (!body || typeof body !== 'object') {
		return json({ error: 'Invalid request body.' }, { status: 400 });
	}

	const { priceId, billingCycle } = body as { priceId?: unknown; billingCycle?: unknown };

	if (typeof priceId !== 'string' || !priceId) {
		return json({ error: 'Missing required field: priceId.' }, { status: 400 });
	}

	if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
		return json(
			{ error: 'Field "billingCycle" must be "monthly" or "yearly".' },
			{ status: 400 }
		);
	}

	// 3. Fetch or create Stripe customer
	let profile: Awaited<ReturnType<typeof getUserProfile>>;
	try {
		profile = await getUserProfile(locals.supabase, user.id);
	} catch {
		return json({ error: 'Failed to fetch user profile.' }, { status: 500 });
	}

	let stripeCustomerId = profile.stripe_customer_id;

	if (!stripeCustomerId) {
		try {
			const customer = await stripe.customers.create({
				email: profile.email,
				name: profile.full_name ?? undefined,
				metadata: { supabase_user_id: user.id }
			});
			stripeCustomerId = customer.id;

			// Persist the new customer ID
			await locals.supabase
				.from('profiles')
				.update({ stripe_customer_id: stripeCustomerId })
				.eq('id', user.id);
		} catch {
			return json({ error: 'Failed to create Stripe customer.' }, { status: 500 });
		}
	}

	// 4. Create checkout session
	const origin = url.origin;

	try {
		const checkoutSession = await stripe.checkout.sessions.create({
			customer: stripeCustomerId,
			mode: 'subscription',
			line_items: [{ price: priceId, quantity: 1 }],
			success_url: `${origin}/dashboard?upgraded=true`,
			cancel_url: `${origin}/pricing`,
			allow_promotion_codes: true,
			metadata: {
				supabase_user_id: user.id,
				billing_cycle: billingCycle
			}
		});

		return json({ url: checkoutSession.url });
	} catch {
		return json({ error: 'Failed to create checkout session.' }, { status: 500 });
	}
};
