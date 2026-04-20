import { redirect } from '@sveltejs/kit';
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import { redirectToLoginModal } from '$lib/server/redirectLoginModal';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlanName = 'free' | 'basic' | 'pro' | 'ultra';

export interface Profile {
	id: string;
	email: string;
	full_name: string | null;
	plan: PlanName;
	words_balance: number;
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
 */
export async function requireAuth(
	locals: import('@sveltejs/kit').RequestEvent['locals'],
	eventUrl?: URL
): Promise<AuthResult> {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		if (eventUrl) {
			redirectToLoginModal(eventUrl);
		}
		redirect(303, '/?login=1');
	}

	return { session, user };
}

/**
 * Fetch the user's profile row from the `profiles` table.
 */
export async function getUserProfile(
	supabase: SupabaseClient,
	userId: string
): Promise<Profile> {
	const { data, error } = await supabase
		.from('profiles')
		.select('id, email, full_name, plan, words_balance, stripe_customer_id, created_at')
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
