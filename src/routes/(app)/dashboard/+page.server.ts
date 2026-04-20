import type { PageServerLoad } from './$types';
import { getUserProfile } from '$lib/server/auth';
import { redirectToLoginModal } from '$lib/server/redirectLoginModal';
import { stripe, PRO_TOKENS_PER_MONTH } from '$lib/server/stripe';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirectToLoginModal(url);
	}

	// Verify Stripe checkout session on upgrade redirect and immediately update the plan.
	// Uses service-role client so the write succeeds regardless of RLS policies.
	const stripeSessionId = url.searchParams.get('session_id');
	if (stripeSessionId) {
		try {
			const checkoutSession = await stripe.checkout.sessions.retrieve(stripeSessionId);
			if (
				checkoutSession.payment_status === 'paid' &&
				checkoutSession.metadata?.supabase_user_id === user.id
			) {
				const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
					auth: { autoRefreshToken: false, persistSession: false }
				});

				await adminClient
					.from('profiles')
					.update({ plan: 'pro', stripe_customer_id: checkoutSession.customer as string, tokens: PRO_TOKENS_PER_MONTH })
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
							plan: 'pro',
							status: subscription.status,
							current_period_start: new Date(
								subscription.current_period_start * 1000
							).toISOString(),
							current_period_end: new Date(
								subscription.current_period_end * 1000
							).toISOString()
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

	// ── Detection quota ───────────────────────────────────────────────────────
	const detectionsLimit = profile.plan === 'free' ? 3 : -1;

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

	// ── Avg AI probability from all detections ────────────────────────────────
	const { data: probRows } = await locals.supabase
		.from('detections')
		.select('ai_probability')
		.eq('user_id', user.id)
		.not('ai_probability', 'is', null);

	const avgAiProbability = probRows && probRows.length > 0
		? Math.round(probRows.reduce((sum: number, r: { ai_probability: number }) => sum + r.ai_probability, 0) / probRows.length * 100)
		: null;

	// ── Recent activity ───────────────────────────────────────────────────────
	const [recentDetectionsRes, recentHumanizationsRes] = await Promise.all([
		locals.supabase
			.from('detections')
			.select('id, word_count, ai_probability, classification, created_at')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.limit(20),

		locals.supabase
			.from('humanizations')
			.select('id, word_count, created_at')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.limit(20)
	]);

	// Merge and sort by created_at descending, take top 20
	type ActivityItem = {
		id: string;
		type: 'detect' | 'humanize';
		word_count: number;
		classification: string | null;
		ai_probability: number | null;
		created_at: string;
	};

	const detectActivity: ActivityItem[] = (recentDetectionsRes.data ?? []).map((d) => ({
		id: d.id,
		type: 'detect' as const,
		word_count: d.word_count,
		classification: d.classification,
		ai_probability: d.ai_probability,
		created_at: d.created_at
	}));

	const humanizeActivity: ActivityItem[] = (recentHumanizationsRes.data ?? []).map((h) => ({
		id: h.id,
		type: 'humanize' as const,
		word_count: h.word_count,
		classification: null,
		ai_probability: null,
		created_at: h.created_at
	}));

	const recentActivity = [...detectActivity, ...humanizeActivity]
		.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
		.slice(0, 20);

	return {
		profile,
		detectionsLimit,
		credits: profile.tokens ?? 0,
		totalDetections,
		totalHumanizations,
		wordsAnalyzed,
		avgAiProbability,
		recentActivity
	};
};
