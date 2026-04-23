import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe, WORDS_PER_PLAN } from '$lib/server/stripe';
import { STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';

function getAdminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

// ── POST /api/stripe/webhook ──────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
	const rawBody = Buffer.from(await request.arrayBuffer());
	const sig = request.headers.get('stripe-signature');

	if (!sig) {
		return json({ error: 'Missing stripe-signature header.' }, { status: 400 });
	}

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET.trim());
	} catch {
		return json({ error: 'Invalid webhook signature.' }, { status: 400 });
	}

	try {
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				if (session.mode === 'payment') {
					await handleWordPackPurchase(session, getAdminClient());
				} else {
					await handleCheckoutSessionCompleted(session, getAdminClient());
				}
				break;
			}
			case 'customer.subscription.updated': {
				const subscription = event.data.object as Stripe.Subscription;
				await handleSubscriptionUpdated(subscription, getAdminClient());
				break;
			}
			case 'customer.subscription.deleted': {
				const subscription = event.data.object as Stripe.Subscription;
				await handleSubscriptionDeleted(subscription, getAdminClient());
				break;
			}
			case 'invoice.payment_failed': {
				const invoice = event.data.object as Stripe.Invoice;
				await handleInvoicePaymentFailed(invoice, getAdminClient());
				break;
			}
			case 'invoice.paid': {
				const invoice = event.data.object as Stripe.Invoice;
				await handleInvoicePaid(invoice, getAdminClient());
				break;
			}
			default:
				break;
		}
	} catch (err) {
		console.error(`[stripe/webhook] Error handling event ${event.type}:`, err);
		// Return 500 so Stripe retries delivery instead of silently dropping the event.
		return json({ error: 'Webhook handler failed.' }, { status: 500 });
	}

	return json({ received: true });
};

// ── Event handlers ─────────────────────────────────────────────────────────────

