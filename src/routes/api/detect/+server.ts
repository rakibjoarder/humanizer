import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FREE_DETECTION_MAX_WORDS_PER_SCAN, countWords } from '$lib/limits';
import { detectText } from '$lib/server/api';
import {
	anonymousDemoAlreadyUsed,
	demoDetectCookieHeader,
	persistAnonymousDemo
} from '$lib/server/demoDetect';
import { checkRateLimit } from '$lib/server/rateLimit';
import { incrementUsage } from '$lib/server/usage';
import { getUserProfile } from '$lib/server/auth';

// ── POST /api/detect ──────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Parse body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body.' }, { status: 400 });
	}

	if (!body || typeof body !== 'object' || !('text' in body)) {
		return json({ error: 'Missing required field: text.' }, { status: 400 });
	}

	const { text } = body as { text: unknown };

	// 2. Validate text
	if (typeof text !== 'string') {
		return json({ error: 'Field "text" must be a string.' }, { status: 400 });
	}

	if (text.length < 50) {
		return json(
			{ error: 'Text must be at least 50 characters long.' },
			{ status: 400 }
		);
	}

	if (text.length > 50_000) {
		return json(
			{ error: 'Text must not exceed 50,000 characters.' },
			{ status: 400 }
		);
	}

	const wordCount = countWords(text);

	// 4. Optional auth (needed for word-limit exemption)
	const { session, user } = await locals.safeGetSession();
	const isAuthed = session !== null && user !== null;

	let profile: Awaited<ReturnType<typeof getUserProfile>> | null = null;
	if (isAuthed && user) {
		try {
			profile = await getUserProfile(locals.supabase, user.id);
		} catch (err) {
			console.error('[detect] Failed to fetch profile:', err);
			return json({ error: 'Failed to fetch user profile.' }, { status: 500 });
		}
	}

	const isPaidPlan = profile?.plan === 'basic' || profile?.plan === 'pro' || profile?.plan === 'ultra';

	// Free and anonymous users: cap at 150 words per scan
	if (!isPaidPlan && wordCount > FREE_DETECTION_MAX_WORDS_PER_SCAN) {
		return json(
			{
				error: `Text must be at most ${FREE_DETECTION_MAX_WORDS_PER_SCAN} words on the free plan. Upgrade for up to 3,000 words.`
			},
			{ status: 400 }
		);
	}

	// Words balance gate — applies to all logged-in users (paid and free)
	if (isAuthed && (profile?.words_balance ?? 0) <= 0) {
		return json({ error: 'out_of_words' }, { status: 402 });
	}

	// 5. Rate limit (IP-based)
	const ip =
		request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

	let rateLimitResult: Awaited<ReturnType<typeof checkRateLimit>>;
	try {
		rateLimitResult = await checkRateLimit('detect', ip);
	} catch (err) {
		console.error('[detect] Rate limit check failed:', err);
		return json({ error: 'Service temporarily unavailable.' }, { status: 500 });
	}

	if (!rateLimitResult.allowed) {
		return json(
			{
				error: 'Rate limit exceeded. Please wait before sending another request.',
				reset: rateLimitResult.reset
			},
			{
				status: 429,
				headers: {
					'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
				}
			}
		);
	}

	// 6. Anonymous: one preview per browser/IP (cookie + optional Redis)
	if (!isAuthed) {
		try {
			if (await anonymousDemoAlreadyUsed(request, ip)) {
				return json(
					{
						error:
							'Your free preview is used. Create a free account to get 150 words to try.',
						code: 'DEMO_EXHAUSTED'
					},
					{ status: 429 }
				);
			}
		} catch (err) {
			console.error('[detect] Demo check failed:', err);
			return json({ error: 'Failed to verify preview eligibility.' }, { status: 500 });
		}
	}

	// 7. (quota check replaced by words_balance gate above)

	// 8. Call upstream detect API
	let result: Awaited<ReturnType<typeof detectText>>;
	try {
		result = await detectText(text);
	} catch (err) {
		console.error('[detect] Upstream API error:', err);
		return json({ error: 'Detection service is unavailable. Please try again later.' }, { status: 500 });
	}

	// 9. If authed: deduct words for all plans (paid + free), persist detection + increment usage
	let newBalance: number | null = null;
	if (isAuthed && user && profile) {
		// Atomic word deduction for all logged-in users
		const { data: deducted, error: deductErr } = await locals.supabase
			.rpc('deduct_words', { p_user_id: user.id, p_words: wordCount });

		if (deductErr || deducted === -1) {
			return json({ error: 'out_of_words' }, { status: 402 });
		}
		newBalance = deducted;

		// Fire-and-forget persistence — do not block the response
		Promise.all([
			locals.supabase.from('detections').insert({
				user_id: user.id,
				input_text: text,
				verdict: result.verdict,
				ai_probability: result.ai_probability,
				human_probability: result.human_probability,
				classification: result.classification,
				word_count: wordCount
			}),
			incrementUsage(locals.supabase, user.id, wordCount)
		]).catch((err) => {
			console.error('[detect] Failed to persist detection / update usage:', err);
		});
	} else {
		try {
			await persistAnonymousDemo(ip);
		} catch (err) {
			console.error('[detect] Failed to persist anonymous demo marker:', err);
		}
	}

	const headers = new Headers();
	if (!isAuthed) {
		headers.set('Set-Cookie', demoDetectCookieHeader());
	}

	// 10. Return clean JSON
	return json(
		{
			verdict: result.verdict,
			ai_probability: result.ai_probability,
			human_probability: result.human_probability,
			classification: result.classification,
			...(newBalance !== null ? { words_balance: newBalance } : {})
		},
		{ headers }
	);
};
