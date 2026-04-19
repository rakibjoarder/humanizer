// Browser-safe API client — no secrets, no server-only imports.
// Calls SvelteKit API routes which proxy the upstream service.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DetectResult {
	verdict: 'ai' | 'human';
	ai_probability: number;
	human_probability: number;
	classification: 'LIKELY_AI' | 'POSSIBLY_AI' | 'POSSIBLY_HUMAN' | 'LIKELY_HUMAN';
}

export interface HumanizeResult {
	humanized_text: string;
	word_count: number;
}

// ── Internal helper ───────────────────────────────────────────────────────────

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
	let response: Response;

	try {
		response = await fetch(path, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
	} catch {
		throw new Error('Network error — please check your connection and try again.');
	}

	let payload: Record<string, unknown>;

	try {
		payload = await response.json();
	} catch {
		throw new Error('Received an unexpected response from the server.');
	}

	if (!response.ok) {
		// Use the server's message when available, otherwise fall back to status text
		const serverMessage =
			typeof payload.message === 'string' || typeof payload.error === 'string'
				? ((payload.message ?? payload.error) as string)
				: null;

		switch (response.status) {
			case 400:
				throw new Error(serverMessage ?? 'Invalid request. Please check your input.');
			case 401:
				throw new Error(serverMessage ?? 'You must be logged in to use this feature.');
			case 403:
				throw new Error(serverMessage ?? 'You do not have permission to use this feature.');
			case 429:
				throw new Error(
					serverMessage ?? 'Too many requests. Please wait a moment and try again.'
				);
			case 500:
			default:
				throw new Error(serverMessage ?? 'Something went wrong on our end. Please try again later.');
		}
	}

	return payload as T;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Detect whether the given text was written by AI or a human.
 * Calls POST /api/detect.
 */
export async function detectText(text: string): Promise<DetectResult> {
	return postJson<DetectResult>('/api/detect', { text });
}

/**
 * Rewrite the given text to sound more human.
 * Calls POST /api/humanize. Requires the user to be logged in.
 */
export async function humanizeText(text: string): Promise<HumanizeResult> {
	return postJson<HumanizeResult>('/api/humanize', { text });
}
