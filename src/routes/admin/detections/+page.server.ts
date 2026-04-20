import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

function adminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

const PAGE_SIZE = 30;

export const load: PageServerLoad = async ({ url }) => {
	const db = adminClient();
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const verdict = url.searchParams.get('verdict') ?? 'all';
	const from = (page - 1) * PAGE_SIZE;

	let query = db
		.from('detections')
		.select('id, user_id, word_count, ai_probability, verdict, created_at, profiles!inner(email)', { count: 'exact' })
		.order('created_at', { ascending: false })
		.range(from, from + PAGE_SIZE - 1);

	if (verdict !== 'all') query = query.eq('verdict', verdict);

	const { data, count } = await query;

	return {
		detections: data ?? [],
		total: count ?? 0,
		page,
		pages: Math.ceil((count ?? 0) / PAGE_SIZE),
		verdict
	};
};
