import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ parent, data }) => {
	const { supabase, session, user } = await parent();

	if (!user) {
		return { profile: null, proVariantIds: data.proVariantIds };
	}

	const { data: profile, error } = await supabase
		.from('profiles')
		.select('id, email, full_name, plan, created_at')
		.eq('id', user.id)
		.maybeSingle();

	if (error) {
		console.error('Failed to load profile:', error.message);
	}

	return { profile: profile ?? null, proVariantIds: data.proVariantIds };
};
