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

function dateRangeStart(range: string): string | null {
	const now = new Date();
	if (range === '7d') { now.setDate(now.getDate() - 7); return now.toISOString(); }
	if (range === '30d') { now.setDate(now.getDate() - 30); return now.toISOString(); }
	if (range === '90d') { now.setDate(now.getDate() - 90); return now.toISOString(); }
	return null;
}

export const load: PageServerLoad = async ({ url }) => {
	const db = adminClient();
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const search = (url.searchParams.get('q') ?? '').slice(0, 100);
	const dateRange = url.searchParams.get('date') ?? 'all';
	const from = (page - 1) * PAGE_SIZE;

	// Resolve user IDs from email search
	let userIds: string[] | null = null;
	if (search) {
		const { data: profiles } = await db
			.from('profiles')
			.select('id')
			.ilike('email', `%${search}%`)
			.limit(200);
		userIds = (profiles ?? []).map((p) => p.id);
		if (userIds.length === 0) {
			return { humanizations: [], total: 0, page, pages: 0, search, dateRange };
		}
	}

	let query = db
		.from('humanizations')
		.select('id, user_id, word_count, created_at, profiles!inner(email)', { count: 'exact' })
		.order('created_at', { ascending: false })
		.range(from, from + PAGE_SIZE - 1);

	if (userIds) query = query.in('user_id', userIds);

	const since = dateRangeStart(dateRange);
	if (since) query = query.gte('created_at', since);

	const { data, count } = await query;

	return {
		humanizations: data ?? [],
		total: count ?? 0,
		page,
		pages: Math.ceil((count ?? 0) / PAGE_SIZE),
		search,
		dateRange
	};
};
