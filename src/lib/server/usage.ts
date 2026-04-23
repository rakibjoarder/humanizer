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

/** PostgREST has not picked up `increment_usage_log` yet (or RPC not deployed). */
function isIncrementUsageRpcMissing(message: string): boolean {
	return (
		message.includes('Could not find the function') ||
		message.includes('schema cache')
	);
}

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
 * Prefer atomic `increment_usage_log` RPC when PostgREST exposes it; otherwise read + upsert
 * (slightly race-prone under concurrent same-day updates from the same user).
 */
export async function incrementUsage(
	supabase: SupabaseClient,
	userId: string,
	wordCount: number
): Promise<void> {
	const date = todayUtc();

	const { error: rpcError } = await supabase.rpc('increment_usage_log', {
		p_user_id: userId,
		p_date: date,
		p_words: wordCount
	});

	if (!rpcError) return;

	if (!isIncrementUsageRpcMissing(rpcError.message)) {
		console.warn('[usage] increment_usage_log failed, using read/upsert fallback:', rpcError.message);
	}

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

	const { error: upsertError } = await supabase.from('usage_logs').upsert(
		{ user_id: userId, date, words_used: currentWords + wordCount },
		{ onConflict: 'user_id,date' }
	);

	if (upsertError) {
		throw new Error(`Failed to update usage_logs: ${upsertError.message}`);
	}
}
