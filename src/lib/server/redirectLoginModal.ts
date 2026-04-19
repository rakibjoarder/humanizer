import { redirect } from '@sveltejs/kit';

/**
 * Use instead of `redirect(303, '/login')`. Sends users to `/?login=1&redirect=…`
 * so the root layout can open the login modal instead of navigating to `/login`.
 */
export function redirectToLoginModal(returnTo: URL): never {
	const dest = new URL('/', returnTo);
	dest.searchParams.set('login', '1');
	const ret = returnTo.pathname + returnTo.search;
	dest.searchParams.set('redirect', ret.length > 0 ? ret : '/');
	redirect(303, `${dest.pathname}${dest.search}`);
}
