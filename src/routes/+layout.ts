import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { browser } from '$app/environment';
import { getSupabaseBrowserClient } from '$lib/supabase/browser-client';
import type { Session, User } from '@supabase/supabase-js';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');

	const supabase = browser
		? getSupabaseBrowserClient()
		: createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: { fetch },
				cookies: { getAll: () => data.cookies }
			});

	let session: Session | null = null;
	let user: User | null = null;

	if (browser) {
		const {
			data: { session: s }
		} = await supabase.auth.getSession();
		session = s ?? null;
		user = s?.user ?? null;
	} else {
		const {
			data: { user: u }
		} = await supabase.auth.getUser();
		user = u ?? null;
		const {
			data: { session: s }
		} = await supabase.auth.getSession();
		session = s ?? null;
	}

	return { session, supabase, user };
};
