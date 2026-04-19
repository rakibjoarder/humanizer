import type { PageServerLoad } from './$types';
import { getUserProfile } from '$lib/server/auth';
import { redirectToLoginModal } from '$lib/server/redirectLoginModal';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirectToLoginModal(url);
	}

	let plan: 'free' | 'pro' = 'free';

	try {
		const profile = await getUserProfile(locals.supabase, user.id);
		plan = profile.plan;
	} catch {
		// Fall through with free plan if profile fetch fails
	}

	const rawId = url.searchParams.get('id');
	const activityId = rawId && UUID_RE.test(rawId) ? rawId : null;

	let savedHumanization: {
		id: string;
		input_text: string;
		output_text: string;
		word_count: number | null;
		created_at: string;
	} | null = null;

	if (activityId) {
		const { data: row, error } = await locals.supabase
			.from('humanizations')
			.select('id, input_text, output_text, word_count, created_at')
			.eq('user_id', user.id)
			.eq('id', activityId)
			.maybeSingle();

		if (!error && row) {
			savedHumanization = row;
		}
	}

	return {
		plan,
		user: { id: user.id },
		savedHumanization
	};
};
