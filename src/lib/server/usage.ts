import type { SupabaseClient } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Plan = 'free' | 'pro';

export interface QuotaResult {
	allowed: boolean;
	used: number;
	limit: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FREE_DETECTION_LIMIT = 3; // lifetime detections for free users
const UNLIMITED = -1;

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayUtc(): string {
	return new Date().toISOString().slice(0, 10);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check whether the user is allowed to run another detection.
 *
 * - free plan: 3 total detections (lifetime, no reset)
 * - pro: unlimited
 */
export async function checkQuota(
	supabase: SupabaseClient,
	userId: string,
	plan: Plan
): Promise<QuotaResult> {
	if (plan === 'pro') {
		return { allowed: true, used: 0, limit: UNLIMITED };
	}

	const { count, error } = await supabase
		.from('detections')
		.select('id', { count: 'exact', head: true })
		.eq('user_id', userId);

	if (error) {
		throw new Error(`Failed to count detections: ${error.message}`);
	}

	const used = count ?? 0;
	const limit = FREE_DETECTION_LIMIT;

	return { allowed: used < limit, used, limit };
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
