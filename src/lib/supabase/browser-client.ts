import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { browser } from '$app/environment';

/**
 * Single browser Supabase client for the whole session.
 * Creating a new client on every root `load` (e.g. after each `invalidate('supabase:auth')`)
 * causes multiple GoTrue instances to fight over the same `lock:sb-…-auth-token` in
 * localStorage — see gotrue-js "Lock … was not released within 5000ms".
 */
let singleton: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
	if (!browser) {
		throw new Error('getSupabaseBrowserClient is browser-only');
	}
	singleton ??= createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
	return singleton;
}
