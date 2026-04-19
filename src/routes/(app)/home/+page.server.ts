import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserProfile } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirect(303, '/login');
	}

	const profile = await getUserProfile(locals.supabase, user.id);

	// ── Detection quota ───────────────────────────────────────────────────────
	const detectionsLimit = profile.plan === 'free' ? 3 : -1;

	// ── Aggregate stats ───────────────────────────────────────────────────────
	const [detectionsCountRes, humanizationsCountRes, wordsAnalyzedRes] = await Promise.all([
		locals.supabase
			.from('detections')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', user.id),

		locals.supabase
			.from('humanizations')
			.select('id', { count: 'exact', head: true })
			.eq('user_id', user.id),

		locals.supabase
			.from('usage_logs')
			.select('words_used')
			.eq('user_id', user.id)
	]);

	const totalDetections = detectionsCountRes.count ?? 0;
	const totalHumanizations = humanizationsCountRes.count ?? 0;
	const wordsAnalyzed = (wordsAnalyzedRes.data ?? []).reduce(
		(sum: number, row: { words_used: number }) => sum + (row.words_used ?? 0),
		0
	);

	// ── Avg AI probability from all detections ────────────────────────────────
	const { data: probRows } = await locals.supabase
		.from('detections')
		.select('ai_probability')
		.eq('user_id', user.id)
		.not('ai_probability', 'is', null);

	const avgAiProbability = probRows && probRows.length > 0
		? Math.round(probRows.reduce((sum: number, r: { ai_probability: number }) => sum + r.ai_probability, 0) / probRows.length * 100)
		: null;

	// ── Recent activity ───────────────────────────────────────────────────────
	const [recentDetectionsRes, recentHumanizationsRes] = await Promise.all([
		locals.supabase
			.from('detections')
			.select('id, word_count, ai_probability, classification, created_at')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.limit(20),

		locals.supabase
			.from('humanizations')
			.select('id, word_count, created_at')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.limit(20)
	]);

	// Merge and sort by created_at descending, take top 20
	type ActivityItem = {
		id: string;
		type: 'detect' | 'humanize';
		word_count: number;
		classification: string | null;
		ai_probability: number | null;
		created_at: string;
	};

	const detectActivity: ActivityItem[] = (recentDetectionsRes.data ?? []).map((d) => ({
		id: d.id,
		type: 'detect' as const,
		word_count: d.word_count,
		classification: d.classification,
		ai_probability: d.ai_probability,
		created_at: d.created_at
	}));

	const humanizeActivity: ActivityItem[] = (recentHumanizationsRes.data ?? []).map((h) => ({
		id: h.id,
		type: 'humanize' as const,
		word_count: h.word_count,
		classification: null,
		ai_probability: null,
		created_at: h.created_at
	}));

	const recentActivity = [...detectActivity, ...humanizeActivity]
		.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
		.slice(0, 20);

	return {
		profile,
		detectionsLimit,
		totalDetections,
		totalHumanizations,
		wordsAnalyzed,
		avgAiProbability,
		recentActivity
	};
};
