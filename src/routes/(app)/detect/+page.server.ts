import type { PageServerLoad } from './$types';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return { detections: [], user: null, savedDetection: null };
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

	const { data: detections } = await locals.supabase
		.from('detections')
		.select('id, word_count, ai_probability, classification, created_at')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(5);

	return {
		detections: detections ?? [],
		user: { id: user.id },
		savedDetection
	};
};
