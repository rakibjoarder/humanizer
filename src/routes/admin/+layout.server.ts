import { redirect, error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { ADMIN_EMAILS } from '$env/static/private';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirect(303, '/?login=1');
	}

	const adminList = ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase());
	if (!adminList.includes(user.email?.toLowerCase() ?? '')) {
		error(403, 'Forbidden');
	}

	return { adminUser: user };
};
