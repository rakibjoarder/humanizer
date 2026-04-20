import type { PageServerLoad } from './$types';
import { wordPacks } from '$lib/server/stripe';

export const load: PageServerLoad = async () => {
	return { wordPacks };
};
