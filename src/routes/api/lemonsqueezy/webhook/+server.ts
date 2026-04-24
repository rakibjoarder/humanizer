import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createHmac, timingSafeEqual } from 'crypto';
import { LEMONSQUEEZY_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { WORDS_PER_PLAN, resolvePlan } from '$lib/server/lemonsqueezy';

function getAdminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

// ── POST /api/lemonsqueezy/webhook ────────────────────────────────────────────

export const POST: RequestHandler = async ({ request }) => {
	const rawBody = await request.text();
	const sig = request.headers.get('x-signature');

	if (!sig) {
		return json({ error: 'Missing x-signature header.' }, { status: 400 });
	}

	try {
		const digest = Buffer.from(
			createHmac('sha256', LEMONSQUEEZY_WEBHOOK_SECRET.trim()).update(rawBody).digest('hex')
		);
		const signature = Buffer.from(sig);
		if (digest.length !== signature.length || !timingSafeEqual(digest, signature)) {
			return json({ error: 'Invalid webhook signature.' }, { status: 400 });
		}
	} catch {
		return json({ error: 'Invalid webhook signature.' }, { status: 400 });
	}

	let payload: Record<string, unknown>;
	try {
		payload = JSON.parse(rawBody);
	} catch {
		return json({ error: 'Invalid JSON.' }, { status: 400 });
	}

	const meta       = payload.meta as Record<string, unknown> | undefined;
	const data       = payload.data as Record<string, unknown> | undefined;
	const eventName  = meta?.event_name as string | undefined;
	const customData = (meta?.custom_data ?? {}) as Record<string, string>;

	try {
		const supabase = getAdminClient();
		switch (eventName) {
			case 'subscription_created':
				await handleSubscriptionCreated(data, customData, supabase);
				break;
			case 'subscription_updated':
			case 'subscription_resumed':
			case 'subscription_unpaused':
				await handleSubscriptionUpdated(data, supabase);
				break;
			case 'subscription_cancelled':
				await handleSubscriptionCancelled(data, supabase);
				break;
			case 'subscription_expired':
				await handleSubscriptionExpired(data, supabase);
				break;
			case 'subscription_payment_success':
				await handleSubscriptionPaymentSuccess(data, supabase);
				break;
			case 'subscription_payment_failed':
				await handleSubscriptionPaymentFailed(data, supabase);
				break;
			case 'order_created':
				await handleOrderCreated(data, customData, supabase);
				break;
		}
	} catch (err) {
		console.error(`[ls/webhook] Error handling event ${eventName}:`, err);
		return json({ error: 'Webhook handler failed.' }, { status: 500 });
	}

	return json({ received: true });
};

// ── Event handlers ─────────────────────────────────────────────────────────────

type Supabase = ReturnType<typeof getAdminClient>;

async function handleSubscriptionCreated(
	data: Record<string, unknown> | undefined,
	customData: Record<string, string>,
	supabase: Supabase
): Promise<void> {
	const attrs = data?.attributes as Record<string, unknown> | undefined;
	if (!attrs) return;

	const userId         = customData.supabase_user_id;
	const subscriptionId = String(data?.id ?? '');
	const customerId     = String(attrs.customer_id ?? '');
	const productName    = String(attrs.product_name ?? '');
	const variantName    = String(attrs.variant_name ?? '');
	const status         = String(attrs.status ?? 'active');
	const renewsAt       = attrs.renews_at as string | null;
	const endsAt         = attrs.ends_at   as string | null;
	const cancelled      = Boolean(attrs.cancelled);

	if (!userId || !subscriptionId) return;

	const plan         = resolvePlan(productName, variantName);
	const wordsBalance = WORDS_PER_PLAN[plan] ?? WORDS_PER_PLAN.basic;

	await Promise.all([
		supabase
			.from('profiles')
			.update({ plan, ls_customer_id: customerId, words_balance: wordsBalance })
			.eq('id', userId),

		supabase.from('subscriptions').upsert(
			{
				user_id:             userId,
				ls_subscription_id:  subscriptionId,
				plan,
				status,
				cancel_at_period_end: cancelled,
				current_period_start: new Date().toISOString(),
				current_period_end:   endsAt ?? renewsAt ?? new Date().toISOString()
			},
			{ onConflict: 'ls_subscription_id' }
		),

		supabase.from('word_credits').insert({
			user_id:     userId,
			amount:      wordsBalance,
			source:      'subscription',
			description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated`,
			stripe_ref:  subscriptionId
		})
	]);
}

async function handleSubscriptionUpdated(
	data: Record<string, unknown> | undefined,
	supabase: Supabase
): Promise<void> {
	const attrs = data?.attributes as Record<string, unknown> | undefined;
	if (!attrs) return;

	const subscriptionId = String(data?.id ?? '');
	if (!subscriptionId) return;

	const status    = String(attrs.status ?? 'active');
	const cancelled = Boolean(attrs.cancelled);
	const renewsAt  = attrs.renews_at as string | null;
	const endsAt    = attrs.ends_at   as string | null;
	// For active subs use renews_at; for cancelled use ends_at
	const periodEnd = cancelled ? (endsAt ?? renewsAt) : (renewsAt ?? endsAt);

	await supabase
		.from('subscriptions')
		.update({
			status,
			cancel_at_period_end: cancelled,
			...(periodEnd ? { current_period_end: periodEnd } : {})
		})
		.eq('ls_subscription_id', subscriptionId);
}

// User cancelled — keep plan active until period ends, just mark the subscription row
async function handleSubscriptionCancelled(
	data: Record<string, unknown> | undefined,
	supabase: Supabase
): Promise<void> {
	const attrs = data?.attributes as Record<string, unknown> | undefined;
	const subscriptionId = String(data?.id ?? '');
	if (!subscriptionId) return;

	const endsAt = (attrs?.ends_at ?? attrs?.renews_at ?? null) as string | null;

	await supabase
		.from('subscriptions')
		.update({
			status: 'cancelled',
			cancel_at_period_end: true,
			...(endsAt ? { current_period_end: endsAt } : {})
		})
		.eq('ls_subscription_id', subscriptionId);
}

// Subscription actually expired — now downgrade profile
async function handleSubscriptionExpired(
	data: Record<string, unknown> | undefined,
	supabase: Supabase
): Promise<void> {
	const attrs = data?.attributes as Record<string, unknown> | undefined;
	const subscriptionId = String(data?.id ?? '');
	if (!subscriptionId) return;

	const endsAt = (attrs?.ends_at ?? null) as string | null;

	const { data: subRow } = await supabase
		.from('subscriptions')
		.select('user_id')
		.eq('ls_subscription_id', subscriptionId)
		.maybeSingle();

	if (!subRow?.user_id) return;

	await Promise.all([
		supabase
			.from('profiles')
			.update({ plan: 'free', words_balance: 0 })
			.eq('id', subRow.user_id),

		supabase
			.from('subscriptions')
			.update({
				status: 'expired',
				...(endsAt ? { current_period_end: endsAt } : {})
			})
			.eq('ls_subscription_id', subscriptionId)
	]);
}

async function handleSubscriptionPaymentSuccess(
	data: Record<string, unknown> | undefined,
	supabase: Supabase
): Promise<void> {
	const attrs = data?.attributes as Record<string, unknown> | undefined;
	if (!attrs) return;

	// Only reset words on renewal, not on initial payment (handled by subscription_created)
	if (attrs.billing_reason !== 'renewal') return;

	const subscriptionId = String(attrs.subscription_id ?? '');
	if (!subscriptionId) return;

	const { data: subRow } = await supabase
		.from('subscriptions')
		.select('user_id, plan')
		.eq('ls_subscription_id', subscriptionId)
		.maybeSingle();

	if (!subRow?.user_id) return;

	const wordsBalance = WORDS_PER_PLAN[subRow.plan] ?? WORDS_PER_PLAN.basic;

	await Promise.all([
		supabase
			.from('profiles')
			.update({ words_balance: wordsBalance })
			.eq('id', subRow.user_id),

		supabase.from('word_credits').insert({
			user_id:     subRow.user_id,
			amount:      wordsBalance,
			source:      'subscription_renewal',
			description: `${subRow.plan.charAt(0).toUpperCase() + subRow.plan.slice(1)} plan renewed`,
			stripe_ref:  String(data?.id ?? '')
		})
	]);
}

async function handleSubscriptionPaymentFailed(
	data: Record<string, unknown> | undefined,
	supabase: Supabase
): Promise<void> {
	const attrs = data?.attributes as Record<string, unknown> | undefined;
	if (!attrs) return;

	const subscriptionId = String(attrs.subscription_id ?? '');
	if (!subscriptionId) return;

	await supabase
		.from('subscriptions')
		.update({ status: 'past_due' })
		.eq('ls_subscription_id', subscriptionId);
}

async function handleOrderCreated(
	data: Record<string, unknown> | undefined,
	customData: Record<string, string>,
	supabase: Supabase
): Promise<void> {
	const attrs = data?.attributes as Record<string, unknown> | undefined;
	if (!attrs) return;

	// Only handle paid orders
	if (attrs.status !== 'paid') return;

	const userId     = customData.supabase_user_id;
	const wordsToAdd = Number(customData.words ?? 0);

	if (!userId || !wordsToAdd) return;

	const orderId = String(data?.id ?? '');

	await Promise.all([
		supabase.rpc('add_words', { p_user_id: userId, p_amount: wordsToAdd }),

		supabase.from('word_credits').insert({
			user_id:     userId,
			amount:      wordsToAdd,
			source:      'word_pack',
			description: `Word pack purchased (+${wordsToAdd.toLocaleString()} words)`,
			stripe_ref:  orderId
		})
	]);
}
