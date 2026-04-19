import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return { detections: [], user: null };
	}

	const { data: detections } = await locals.supabase
		.from('detections')
		.select('id, word_count, ai_probability, classification, created_at')
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.limit(5);

	return {
		detections: detections ?? [],
		user: { id: user.id }
	};
};
