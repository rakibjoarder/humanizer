import type { PageServerLoad } from './$types';
import { redirectToLoginModal } from '$lib/server/redirectLoginModal';

const ACTIVITY_LIMIT = 200;

export type ActivityItem = {
	id: string;
	type: 'detect' | 'humanize';
	word_count: number;
	classification: string | null;
	ai_probability: number | null;
	created_at: string;
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirectToLoginModal(url);
	}

	const [recentDetectionsRes, recentHumanizationsRes] = await Promise.all([
		locals.supabase
			.from('detections')
			.select('id, word_count, ai_probability, classification, created_at')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.limit(ACTIVITY_LIMIT),

		locals.supabase
			.from('humanizations')
			.select('id, word_count, created_at')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.limit(ACTIVITY_LIMIT)
	]);

	const detectActivity: ActivityItem[] = (recentDetectionsRes.data ?? []).map((d) => ({
		id: d.id,
		type: 'detect' as const,
		word_count: d.word_count ?? 0,
		classification: d.classification,
		ai_probability: d.ai_probability,
		created_at: d.created_at
	}));

	const humanizeActivity: ActivityItem[] = (recentHumanizationsRes.data ?? []).map((h) => ({
		id: h.id,
		type: 'humanize' as const,
		word_count: h.word_count ?? 0,
		classification: null,
		ai_probability: null,
		created_at: h.created_at
	}));

	const activity = [...detectActivity, ...humanizeActivity].sort(
		(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	);

	return { activity };
};
