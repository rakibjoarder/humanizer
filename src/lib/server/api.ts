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

function cleanPayload<T>(path: '/detect' | '/humanize', raw: Record<string, unknown>): T {
	if (path === '/detect') {
		const cleaned: DetectResponse = {
			verdict: raw.verdict as DetectResponse['verdict'],
			ai_probability: raw.ai_probability as number,
			human_probability: raw.human_probability as number,
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
