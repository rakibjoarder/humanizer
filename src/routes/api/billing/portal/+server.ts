import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const config = { runtime: 'nodejs20.x', maxDuration: 30 };
import { stripe } from '$lib/server/stripe';
import { getUserProfile } from '$lib/server/auth';
import { PUBLIC_APP_URL } from '$env/static/public';

// ── POST /api/billing/portal ──────────────────────────────────────────────────

export const POST: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'You must be logged in.' }, { status: 401 });
	}

	let profile: Awaited<ReturnType<typeof getUserProfile>>;
	try {
		profile = await getUserProfile(locals.supabase, user.id);
	} catch {
		return json({ error: 'Failed to fetch user profile.' }, { status: 500 });
	}

	if (!profile.stripe_customer_id) {
		return json({ error: 'No billing account found. Please subscribe first.' }, { status: 400 });
	}

	try {
		const portalSession = await stripe.billingPortal.sessions.create({
			customer: profile.stripe_customer_id,
			return_url: `${PUBLIC_APP_URL}/settings`
		});

		return json({ url: portalSession.url });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		const cause = err instanceof Error && (err as NodeJS.ErrnoException).code;
		const detail = `${message}${cause ? ` (code: ${cause})` : ''}`;
		console.error('[billing/portal]', detail);
		return json({ error: detail }, { status: 500 });
	}
};
