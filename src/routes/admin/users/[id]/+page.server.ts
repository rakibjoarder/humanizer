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

	// Pull subscriptions directly from Stripe
	let stripeSubscriptions: import('stripe').Stripe.Subscription[] = [];
	if (profile.stripe_customer_id) {
		try {
			const result = await stripe.subscriptions.list({
				customer: profile.stripe_customer_id,
				limit: 5,
				expand: ['data.default_payment_method']
			});
			stripeSubscriptions = result.data;
		} catch {
			// non-fatal
		}
	}

	const subscriptions = stripeSubscriptions.map((s) => ({
		id: s.id,
		status: s.status,
		cancel_at_period_end: s.cancel_at_period_end,
		current_period_start: new Date(s.current_period_start * 1000).toISOString(),
		current_period_end: new Date(s.current_period_end * 1000).toISOString(),
		price: s.items.data[0]?.price.unit_amount ?? null,
		interval: s.items.data[0]?.price.recurring?.interval ?? null,
		created: new Date(s.created * 1000).toISOString()
	}));

	return { profile, subscriptions, detections: detections ?? 0, humanizations: humanizations ?? 0 };
};
