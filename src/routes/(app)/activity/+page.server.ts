import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { redirectToLoginModal } from '$lib/server/redirectLoginModal';

export type ActivityItem = {
	id: string;
	type: 'detect' | 'humanize';
	word_count: number;
	preview: string;
	classification: string | null;
	ai_probability: number | null;
	created_at: string;
};

export type ActivityTypeFilter = 'all' | 'detect' | 'humanize';
export type ActivitySortOrder = 'newest' | 'oldest';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(raw: string | null, defaultValue: number): number {
	if (raw == null || raw === '') return defaultValue;
	const n = parseInt(raw, 10);
	return Number.isFinite(n) && n >= 1 ? n : defaultValue;
}

function parseTypeFilter(raw: string | null): ActivityTypeFilter {
	if (raw === 'detect' || raw === 'humanize') return raw;
	return 'all';
}

function parseSortOrder(raw: string | null): ActivitySortOrder {
	return raw === 'oldest' ? 'oldest' : 'newest';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirectToLoginModal(url);
	}

	const page = parsePositiveInt(url.searchParams.get('page'), 1);
	const pageSize = Math.min(
		MAX_PAGE_SIZE,
		Math.max(1, parsePositiveInt(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE))
	);
	const typeFilter = parseTypeFilter(url.searchParams.get('type'));
	const sortOrder = parseSortOrder(url.searchParams.get('sort'));
	const newestFirst = sortOrder === 'newest';

	const countRes = await locals.supabase.rpc('activity_feed_count', { p_type: typeFilter });
	const totalRaw = countRes.data;
	const total =
		typeof totalRaw === 'number' && Number.isFinite(totalRaw)
			? totalRaw
			: typeof totalRaw === 'bigint'
				? Number(totalRaw)
				: 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	if (page > totalPages) {
		const u = new URL(url.href);
		u.searchParams.set('page', String(totalPages));
		redirect(302, `${u.pathname}${u.search}`);
	}

	const offset = (page - 1) * pageSize;
	const rowsRes = await locals.supabase.rpc('activity_feed_page', {
		p_limit: pageSize,
		p_offset: offset,
		p_type: typeFilter,
		p_newest_first: newestFirst
	});

	const loadError = countRes.error?.message ?? rowsRes.error?.message ?? null;

	const rows = (rowsRes.data ?? []) as Array<{
		id: string;
		activity_type: string;
		word_count: number;
		preview: string | null;
		classification: string | null;
		ai_probability: number | null;
		created_at: string;
	}>;

	const activity: ActivityItem[] = rows.map((r) => ({
		id: r.id,
		type: r.activity_type === 'humanize' ? 'humanize' : 'detect',
		word_count: r.word_count ?? 0,
		preview: (r.preview ?? '').trim() ? String(r.preview).trim() : '—',
		classification: r.classification,
		ai_probability: r.ai_probability,
		created_at: r.created_at
	}));

	return {
		activity,
		page,
		pageSize,
		total,
		totalPages,
		typeFilter,
		sortOrder,
		loadError
	};
};
