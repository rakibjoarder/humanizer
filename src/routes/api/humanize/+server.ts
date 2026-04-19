import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { humanizeText } from '$lib/server/api';
import { checkRateLimit } from '$lib/server/rateLimit';
import { checkQuota, incrementUsage } from '$lib/server/usage';
import { getUserProfile } from '$lib/server/auth';

// ── POST /api/humanize ────────────────────────────────────────────────────────

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

	if (text.length < 1) {
		return json({ error: 'Text must not be empty.' }, { status: 400 });
	}

	if (text.length > 50_000) {
		return json(
			{ error: 'Text must not exceed 50,000 characters.' },
			{ status: 400 }
		);
	}

	// 3. Require auth
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json(
			{ error: 'You must be logged in to humanize text.' },
			{ status: 401 }
		);
	}

	// 4. Rate limit (IP-based)
	const ip =
		request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

	let rateLimitResult: Awaited<ReturnType<typeof checkRateLimit>>;
	try {
		rateLimitResult = await checkRateLimit('humanize', ip);
	} catch (err) {
		console.error('[humanize] Rate limit check failed:', err);
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

	// 5. Fetch profile + check quota
	let profile: Awaited<ReturnType<typeof getUserProfile>>;
	try {
		profile = await getUserProfile(locals.supabase, user.id);
	} catch (err) {
		console.error('[humanize] Failed to fetch profile:', err);
		return json({ error: 'Failed to fetch user profile.' }, { status: 500 });
	}

	// Free plan users cannot use the humanizer
	if (profile.plan === 'free') {
		return json(
			{
				error:
					'Humanization requires a Pro plan. Please upgrade to continue.'
			},
			{ status: 403 }
		);
	}

	let quotaResult: Awaited<ReturnType<typeof checkQuota>>;
	try {
		quotaResult = await checkQuota(locals.supabase, user.id, profile.plan);
	} catch (err) {
		console.error('[humanize] Quota check failed:', err);
		return json({ error: 'Failed to check usage quota.' }, { status: 500 });
	}

	if (!quotaResult.allowed) {
		return json(
			{
				error: `Could not run humanizer: quota check failed.`,
				used: quotaResult.used,
				limit: quotaResult.limit
			},
			{ status: 429 }
		);
	}

	// 6. Call upstream humanize API
	let result: Awaited<ReturnType<typeof humanizeText>>;
	try {
		result = await humanizeText(text);
	} catch (err) {
		console.error('[humanize] Upstream API error:', err);
		return json(
			{ error: 'Humanization service is unavailable. Please try again later.' },
			{ status: 500 }
		);
	}

	// 7. Persist humanization + increment usage
	Promise.all([
		locals.supabase.from('humanizations').insert({
			user_id: user.id,
			input_text: text,
			output_text: result.humanized_text,
			word_count: result.word_count
		}),
		incrementUsage(locals.supabase, user.id, result.word_count)
	]).catch((err) => {
		console.error('[humanize] Failed to persist humanization / update usage:', err);
	});

	// 8. Return result
	return json({
		humanized_text: result.humanized_text,
		word_count: result.word_count
	});
};
