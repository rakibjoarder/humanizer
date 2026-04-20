import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe, PRO_TOKENS_PER_MONTH } from '$lib/server/stripe';
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
	// 1. Read raw body as Buffer (required for Stripe signature verification)
	const rawBody = Buffer.from(await request.arrayBuffer());
	const sig = request.headers.get('stripe-signature');

	if (!sig) {
		return json({ error: 'Missing stripe-signature header.' }, { status: 400 });
	}

	// 2. Verify webhook signature
	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET.trim());
	} catch {
		return json({ error: 'Invalid webhook signature.' }, { status: 400 });
	}

	// 3. Route by event type
	try {
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				if (session.mode === 'payment') {
					await handleTokenPackPurchase(session, getAdminClient());
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
				// Unhandled event type — acknowledge and ignore
				break;
		}
	} catch (err) {
		// Log but return 200 to prevent Stripe retries for internal errors
		console.error(`[stripe/webhook] Error handling event ${event.type}:`, err);
	}

	return json({ received: true });
};

// ── Event handlers ─────────────────────────────────────────────────────────────

async function handleCheckoutSessionCompleted(
	session: Stripe.Checkout.Session,
	supabase: import('@supabase/supabase-js').SupabaseClient
): Promise<void> {
	const userId = session.metadata?.supabase_user_id;
	const subscriptionId = typeof session.subscription === 'string'
		? session.subscription
		: session.subscription?.id;

	if (!userId || !subscriptionId) return;

	// Fetch subscription to determine the plan
	const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
		expand: ['items.data.price.product']
	});

	const plan = resolvePlanFromSubscription(subscription);

	await Promise.all([
		// Update profile plan + grant tokens
		supabase
			.from('profiles')
			.update({ plan, stripe_customer_id: session.customer as string, tokens: PRO_TOKENS_PER_MONTH })
			.eq('id', userId),

		// Upsert subscription record
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
		)
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

	// Find user by stripe_customer_id
	const { data: profileData } = await supabase
		.from('profiles')
		.select('id')
		.eq('stripe_customer_id', customerId)
		.maybeSingle();

	if (!profileData?.id) return;

	await Promise.all([
		supabase.from('profiles').update({ plan }).eq('id', profileData.id),

		supabase
			.from('subscriptions')
			.upsert(
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
		// Downgrade to free plan + clear tokens
		supabase.from('profiles').update({ plan: 'free', tokens: 0 }).eq('id', profileData.id),

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
	// Only reset tokens for subscription renewals (not one-time payments)
	if (invoice.billing_reason !== 'subscription_cycle') return;

	const customerId = typeof invoice.customer === 'string'
		? invoice.customer
		: (invoice.customer as Stripe.Customer)?.id;

	if (!customerId) return;

	const { data: profileData } = await supabase
		.from('profiles')
		.select('id')
		.eq('stripe_customer_id', customerId)
		.maybeSingle();

	if (!profileData?.id) return;

	await supabase
		.from('profiles')
		.update({ tokens: PRO_TOKENS_PER_MONTH })
		.eq('id', profileData.id);
}

async function handleTokenPackPurchase(
	session: Stripe.Checkout.Session,
	supabase: import('@supabase/supabase-js').SupabaseClient
): Promise<void> {
	const userId = session.metadata?.supabase_user_id;
	const tokensToAdd = Number(session.metadata?.tokens ?? 0);

	if (!userId || !tokensToAdd) return;

	// Atomic increment — avoids race condition when multiple webhooks fire concurrently
	await supabase.rpc('add_tokens', { p_user_id: userId, p_amount: tokensToAdd });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolvePlanFromSubscription(
	subscription: Stripe.Subscription
): 'free' | 'pro' {
	// Check product metadata or nickname for plan name
	const item = subscription.items?.data?.[0];
	if (!item) return 'free';

	const price = item.price as Stripe.Price & { product?: Stripe.Product };
	const product = typeof price.product === 'object' ? price.product : null;

	const productName = (product?.name ?? '').toLowerCase();
	const priceNickname = (price.nickname ?? '').toLowerCase();
	const combined = `${productName} ${priceNickname}`;

	if (combined.includes('pro')) return 'pro';

	// Fall back to metadata on the subscription itself
	const metaPlan = subscription.metadata?.plan?.toLowerCase();
	if (metaPlan === 'pro') return 'pro';

	return 'pro'; // default for any paid subscription
}
