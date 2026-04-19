import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { detectText } from '$lib/server/api';
import { checkRateLimit } from '$lib/server/rateLimit';
import { checkQuota, incrementUsage } from '$lib/server/usage';
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

	// 3. Rate limit (IP-based)
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

	// 4. Optional auth
	const { session, user } = await locals.safeGetSession();
	const isAuthed = session !== null && user !== null;

	// 5. If authed: check quota
	let profile: Awaited<ReturnType<typeof getUserProfile>> | null = null;

	if (isAuthed && user) {
		try {
			profile = await getUserProfile(locals.supabase, user.id);
		} catch (err) {
			console.error('[detect] Failed to fetch profile:', err);
			return json({ error: 'Failed to fetch user profile.' }, { status: 500 });
		}

		const wordCount = text.split(/\s+/).filter(Boolean).length;

		let quotaResult: Awaited<ReturnType<typeof checkQuota>>;
		try {
			quotaResult = await checkQuota(locals.supabase, user.id, profile.plan, wordCount);
		} catch (err) {
			console.error('[detect] Quota check failed:', err);
			return json({ error: 'Failed to check usage quota.' }, { status: 500 });
		}

		if (!quotaResult.allowed) {
			return json(
				{
					error: `Daily word limit reached. Used ${quotaResult.used} of ${quotaResult.limit} words today.`,
					used: quotaResult.used,
					limit: quotaResult.limit
				},
				{ status: 429 }
			);
		}
	}

	// 6. Call upstream detect API
	let result: Awaited<ReturnType<typeof detectText>>;
	try {
		result = await detectText(text);
	} catch (err) {
		console.error('[detect] Upstream API error:', err);
		return json({ error: 'Detection service is unavailable. Please try again later.' }, { status: 500 });
	}

	// 7. If authed: persist detection + increment usage
	if (isAuthed && user && profile) {
		const wordCount = text.split(/\s+/).filter(Boolean).length;

		// Fire-and-forget persistence — do not block the response
		Promise.all([
			locals.supabase.from('detections').insert({
				user_id: user.id,
				text,
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
	}

	// 8. Return clean JSON
	return json({
		verdict: result.verdict,
		ai_probability: result.ai_probability,
		human_probability: result.human_probability,
		classification: result.classification
	});
};
