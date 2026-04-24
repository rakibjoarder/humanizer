import type { PageServerLoad } from './$types';
import { getUserProfile } from '$lib/server/auth';
import { redirectToLoginModal } from '$lib/server/redirectLoginModal';
import { WORDS_PER_PLAN, wordPacks } from '$lib/server/lemonsqueezy';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirectToLoginModal(url);
	}

	const profile = await getUserProfile(locals.supabase, user.id);

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

	const totalDetections    = detectionsCountRes.count ?? 0;
	const totalHumanizations = humanizationsCountRes.count ?? 0;
	const wordsAnalyzed      = (wordsAnalyzedRes.data ?? []).reduce(
		(sum: number, row: { words_used: number }) => sum + (row.words_used ?? 0),
		0
	);

	const { data: probRows } = await locals.supabase
		.from('detections')
		.select('ai_probability')
		.eq('user_id', user.id)
		.not('ai_probability', 'is', null);

	const avgAiProbability = probRows && probRows.length > 0
		? Math.round(probRows.reduce((sum: number, r: { ai_probability: number }) => sum + r.ai_probability, 0) / probRows.length * 100)
		: null;

	const planWordsLimit = WORDS_PER_PLAN[profile.plan] ?? 150;

	const { data: wordCredits } = await locals.supabase
		.from('word_credits')
		.select('id, amount, source, description, created_at')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(10);

	return {
		profile,
		wordsBalance: profile.words_balance ?? 0,
		planWordsLimit,
		wordPacks,
		totalDetections,
		totalHumanizations,
		wordsAnalyzed,
		avgAiProbability,
		wordCredits: wordCredits ?? []
	};
};
