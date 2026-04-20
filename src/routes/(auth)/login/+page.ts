import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, url }) => {
	const { session } = await parent();

	if (session) {
		const raw = url.searchParams.get('redirect') ?? '/';
		// Only allow relative redirects to prevent open-redirect attacks
		const redirectTo = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
		redirect(303, redirectTo);
	}

	return {};
};
