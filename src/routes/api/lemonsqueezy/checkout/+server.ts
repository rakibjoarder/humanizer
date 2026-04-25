import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lsApi, WORDS_PER_PLAN, getStoreId } from '$lib/server/lemonsqueezy';
import { getUserProfile } from '$lib/server/auth';

// ── POST /api/lemonsqueezy/checkout ───────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'You must be logged in to start a checkout.' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body.' }, { status: 400 });
	}

	if (!body || typeof body !== 'object') {
		return json({ error: 'Invalid request body.' }, { status: 400 });
	}

	const { variantId, billingCycle, discountCode } = body as { 
		variantId?: unknown; 
		billingCycle?: unknown;
		discountCode?: unknown;
	};

	if (typeof variantId !== 'string' || !variantId) {
		return json({ error: 'Missing required field: variantId.' }, { status: 400 });
	}

	if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
		return json({ error: 'Field "billingCycle" must be "monthly" or "yearly".' }, { status: 400 });
	}

	// Block if user already has an active subscription
	const { data: existingSub } = await locals.supabase
		.from('subscriptions')
		.select('status, cancel_at_period_end, plan')
		.eq('user_id', user.id)
		.in('status', ['active', 'on_trial'])
		.maybeSingle();

	if (existingSub && !existingSub.cancel_at_period_end) {
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

	let profile: Awaited<ReturnType<typeof getUserProfile>>;
	try {
		profile = await getUserProfile(locals.supabase, user.id);
	} catch {
		return json({ error: 'Failed to fetch user profile.' }, { status: 500 });
	}

	const origin = url.origin;

	try {
		const res = await lsApi('/checkouts', {
			method: 'POST',
			body: JSON.stringify({
				data: {
					type: 'checkouts',
					attributes: {
						checkout_options: { logo: true },
						checkout_data: {
							email: profile.email,
							name: profile.full_name ?? undefined,
							discount_code: typeof discountCode === 'string' ? discountCode : undefined,
							custom: {
								supabase_user_id: user.id,
								billing_cycle: billingCycle
							}
						},
						product_options: {
							redirect_url: `${origin}/dashboard?upgraded=true`
						}
					},
					relationships: {
						store:   { data: { type: 'stores',   id: getStoreId() } },
						variant: { data: { type: 'variants', id: variantId    } }
					}
				}
			})
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			console.error('[ls/checkout] create checkout:', err);
			return json({ error: 'Failed to process request. Please try again.' }, { status: 500 });
		}

		const data = await res.json();
		return json({ url: data.data?.attributes?.url });
	} catch (err) {
		console.error('[ls/checkout] create checkout:', err);
		return json({ error: 'Failed to process request. Please try again.' }, { status: 500 });
	}
};
