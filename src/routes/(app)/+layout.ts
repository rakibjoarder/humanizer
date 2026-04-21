import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ parent, data }) => {
	const { supabase, session, user } = await parent();
	const { wordPacks } = data;

	if (!user) {
		return { session, user, profile: null, wordPacks };
	}

	const { data: profile, error } = await supabase
		.from('profiles')
		.select('id, email, full_name, plan, words_balance, stripe_customer_id, created_at')
		.eq('id', user.id)
		.maybeSingle();

	if (error) {
		console.error('Failed to load profile:', error.message);
	}

	const { data: subscription } = await supabase
		.from('subscriptions')
		.select('cancel_at_period_end, current_period_end, status')
		.eq('user_id', user.id)
		.in('status', ['active', 'trialing'])
		.order('current_period_end', { ascending: false })
		.limit(1)
		.maybeSingle();

	return { session, user, profile: profile ?? null, subscription: subscription ?? null, wordPacks };
};
