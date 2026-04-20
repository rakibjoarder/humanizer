import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanName } from '$lib/server/auth';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuotaResult {
	allowed: boolean;
	used: number;
	limit: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const UNLIMITED = -1;
const FREE_DETECTION_LIFETIME = 2;

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayUtc(): string {
	return new Date().toISOString().slice(0, 10);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check whether the user is allowed to run another detection.
 *
 * - free (unsubscribed): 2 total lifetime detections
 * - basic / pro / ultra: unlimited
 */
export async function checkQuota(
	supabase: SupabaseClient,
	userId: string,
	plan: PlanName
): Promise<QuotaResult> {
	if (plan !== 'free') {
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
	return { allowed: used < FREE_DETECTION_LIFETIME, used, limit: FREE_DETECTION_LIFETIME };
}

/**
 * Increment the words-used counter for today.
 */
export async function incrementUsage(
	supabase: SupabaseClient,
	userId: string,
	wordCount: number
): Promise<void> {
	const date = todayUtc();

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
		{ user_id: userId, date, words_used: newTotal },
		{ onConflict: 'user_id,date' }
	);

	if (upsertError) {
		throw new Error(`Failed to update usage_logs: ${upsertError.message}`);
	}
}
