import type { PageServerLoad } from './$types';
import { getUserProfile } from '$lib/server/auth';
import { redirectToLoginModal } from '$lib/server/redirectLoginModal';
import { stripe, WORDS_PER_PLAN, wordPacks } from '$lib/server/stripe';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirectToLoginModal(url);
	}

	// Verify Stripe checkout session on upgrade redirect and immediately update the plan.
	const stripeSessionId = url.searchParams.get('session_id');
	if (stripeSessionId) {
		try {
			const checkoutSession = await stripe.checkout.sessions.retrieve(stripeSessionId, {
				expand: ['subscription.items.data.price.product']
			});
			if (
				checkoutSession.payment_status === 'paid' &&
				checkoutSession.metadata?.supabase_user_id === user.id
			) {
				const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
					auth: { autoRefreshToken: false, persistSession: false }
				});

				// Resolve plan from subscription
				let plan: string = 'basic';
				const sub = checkoutSession.subscription as import('stripe').Stripe.Subscription & {
					items: { data: Array<{ price: import('stripe').Stripe.Price & { product: import('stripe').Stripe.Product } }> };
				} | null;
				if (sub) {
					const productName = (typeof sub.items?.data?.[0]?.price?.product === 'object'
						? (sub.items.data[0].price.product as import('stripe').Stripe.Product).name
						: '') ?? '';
					if (productName.toLowerCase().includes('ultra')) plan = 'ultra';
					else if (productName.toLowerCase().includes('pro')) plan = 'pro';
					else if (productName.toLowerCase().includes('basic')) plan = 'basic';
				}

				const wordsBalance = WORDS_PER_PLAN[plan] ?? WORDS_PER_PLAN.basic;

				await adminClient
					.from('profiles')
					.update({
						plan,
						stripe_customer_id: checkoutSession.customer as string,
						words_balance: wordsBalance
					})
					.eq('id', user.id);

				const subscriptionId =
					typeof checkoutSession.subscription === 'string'
						? checkoutSession.subscription
						: checkoutSession.subscription?.id;

				if (subscriptionId) {
					const subscription = await stripe.subscriptions.retrieve(subscriptionId);
					await adminClient.from('subscriptions').upsert(
						{
							user_id: user.id,
							stripe_subscription_id: subscriptionId,
							stripe_customer_id: checkoutSession.customer as string,
							plan,
							status: subscription.status,
							current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
							current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
						},
						{ onConflict: 'stripe_subscription_id' }
					);
				}
			}
		} catch {
			// Non-fatal: webhook will eventually sync the state
		}
	}

	const profile = await getUserProfile(locals.supabase, user.id);

	// ── Aggregate stats ───────────────────────────────────────────────────────
	const [detectionsCountRes, humanizationsCountRes, wordsAnalyzedRes] = await Promise.all([
		locals.supabase
			.from('detections')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', user.id),

		locals.supabase
			.from('humanizations')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', user.id),

		locals.supabase
			.from('usage_logs')
			.select('words_used')
			.eq('user_id', user.id)
	]);

	const totalDetections = detectionsCountRes.count ?? 0;
	const totalHumanizations = humanizationsCountRes.count ?? 0;
	const wordsAnalyzed = (wordsAnalyzedRes.data ?? []).reduce(
		(sum: number, row: { words_used: number }) => sum + (row.words_used ?? 0),
		0
	);

	const { data: probRows } = await locals.supabase
		.from('detections')
		.select('ai_probability')
		.eq('user_id', user.id)
		.not('ai_probability', 'is', null);

	const avgAiProbability = probRows && probRows.length > 0
		? Math.round(probRows.reduce((sum: number, r: { ai_probability: number }) => sum + r.ai_probability, 0) / probRows.length * 100)
		: null;

	const planWordsLimit = WORDS_PER_PLAN[profile.plan] ?? 150; // free = 150

	const { data: wordCredits } = await locals.supabase
		.from('word_credits')
		.select('id, amount, source, description, created_at')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(10);

	return {
		profile,
		wordsBalance: profile.words_balance ?? 0,
		planWordsLimit,
		wordPacks,
		totalDetections,
		totalHumanizations,
		wordsAnalyzed,
		avgAiProbability,
		wordCredits: wordCredits ?? []
	};
};
