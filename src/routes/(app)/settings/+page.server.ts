import type { PageServerLoad } from './$types';
import { wordPacks } from '$lib/server/stripe';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	let wordCredits: Array<{
		id: string;
		amount: number;
		source: string;
		description: string | null;
		created_at: string;
	}> = [];

	if (user) {
		const { data } = await locals.supabase
			.from('word_credits')
			.select('id, amount, source, description, created_at')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.limit(20);
		wordCredits = data ?? [];
	}

	return { wordPacks, wordCredits };
};
