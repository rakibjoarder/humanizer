import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';
import type { CookieSerializeOptions } from 'cookie';

export const handle: Handle = async ({ event, resolve }) => {
	// 1. Create supabase client on every request with cookie management
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (
				cookiesToSet: Array<{ name: string; value: string; options?: CookieSerializeOptions }>
			) =>
				cookiesToSet.forEach(({ name, value, options }) =>
					event.cookies.set(name, value, { ...options, path: '/' })
				)
		}
	});

	// 2. safeGetSession helper — always verifies JWT via getUser()
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };
		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };
		return { session, user };
	};

	// 3. Auth guard: protect /dashboard /detect /humanize /settings
	const protectedPaths = ['/dashboard', '/detect', '/humanize', '/settings'];
	const path = event.url.pathname;
	if (protectedPaths.some((p) => path.startsWith(p))) {
		const { session } = await event.locals.safeGetSession();
		if (!session) {
			const redirectUrl = new URL('/login', event.url);
			redirectUrl.searchParams.set('redirect', path);
			return Response.redirect(redirectUrl, 303);
		}
	}

	// 4. Resolve with Supabase-required headers forwarded
	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
