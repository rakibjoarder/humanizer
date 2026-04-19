import { redirect } from '@sveltejs/kit';
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Profile {
	id: string;
	email: string;
	full_name: string | null;
	plan: 'free' | 'pro' | 'annual';
	stripe_customer_id: string | null;
	created_at: string;
}

export interface AuthResult {
	session: Session;
	user: User;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Require an authenticated session.
 *
 * Uses the `safeGetSession` helper already set up in `hooks.server.ts` so the
 * JWT is always verified via `getUser()`.
 *
 * Throws a 303 redirect to `/login` when the user is not authenticated.
 */
export async function requireAuth(
	locals: import('@sveltejs/kit').RequestEvent['locals']
): Promise<AuthResult> {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirect(303, '/login');
	}

	return { session, user };
}

/**
 * Fetch the user's profile row from the `profiles` table.
 *
 * Throws if the row cannot be found or if the query fails.
 */
export async function getUserProfile(
	supabase: SupabaseClient,
	userId: string
): Promise<Profile> {
	const { data, error } = await supabase
		.from('profiles')
		.select('id, email, full_name, plan, stripe_customer_id, created_at')
		.eq('id', userId)
		.single();

	if (error) {
		throw new Error(`Failed to fetch profile for user ${userId}: ${error.message}`);
	}

	if (!data) {
		throw new Error(`Profile not found for user ${userId}`);
	}

	return data as Profile;
}
