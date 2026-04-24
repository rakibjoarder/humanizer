import type { LayoutServerLoad } from './$types';
import { redirectToLoginModal } from '$lib/server/redirectLoginModal';
import { WORDS_PER_PLAN, wordPacks } from '$lib/server/lemonsqueezy';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, supabase }, url }) => {
	const { session, user } = await safeGetSession();

	if (!session) {
		if (
			url.pathname.startsWith('/detect') ||
			url.pathname.startsWith('/blog') ||
			url.pathname === '/privacy' ||
			url.pathname === '/terms'
		) {
			return { session: null, user: null, wordPacks };
		}
		redirectToLoginModal(url);
	}

	// Auto-sync: if the user has an active subscription but profile.plan is still 'free',
	// the webhook was missed — fix it now so the user isn't stuck.
	if (user) {
		try {
			const [{ data: profile }, { data: activeSub }] = await Promise.all([
				supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle(),
				supabase
					.from('subscriptions')
					.select('plan')
					.eq('user_id', user.id)
					.in('status', ['active', 'on_trial'])
					.eq('cancel_at_period_end', false)
					.order('current_period_end', { ascending: false })
					.limit(1)
					.maybeSingle()
			]);

			const subPlan = activeSub?.plan as string | null;
			if (profile?.plan === 'free' && subPlan && subPlan !== 'free') {
				const wordsBalance = WORDS_PER_PLAN[subPlan] ?? WORDS_PER_PLAN.basic;
				await supabase
					.from('profiles')
					.update({ plan: subPlan, words_balance: wordsBalance })
					.eq('id', user.id);
				console.log(`[layout] Auto-synced plan for user ${user.id}: free → ${subPlan}`);
			}
		} catch (err) {
			console.error('[layout] Auto-sync failed:', err);
		}
	}

	return { session, user, wordPacks };
};
