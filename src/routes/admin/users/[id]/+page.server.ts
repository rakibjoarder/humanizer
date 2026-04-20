import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { stripe } from '$lib/server/stripe';

function adminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export interface StripeSub {
	id: string;
	status: string;
	cancel_at_period_end: boolean;
	current_period_start: string;
	current_period_end: string;
	price: number | null;
	interval: string | null;
	created: string;
}

export interface StripePayment {
	id: string;
	amount: number;
	currency: string;
	description: string;
	credits: number | null;
	created: string;
	receiptUrl: string | null;
}

export interface StripeEvent {
	id: string;
	type: string;
	created: string;
	description: string;
}

export interface StripeCustomerInfo {
	balance: number;
	currency: string | null;
	defaultPaymentMethod: string | null;
	delinquent: boolean;
	totalSpent: number;
	topUpSpent: number;
	firstCharge: string | null;
	lastCharge: string | null;
}

function eventLabel(type: string): string {
	const map: Record<string, string> = {
		'customer.created': 'Customer created',
		'customer.updated': 'Customer updated',
		'customer.subscription.created': 'Subscription created',
		'customer.subscription.updated': 'Subscription updated',
		'customer.subscription.deleted': 'Subscription cancelled',
		'customer.subscription.trial_will_end': 'Trial ending soon',
		'invoice.created': 'Invoice created',
		'invoice.paid': 'Invoice paid',
		'invoice.payment_failed': 'Payment failed',
		'invoice.finalized': 'Invoice finalized',
		'checkout.session.completed': 'Checkout completed',
		'payment_intent.succeeded': 'Payment succeeded',
		'payment_intent.payment_failed': 'Payment failed',
		'charge.succeeded': 'Charge succeeded',
		'charge.refunded': 'Charge refunded',
	};
	return map[type] ?? type;
}

export const load: PageServerLoad = async ({ params }) => {
	const db = adminClient();

	const [
		{ data: profile },
		{ count: detections },
		{ count: humanizations },
		{ data: recentDetections },
		{ data: recentHumanizations }
	] = await Promise.all([
		db.from('profiles')
			.select('id, email, full_name, plan, tokens, stripe_customer_id, created_at')
			.eq('id', params.id)
			.single(),
		db.from('detections').select('id', { count: 'exact', head: true }).eq('user_id', params.id),
		db.from('humanizations').select('id', { count: 'exact', head: true }).eq('user_id', params.id),
		db.from('detections').select('id, created_at').eq('user_id', params.id).order('created_at', { ascending: false }).limit(10),
		db.from('humanizations').select('id, created_at').eq('user_id', params.id).order('created_at', { ascending: false }).limit(10)
	]);

	if (!profile) error(404, 'User not found');

	let subscriptions: StripeSub[] = [];
	let payments: StripePayment[] = [];
	let events: StripeEvent[] = [];
	let customerInfo: StripeCustomerInfo | null = null;

	if (profile.stripe_customer_id) {
		await Promise.all([
			// Customer details + insights
			stripe.customers.retrieve(profile.stripe_customer_id)
				.then((c) => {
					if (c.deleted) return;
					customerInfo = {
						balance: c.balance ?? 0,
						currency: c.currency ?? null,
						defaultPaymentMethod: typeof c.invoice_settings?.default_payment_method === 'string'
							? c.invoice_settings.default_payment_method
							: null,
						delinquent: c.delinquent ?? false,
						totalSpent: 0,
						topUpSpent: 0,
						firstCharge: null,
						lastCharge: null
					};
				}).catch(() => {}),

			// Subscriptions
			stripe.subscriptions.list({ customer: profile.stripe_customer_id, limit: 10 })
				.then((r) => {
					subscriptions = r.data.map((s) => ({
						id: s.id,
						status: s.status,
						cancel_at_period_end: s.cancel_at_period_end,
						current_period_start: new Date(s.current_period_start * 1000).toISOString(),
						current_period_end: new Date(s.current_period_end * 1000).toISOString(),
						price: s.items.data[0]?.price.unit_amount ?? null,
						interval: s.items.data[0]?.price.recurring?.interval ?? null,
						created: new Date(s.created * 1000).toISOString()
					}));
				}).catch(() => {}),

			// One-time payments (top-ups) + spending insights
			stripe.charges.list({ customer: profile.stripe_customer_id, limit: 100 })
				.then((r) => {
					const paid = r.data.filter((c) => c.paid && !c.refunded);
					const topUps = paid.filter((c) => c.metadata?.tokens);
					const sorted = [...paid].sort((a, b) => a.created - b.created);

					if (customerInfo && paid.length > 0) {
						customerInfo.totalSpent = paid.reduce((s, c) => s + c.amount, 0);
						customerInfo.topUpSpent = topUps.reduce((s, c) => s + c.amount, 0);
						customerInfo.firstCharge = new Date(sorted[0].created * 1000).toISOString();
						customerInfo.lastCharge = new Date(sorted[sorted.length - 1].created * 1000).toISOString();
					}

					payments = paid.slice(0, 20).map((c) => ({
						id: c.id,
						amount: c.amount,
						currency: c.currency,
						description: c.description ?? (c.metadata?.tokens ? `+${c.metadata.tokens} credits` : 'Payment'),
						credits: c.metadata?.tokens ? Number(c.metadata.tokens) : null,
						created: new Date(c.created * 1000).toISOString(),
						receiptUrl: c.receipt_url
					}));
				}).catch(() => {}),

			// Stripe events for this customer
			stripe.events.list({ limit: 30 })
				.then((r) => {
					events = r.data
						.filter((e) => {
							const obj = e.data.object as unknown as Record<string, unknown>;
							return obj.customer === profile.stripe_customer_id;
						})
						.map((e) => ({
							id: e.id,
							type: e.type,
							created: new Date(e.created * 1000).toISOString(),
							description: eventLabel(e.type)
						}));
				}).catch(() => {})
		]);
	}

	const activity = [
		...(recentDetections ?? []).map((d) => ({ type: 'detection' as const, created_at: d.created_at })),
		...(recentHumanizations ?? []).map((h) => ({ type: 'humanization' as const, created_at: h.created_at }))
	].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15);

	return { profile, subscriptions, payments, events, activity, customerInfo, detections: detections ?? 0, humanizations: humanizations ?? 0 };
};
