import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

function adminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export const load: PageServerLoad = async ({ params }) => {
	const db = adminClient();

	const [{ data: profile }, { data: subscription }, { count: detections }, { count: humanizations }] =
		await Promise.all([
			db.from('profiles')
				.select('id, email, full_name, plan, tokens, stripe_customer_id, created_at')
				.eq('id', params.id)
				.single(),
			db.from('subscriptions')
				.select('stripe_subscription_id, plan, status, cancel_at_period_end, current_period_start, current_period_end')
				.eq('user_id', params.id)
				.order('current_period_end', { ascending: false })
				.limit(1)
				.maybeSingle(),
			db.from('detections').select('id', { count: 'exact', head: true }).eq('user_id', params.id),
			db.from('humanizations').select('id', { count: 'exact', head: true }).eq('user_id', params.id)
		]);

	if (!profile) error(404, 'User not found');

	return { profile, subscription, detections: detections ?? 0, humanizations: humanizations ?? 0 };
};
