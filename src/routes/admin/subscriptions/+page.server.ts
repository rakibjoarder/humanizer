import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

function adminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export const load: PageServerLoad = async ({ url }) => {
	const db = adminClient();
	const status = url.searchParams.get('status') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const perPage = 25;

	let query = db
		.from('subscriptions')
		.select(`
			stripe_subscription_id, plan, status, cancel_at_period_end,
			current_period_start, current_period_end,
			profiles!inner(email, tokens)
		`, { count: 'exact' })
		.order('current_period_end', { ascending: false })
		.range((page - 1) * perPage, page * perPage - 1);

	if (status) query = query.eq('status', status);

	const { data: subs, count } = await query;

	return { subs: subs ?? [], total: count ?? 0, page, perPage, status };
};
