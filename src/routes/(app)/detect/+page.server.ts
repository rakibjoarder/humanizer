import type { PageServerLoad } from './$types';
import { FREE_DETECTION_MAX_WORDS_PER_SCAN } from '$lib/limits';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return {
			detections: [],
			user: null,
			savedDetection: null,
			plan: null as null,
			wordsBalance: 0,
			detectionsUsed: 0,
			detectionsLimit: 0,
			maxWordsPerScan: FREE_DETECTION_MAX_WORDS_PER_SCAN,
			previewBlurb: `One free preview scan without signing in (max ${FREE_DETECTION_MAX_WORDS_PER_SCAN} words).`
		};
	}

	const rawId = url.searchParams.get('id');
	const activityId = rawId && UUID_RE.test(rawId) ? rawId : null;

	let savedDetection: {
		id: string;
		input_text: string;
		word_count: number | null;
		ai_probability: number | null;
		human_probability: number | null;
		verdict: string | null;
		classification: string | null;
		created_at: string;
	} | null = null;

	if (activityId) {
		const { data: row, error } = await locals.supabase
			.from('detections')
			.select(
				'id, input_text, word_count, ai_probability, human_probability, verdict, classification, created_at'
			)
			.eq('user_id', user.id)
			.eq('id', activityId)
			.maybeSingle();

		if (!error && row) {
			savedDetection = row;
		}
	}

	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('plan, words_balance')
		.eq('id', user.id)
		.maybeSingle();

	const plan = (profile?.plan as 'free' | 'basic' | 'pro' | 'ultra' | undefined) ?? 'free';
	const isPaidPlan = plan === 'basic' || plan === 'pro' || plan === 'ultra';
	const wordsBalance = profile?.words_balance ?? 0;

	const { count: detCount, error: countErr } = await locals.supabase
		.from('detections')
		.select('id', { count: 'exact', head: true })
		.eq('user_id', user.id);

	if (countErr) {
		console.error('[detect/+page.server] detection count:', countErr.message);
	}

	const used = detCount ?? 0;

	const { data: detections } = await locals.supabase
		.from('detections')
		.select('id, word_count, ai_probability, classification, created_at')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(5);

	const maxWordsPerScan = isPaidPlan ? null : FREE_DETECTION_MAX_WORDS_PER_SCAN;

	return {
		detections: detections ?? [],
		user: { id: user.id },
		savedDetection,
		plan,
		wordsBalance,
		detectionsUsed: used,
		detectionsLimit: null,
		maxWordsPerScan,
		previewBlurb: isPaidPlan
			? null
			: wordsBalance <= 0
				? `You have no words remaining. Upgrade to get more.`
				: `${wordsBalance} words remaining on free plan · max ${FREE_DETECTION_MAX_WORDS_PER_SCAN} words per scan.`
	};
};
