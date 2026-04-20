import type { PageServerLoad } from './$types';
import { tokenPacks } from '$lib/server/stripe';

export const load: PageServerLoad = async () => {
	return { tokenPacks };
};
