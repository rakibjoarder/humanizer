import type { PageServerLoad } from './$types';
import { FREE_DETECTION_LIFETIME, FREE_DETECTION_MAX_WORDS_PER_SCAN } from '$lib/limits';

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
			detectionsUsed: 0,
			detectionsLimit: 0,
			maxWordsPerScan: FREE_DETECTION_MAX_WORDS_PER_SCAN,
			previewBlurb: 'One free preview scan without signing in (max 500 words).'
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
		.select('plan')
		.eq('id', user.id)
		.maybeSingle();

	const plan = (profile?.plan as 'free' | 'pro' | undefined) ?? 'free';

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

	const maxWordsPerScan =
		plan === 'pro' ? null : FREE_DETECTION_MAX_WORDS_PER_SCAN;

	return {
		detections: detections ?? [],
		user: { id: user.id },
		savedDetection,
		plan,
		detectionsUsed: used,
		detectionsLimit: plan === 'pro' ? null : FREE_DETECTION_LIFETIME,
		maxWordsPerScan,
		previewBlurb:
			plan === 'pro'
				? null
				: `Free plan: ${used} of ${FREE_DETECTION_LIFETIME} lifetime scans used · max ${FREE_DETECTION_MAX_WORDS_PER_SCAN} words per scan.`
	};
};
