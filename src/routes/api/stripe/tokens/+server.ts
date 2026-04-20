import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe, wordPacks } from '$lib/server/stripe';
import { getUserProfile } from '$lib/server/auth';

// ── POST /api/stripe/tokens ───────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'You must be logged in.' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body.' }, { status: 400 });
	}

	const { priceId } = body as { priceId?: unknown };

	if (typeof priceId !== 'string' || !priceId) {
		return json({ error: 'Missing required field: priceId.' }, { status: 400 });
	}

	const pack = wordPacks.find((p) => p.priceId === priceId);
	if (!pack) {
		return json({ error: 'Invalid word pack.' }, { status: 400 });
	}

	let profile: Awaited<ReturnType<typeof getUserProfile>>;
	try {
		profile = await getUserProfile(locals.supabase, user.id);
	} catch {
		return json({ error: 'Failed to fetch user profile.' }, { status: 500 });
	}

	const isPaidPlan = profile.plan === 'basic' || profile.plan === 'pro' || profile.plan === 'ultra';
	if (!isPaidPlan) {
		return json({ error: 'Word packs are only available for paid plan users.' }, { status: 403 });
	}

	const origin = url.origin;

	try {
		const checkoutSession = await stripe.checkout.sessions.create({
			customer: profile.stripe_customer_id ?? undefined,
			mode: 'payment',
			line_items: [{ price: priceId, quantity: 1 }],
			success_url: `${origin}/settings?words_added=true`,
			cancel_url: `${origin}/settings`,
			metadata: {
				supabase_user_id: user.id,
				words: String(pack.words)
			}
		});

		return json({ url: checkoutSession.url });
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		return json({ error: msg }, { status: 500 });
	}
};
