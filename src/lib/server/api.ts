import { PROXY_API_TOKEN } from '$env/static/private';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DetectResponse {
	verdict: 'ai' | 'human';
	ai_probability: number; // 0.0 – 1.0
	human_probability: number;
	classification: 'LIKELY_AI' | 'POSSIBLY_AI' | 'POSSIBLY_HUMAN' | 'LIKELY_HUMAN';
}

export interface HumanizeResponse {
	humanized_text: string;
	word_count: number;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const BASE_URL = 'https://www.textaihumanizer.xyz';

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callApi<T>(
	path: '/detect' | '/humanize',
	body: { text: string },
	timeoutMs: number
): Promise<T> {
	const url = `${BASE_URL}${path}`;

	const doRequest = (): Promise<Response> => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);

		return fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${PROXY_API_TOKEN}`
			},
			body: JSON.stringify(body),
			signal: controller.signal
		}).finally(() => clearTimeout(timer));
	};

	let response: Response;

	// First attempt
	try {
		response = await doRequest();
	} catch (err) {
		// Retry once after 2 s
		await delay(2000);
		response = await doRequest();
	}

	if (!response.ok) {
		// Retry once on any non-2xx
		await delay(2000);
		response = await doRequest();
	}

	if (!response.ok) {
		throw new Error(`Upstream API error: ${response.status} ${response.statusText}`);
	}

	const raw = await response.json();

	// Strip any internal / model fields before returning
	return cleanPayload<T>(path, raw);
}

/** Coerce upstream detect probabilities to 0–1 and a consistent pair (fixes 0–100 scale + drift). */
function normalizeDetectProbabilities(
	ai: unknown,
	human: unknown
): { ai: number; human: number } {
	let a = typeof ai === 'number' && Number.isFinite(ai) ? ai : 0;
	let h = typeof human === 'number' && Number.isFinite(human) ? human : 0;

	if (a > 1 || h > 1) {
		if (a > 1) a /= 100;
		if (h > 1) h /= 100;
	}
	a = Math.min(1, Math.max(0, a));
	h = Math.min(1, Math.max(0, h));

	const sum = a + h;
	if (sum > 1e-6 && Math.abs(sum - 1) > 0.02) {
		a /= sum;
		h /= sum;
	}

	return { ai: a, human: h };
}

function cleanPayload<T>(path: '/detect' | '/humanize', raw: Record<string, unknown>): T {
	if (path === '/detect') {
		const { ai, human } = normalizeDetectProbabilities(raw.ai_probability, raw.human_probability);
		const cleaned: DetectResponse = {
			verdict: raw.verdict as DetectResponse['verdict'],
			ai_probability: ai,
			human_probability: human,
			classification: raw.classification as DetectResponse['classification']
		};
		return cleaned as unknown as T;
	}

	// /humanize
	const text = (raw.humanized_text ?? raw.text ?? '') as string;
	const wordCount =
		typeof raw.word_count === 'number'
			? raw.word_count
			: text
					.split(/\s+/)
					.filter(Boolean).length;

	const cleaned: HumanizeResponse = {
		humanized_text: text,
		word_count: wordCount
	};
	return cleaned as unknown as T;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Call the upstream /detect endpoint. Timeout: 30 s. Retries once on failure. */
export async function detectText(text: string): Promise<DetectResponse> {
	return callApi<DetectResponse>('/detect', { text }, 30_000);
}

/** Call the upstream /humanize endpoint. Timeout: 140 s. Retries once on failure. */
export async function humanizeText(text: string): Promise<HumanizeResponse> {
	return callApi<HumanizeResponse>('/humanize', { text }, 140_000);
}
