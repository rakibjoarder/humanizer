import type { PageServerLoad } from './$types';
import { stripe } from '$lib/server/stripe';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

function adminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export const load: PageServerLoad = async ({ url }) => {
	const statusFilter = url.searchParams.get('status') ?? 'active';

	// Fetch subscriptions from Stripe
	const result = await stripe.subscriptions.list({
		limit: 100,
		status: statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'canceled' | 'past_due' | 'trialing') ,
		expand: ['data.customer']
	});

	const stripeSubs = result.data;

	// Get customer IDs to look up emails from Supabase
	const customerIds = stripeSubs
		.map((s) => (typeof s.customer === 'object' ? s.customer.id : s.customer))
		.filter(Boolean);

	let emailMap: Record<string, string> = {};
	if (customerIds.length > 0) {
		const db = adminClient();
		const { data: profiles } = await db
			.from('profiles')
			.select('email, stripe_customer_id')
			.in('stripe_customer_id', customerIds);

		emailMap = Object.fromEntries(
			(profiles ?? []).map((p) => [p.stripe_customer_id, p.email])
		);
	}

	const subscriptions = stripeSubs.map((s) => {
		const customerId = typeof s.customer === 'object' ? s.customer.id : s.customer;
		return {
			id: s.id,
			customerId,
			email: emailMap[customerId] ?? customerId,
			status: s.status,
			cancel_at_period_end: s.cancel_at_period_end,
			interval: s.items.data[0]?.price.recurring?.interval ?? '—',
			amount: s.items.data[0]?.price.unit_amount ?? null,
			current_period_end: new Date(s.current_period_end * 1000).toISOString(),
			created: new Date(s.created * 1000).toISOString()
		};
	});

	return { subscriptions, total: subscriptions.length, status: statusFilter };
};