async function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session,
	supabase: import('@supabase/supabase-js').SupabaseClient
): Promise<void> {
	if (session.payment_status !== 'paid') return;

	const userId = session.metadata?.supabase_user_id;
	const subscriptionId = typeof session.subscription === 'string'
		? session.subscription
		: session.subscription?.id;

	if (!userId || !subscriptionId) return;

	const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
		expand: ['items.data.price.product']
	});

	const plan = resolvePlanFromSubscription(subscription);
	const wordsBalance = WORDS_PER_PLAN[plan] ?? WORDS_PER_PLAN.basic;

	await Promise.all([
		supabase
			.from('profiles')
			.update({ plan, stripe_customer_id: session.customer as string, words_balance: wordsBalance })
			.eq('id', userId),

		supabase.from('subscriptions').upsert(
			{
				user_id: userId,
				stripe_subscription_id: subscriptionId,
				stripe_customer_id: session.customer as string,
				plan,
				status: subscription.status,
				cancel_at_period_end: subscription.cancel_at_period_end,
				current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
				current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
			},
			{ onConflict: 'stripe_subscription_id' }
		),

		supabase.from('word_credits').insert({
			user_id: userId,
			amount: wordsBalance,
			source: 'subscription',
			description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated`,
			stripe_ref: subscriptionId
		})
	]);
}

async function handleSubscriptionUpdated(
	subscription: Stripe.Subscription,
	supabase: import('@supabase/supabase-js').SupabaseClient
): Promise<void> {
	const customerId = typeof subscription.customer === 'string'
		? subscription.customer
		: subscription.customer?.id;

	if (!customerId) return;

	const plan = resolvePlanFromSubscription(subscription);

	const { data: profileData } = await supabase
		.from('profiles')
		.select('id')
		.eq('stripe_customer_id', customerId)
		.maybeSingle();

	if (!profileData?.id) return;

	await Promise.all([
		supabase.from('profiles').update({ plan }).eq('id', profileData.id),

		supabase.from('subscriptions').upsert(
			{
				user_id: profileData.id,
				stripe_subscription_id: subscription.id,
				stripe_customer_id: customerId,
				plan,
				status: subscription.status,
				cancel_at_period_end: subscription.cancel_at_period_end,
				current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
				current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
			},
			{ onConflict: 'stripe_subscription_id' }
		)
	]);
}

async function handleSubscriptionDeleted(
	subscription: Stripe.Subscription,
	supabase: import('@supabase/supabase-js').SupabaseClient
): Promise<void> {
	const customerId = typeof subscription.customer === 'string'
		? subscription.customer
		: subscription.customer?.id;

	if (!customerId) return;

	const { data: profileData } = await supabase
		.from('profiles')
		.select('id')
		.eq('stripe_customer_id', customerId)
		.maybeSingle();

	if (!profileData?.id) return;

	await Promise.all([
		supabase.from('profiles').update({ plan: 'free', words_balance: 150 }).eq('id', profileData.id),

		supabase
			.from('subscriptions')
			.update({ plan: 'free', status: 'canceled' })
			.eq('stripe_subscription_id', subscription.id)
	]);
}

async function handleInvoicePaymentFailed(
	invoice: Stripe.Invoice,
	supabase: import('@supabase/supabase-js').SupabaseClient
): Promise<void> {
	const subscriptionId = typeof invoice.subscription === 'string'
		? invoice.subscription
		: invoice.subscription?.id;

	if (!subscriptionId) return;

	await supabase
		.from('subscriptions')
		.update({ status: 'past_due' })
		.eq('stripe_subscription_id', subscriptionId);
}

async function handleInvoicePaid(
	invoice: Stripe.Invoice,
	supabase: import('@supabase/supabase-js').SupabaseClient
): Promise<void> {
	// Only reset words for subscription renewals (not one-time payments)
	if (invoice.billing_reason !== 'subscription_cycle') return;

	const customerId = typeof invoice.customer === 'string'
		? invoice.customer
		: (invoice.customer as Stripe.Customer)?.id;

	if (!customerId) return;

	const { data: profileData } = await supabase
		.from('profiles')
		.select('id, plan')
		.eq('stripe_customer_id', customerId)
		.maybeSingle();

	if (!profileData?.id) return;

	const wordsBalance = WORDS_PER_PLAN[profileData.plan] ?? WORDS_PER_PLAN.basic;

	await Promise.all([
		supabase
			.from('profiles')
			.update({ words_balance: wordsBalance })
			.eq('id', profileData.id),

		supabase.from('word_credits').insert({
			user_id: profileData.id,
			amount: wordsBalance,
			source: 'subscription_renewal',
			description: `${profileData.plan.charAt(0).toUpperCase() + profileData.plan.slice(1)} plan renewed`,
			stripe_ref: typeof invoice.id === 'string' ? invoice.id : undefined
		})
	]);
}

async function handleWordPackPurchase(
	session: Stripe.Checkout.Session,
	supabase: import('@supabase/supabase-js').SupabaseClient
): Promise<void> {
	const userId = session.metadata?.supabase_user_id;
	const wordsToAdd = Number(session.metadata?.words ?? 0);

	if (!userId || !wordsToAdd) return;

	await Promise.all([
		supabase.rpc('add_words', { p_user_id: userId, p_amount: wordsToAdd }),

		supabase.from('word_credits').insert({
			user_id: userId,
			amount: wordsToAdd,
			source: 'word_pack',
			description: `Word pack purchased (+${wordsToAdd.toLocaleString()} words)`,
			stripe_ref: session.id
		})
	]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolvePlanFromSubscription(
	subscription: Stripe.Subscription
): 'free' | 'basic' | 'pro' | 'ultra' {
	const item = subscription.items?.data?.[0];
	if (!item) return 'basic';

	const price = item.price as Stripe.Price & { product?: Stripe.Product };
	const product = typeof price.product === 'object' ? price.product : null;

	const productName = (product?.name ?? '').toLowerCase();
	const priceNickname = (price.nickname ?? '').toLowerCase();
	const combined = `${productName} ${priceNickname}`;

	if (combined.includes('ultra')) return 'ultra';
	if (combined.includes('pro')) return 'pro';
	if (combined.includes('basic')) return 'basic';

	const metaPlan = subscription.metadata?.plan?.toLowerCase();
	if (metaPlan === 'ultra') return 'ultra';
	if (metaPlan === 'pro') return 'pro';
	if (metaPlan === 'basic') return 'basic';

	return 'basic'; // default for any paid subscription
}
