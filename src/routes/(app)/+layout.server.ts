import type { LayoutServerLoad } from './$types';
import { redirectToLoginModal } from '$lib/server/redirectLoginModal';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, url }) => {
	const { session, user } = await safeGetSession();

	if (!session) {
		// Guest AI detection (preview) — /detect allows signed-out usage
		if (url.pathname.startsWith('/detect')) {
			return { session: null, user: null };
		}
		redirectToLoginModal(url);
	}

	return { session, user };
};
