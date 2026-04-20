import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe, WORDS_PER_PLAN } from '$lib/server/stripe';
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

	// 3. Block if user already has an active subscription
	const { data: existingSub } = await locals.supabase
		.from('subscriptions')
		.select('status, cancel_at_period_end, plan')
		.eq('user_id', user.id)
		.in('status', ['active', 'trialing'])
		.maybeSingle();

	if (existingSub && !existingSub.cancel_at_period_end) {
		// Check for profile/subscription desync: subscription is paid but profile still shows free.
		// This happens when the webhook fired for the subscription table but not for profiles.
		// Auto-fix it and tell the client to redirect to settings instead of showing an error.
		const subPlan = existingSub.plan as string | null;
		if (subPlan && subPlan !== 'free') {
			const currentProfile = await getUserProfile(locals.supabase, user.id).catch(() => null);
			if (currentProfile?.plan === 'free') {
				const wordsBalance = WORDS_PER_PLAN[subPlan] ?? WORDS_PER_PLAN.basic;
				await locals.supabase
					.from('profiles')
					.update({ plan: subPlan, words_balance: wordsBalance })
					.eq('id', user.id);
				return json({ synced: true, plan: subPlan }, { status: 200 });
			}
		}
		return json(
			{ error: 'You already have an active subscription. Manage it from your settings.' },
			{ status: 400 }
		);
	}

	// 4. Fetch or create Stripe customer
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
		} catch (err: unknown) {
			console.error('[stripe/checkout] create customer:', err);
			return json({ error: 'Failed to process request. Please try again.' }, { status: 500 });
		}
	}

	// 5. Create checkout session
	const origin = url.origin;

	try {
		const checkoutSession = await stripe.checkout.sessions.create({
			customer: stripeCustomerId,
			mode: 'subscription',
			line_items: [{ price: priceId, quantity: 1 }],
			success_url: `${origin}/dashboard?upgraded=true&session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${origin}/plans`,
			allow_promotion_codes: true,
			metadata: {
				supabase_user_id: user.id,
				billing_cycle: billingCycle
			}
		});

		return json({ url: checkoutSession.url });
	} catch (err: unknown) {
		console.error('[stripe/checkout] create session:', err);
		return json({ error: 'Failed to process request. Please try again.' }, { status: 500 });
	}
};
