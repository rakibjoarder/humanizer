import type { PageServerLoad } from './$types';
import { getUserProfile } from '$lib/server/auth';
import { redirectToLoginModal } from '$lib/server/redirectLoginModal';
import { WORDS_PER_PLAN, wordPacks } from '$lib/server/lemonsqueezy';

const SPARKLINE_DAYS = 14;

function dailyCounts(records: Array<{ created_at: string }>, days = SPARKLINE_DAYS): number[] {
	const bins = Array<number>(days).fill(0);
	const now = Date.now();
	for (const r of records) {
		const daysAgo = Math.floor((now - new Date(r.created_at).getTime()) / 86_400_000);
		if (daysAgo >= 0 && daysAgo < days) bins[days - 1 - daysAgo]++;
	}
	return bins;
}

function dailySums(records: Array<{ created_at: string; words_used: number }>, days = SPARKLINE_DAYS): number[] {
	const bins = Array<number>(days).fill(0);
	const now = Date.now();
	for (const r of records) {
		const daysAgo = Math.floor((now - new Date(r.created_at).getTime()) / 86_400_000);
		if (daysAgo >= 0 && daysAgo < days) bins[days - 1 - daysAgo] += r.words_used ?? 0;
	}
	return bins;
}

function dailyAvg(records: Array<{ created_at: string; ai_probability: number | null }>, days = SPARKLINE_DAYS): number[] {
	const sums = Array<number>(days).fill(0);
	const counts = Array<number>(days).fill(0);
	const now = Date.now();
	for (const r of records) {
		const daysAgo = Math.floor((now - new Date(r.created_at).getTime()) / 86_400_000);
		if (daysAgo >= 0 && daysAgo < days && r.ai_probability != null) {
			sums[days - 1 - daysAgo] += r.ai_probability;
			counts[days - 1 - daysAgo]++;
		}
	}
	return sums.map((s, i) => (counts[i] > 0 ? Math.round((s / counts[i]) * 100) : 0));
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirectToLoginModal(url);
	}

	const profile = await getUserProfile(locals.supabase, user.id);

	const cutoff = new Date(Date.now() - SPARKLINE_DAYS * 86_400_000).toISOString();

	// ── Aggregate stats + sparkline data ─────────────────────────────────────
	const [
		detectionsCountRes,
		humanizationsCountRes,
		wordsAnalyzedRes,
		probRows,
		recentDetections,
		recentHumanizations,
		recentUsage,
		recentScores,
		wordCredits
	] = await Promise.all([
		locals.supabase.from('detections').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
		locals.supabase.from('humanizations').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
		locals.supabase.from('usage_logs').select('words_used').eq('user_id', user.id),
		locals.supabase.from('detections').select('ai_probability').eq('user_id', user.id).not('ai_probability', 'is', null),
		locals.supabase.from('detections').select('created_at').eq('user_id', user.id).gte('created_at', cutoff),
		locals.supabase.from('humanizations').select('created_at').eq('user_id', user.id).gte('created_at', cutoff),
		locals.supabase.from('usage_logs').select('created_at, words_used').eq('user_id', user.id).gte('created_at', cutoff),
		locals.supabase.from('detections').select('created_at, ai_probability').eq('user_id', user.id).not('ai_probability', 'is', null).gte('created_at', cutoff),
		locals.supabase.from('word_credits').select('id, amount, source, description, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)
	]);

	const totalDetections    = detectionsCountRes.count ?? 0;
	const totalHumanizations = humanizationsCountRes.count ?? 0;
	const wordsAnalyzed      = (wordsAnalyzedRes.data ?? []).reduce(
		(sum: number, row: { words_used: number }) => sum + (row.words_used ?? 0), 0
	);

	const allProbs = probRows.data ?? [];
	const avgAiProbability = allProbs.length > 0
		? Math.round(allProbs.reduce((s: number, r: { ai_probability: number }) => s + r.ai_probability, 0) / allProbs.length * 100)
		: null;

	const sparklines = {
		detections:    dailyCounts(recentDetections.data ?? []),
		humanizations: dailyCounts(recentHumanizations.data ?? []),
		words:         dailySums(recentUsage.data ?? []),
		avgAi:         dailyAvg(recentScores.data ?? [])
	};

	return {
		profile,
		wordsBalance: profile.words_balance ?? 0,
		planWordsLimit: WORDS_PER_PLAN[profile.plan] ?? 150,
		wordPacks,
		totalDetections,
		totalHumanizations,
		wordsAnalyzed,
		avgAiProbability,
		sparklines,
		wordCredits: wordCredits.data ?? []
	};
};
