import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { humanizeText } from '$lib/server/api';
import { checkRateLimit } from '$lib/server/rateLimit';
import { incrementUsage } from '$lib/server/usage';
import { getUserProfile } from '$lib/server/auth';
import { countWords } from '$lib/limits';

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

	if (text.trim().length === 0) {
		return json({ error: 'Text must not be empty.' }, { status: 400 });
	}

	if (text.trim().length < 10) {
		return json({ error: 'Text must be at least 10 characters long.' }, { status: 400 });
	}

	if (text.length > 50_000) {
		return json({ error: 'Text must not exceed 50,000 characters.' }, { status: 400 });
	}

	const outputWordCount = countWords(text);
	if (outputWordCount === 0) {
		return json({ error: 'Text must contain at least one word.' }, { status: 400 });
	}

	// 3. Require auth
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'You must be logged in to humanize text.' }, { status: 401 });
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

	// 5. Fetch profile + check plan
	let profile: Awaited<ReturnType<typeof getUserProfile>>;
	try {
		profile = await getUserProfile(locals.supabase, user.id);
	} catch (err) {
		console.error('[humanize] Failed to fetch profile:', err);
		return json({ error: 'Failed to fetch user profile.' }, { status: 500 });
	}

	const inputWordCount = countWords(text);

	// Words balance check — applies to all plans (free and paid)
	if ((profile.words_balance ?? 0) < inputWordCount) {
		return json({ error: 'out_of_words' }, { status: 402 });
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

	// 7. Atomic word deduction
	const { data: newBalance, error: deductErr } = await locals.supabase
		.rpc('deduct_words', { p_user_id: user.id, p_words: result.word_count });

	if (deductErr || newBalance === -1) {
		return json({ error: 'out_of_words' }, { status: 402 });
	}

	// 8. Persist humanization + increment usage (fire-and-forget)
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

	// 9. Return result
	return json({
		humanized_text: result.humanized_text,
		word_count: result.word_count,
		words_balance: newBalance
	});
};
