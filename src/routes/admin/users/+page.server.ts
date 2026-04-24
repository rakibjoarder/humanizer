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
	const search = (url.searchParams.get('q') ?? '').slice(0, 100);
	const plan = url.searchParams.get('plan') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const perPage = 25;

	let query = db
		.from('profiles')
		.select('id, email, full_name, plan, words_balance, ls_customer_id, created_at', { count: 'exact' })
		.order('created_at', { ascending: false })
		.range((page - 1) * perPage, page * perPage - 1);

	if (search) query = query.ilike('email', `%${search}%`);
	if (plan) query = query.eq('plan', plan);

	const { data: users, count } = await query;

	return {
		users: users ?? [],
		total: count ?? 0,
		page,
		perPage,
		search,
		plan
	};
};
