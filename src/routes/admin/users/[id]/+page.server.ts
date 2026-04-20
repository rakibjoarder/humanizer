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

export const load: PageServerLoad = async ({ params }) => {
	const db = adminClient();

	const [{ data: profile }, { count: detections }, { count: humanizations }] = await Promise.all([
		db.from('profiles')
			.select('id, email, full_name, plan, tokens, stripe_customer_id, created_at')
			.eq('id', params.id)
			.single(),
		db.from('detections').select('id', { count: 'exact', head: true }).eq('user_id', params.id),
		db.from('humanizations').select('id', { count: 'exact', head: true }).eq('user_id', params.id)
	]);

	if (!profile) error(404, 'User not found');

	interface StripeSub {
		id: string;
		status: string;
		cancel_at_period_end: boolean;
		current_period_start: string;
		current_period_end: string;
		price: number | null;
		interval: string | null;
		created: string;
	}

	interface StripePayment {
		id: string;
		amount: number;
		currency: string;
		description: string;
		credits: number | null;
		created: string;
		receiptUrl: string | null;
	}

	let subscriptions: StripeSub[] = [];
	let payments: StripePayment[] = [];

	if (profile.stripe_customer_id) {
		await Promise.all([
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

			// One-time payments (top-ups)
			stripe.charges.list({ customer: profile.stripe_customer_id, limit: 20 })
				.then((r) => {
					payments = r.data
						.filter((c) => c.paid && !c.refunded)
						.map((c) => ({
							id: c.id,
							amount: c.amount,
							currency: c.currency,
							description: c.description ?? c.metadata?.tokens ? `+${c.metadata.tokens} credits` : 'Payment',
							credits: c.metadata?.tokens ? Number(c.metadata.tokens) : null,
							created: new Date(c.created * 1000).toISOString(),
							receiptUrl: c.receipt_url
						}));
				}).catch(() => {})
		]);
	}

	return { profile, subscriptions, payments, detections: detections ?? 0, humanizations: humanizations ?? 0 };
};
