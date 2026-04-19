import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, url }) => {
	const { session } = await parent();

	if (session) {
		const redirectTo = url.searchParams.get('redirect') ?? '/home';
		redirect(303, redirectTo);
	}

	return {};
};
