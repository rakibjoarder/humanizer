import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserProfile } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirect(303, '/login');
	}

	let plan: 'free' | 'pro' | 'annual' = 'free';

	try {
		const profile = await getUserProfile(locals.supabase, user.id);
		plan = profile.plan;
	} catch {
		// Fall through with free plan if profile fetch fails
	}

	return {
		plan,
		user: { id: user.id }
	};
};
