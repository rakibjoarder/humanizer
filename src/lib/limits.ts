/** Shared product limits (safe to import from client or server). */

export const FREE_DETECTION_LIFETIME = 2;
/** Max words per detection scan for anonymous preview + logged-in Free tier */
export const FREE_DETECTION_MAX_WORDS_PER_SCAN = 500;

export function countWords(text: string): number {
	const t = text.trim();
	if (t.length === 0) return 0;
	return t.split(/\s+/).filter(Boolean).length;
}

/** Trims to at most `max` words (same rules as {@link countWords}). */
export function trimToMaxWords(s: string, max: number): string {
	const w = s.trim().split(/\s+/).filter(Boolean);
	if (w.length <= max) return s;
	return w.slice(0, max).join(' ');
}
