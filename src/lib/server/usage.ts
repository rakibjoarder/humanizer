import type { SupabaseClient } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Plan = 'free' | 'pro';

export interface QuotaResult {
	allowed: boolean;
	used: number;
	limit: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 500;
const UNLIMITED = -1;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns today's date string in YYYY-MM-DD (UTC). */
function todayUtc(): string {
	return new Date().toISOString().slice(0, 10);
}

/**
 * Fetch how many words have already been used today for a given user.
 * Reads from the `usage_logs` table (columns: user_id, date, words_used).
 */
async function getUsedToday(supabase: SupabaseClient, userId: string): Promise<number> {
	const { data, error } = await supabase
		.from('usage_logs')
		.select('words_used')
		.eq('user_id', userId)
		.eq('date', todayUtc())
		.maybeSingle();

	if (error) {
		throw new Error(`Failed to read usage_logs: ${error.message}`);
	}

	return (data?.words_used as number) ?? 0;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check whether the user is allowed to process `wordCount` more words today.
 *
 * - free plan: 500 words / day hard cap
 * - pro: unlimited
 */
export async function checkQuota(
	supabase: SupabaseClient,
	userId: string,
	plan: Plan,
	wordCount: number
): Promise<QuotaResult> {
	if (plan === 'pro') {
		return { allowed: true, used: 0, limit: UNLIMITED };
	}

	const used = await getUsedToday(supabase, userId);
	const limit = FREE_DAILY_LIMIT;
	const allowed = used + wordCount <= limit;

	return { allowed, used, limit };
}

/**
 * Increment the words-used counter for today.
 *
 * Uses an upsert so the first call creates the row and subsequent calls
 * add to the existing total.
 */
export async function incrementUsage(
	supabase: SupabaseClient,
	userId: string,
	wordCount: number
): Promise<void> {
	const date = todayUtc();

	// Read the current value first so we can compute the new total.
	// (Supabase JS v2 does not support increment via upsert natively.)
	const { data: existing, error: readError } = await supabase
		.from('usage_logs')
		.select('words_used')
		.eq('user_id', userId)
		.eq('date', date)
		.maybeSingle();

	if (readError) {
		throw new Error(`Failed to read usage_logs before increment: ${readError.message}`);
	}

	const currentWords = (existing?.words_used as number) ?? 0;
	const newTotal = currentWords + wordCount;

	const { error: upsertError } = await supabase.from('usage_logs').upsert(
		{
			user_id: userId,
			date,
			words_used: newTotal
		},
		{ onConflict: 'user_id,date' }
	);

	if (upsertError) {
		throw new Error(`Failed to update usage_logs: ${upsertError.message}`);
	}
}
