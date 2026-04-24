import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lsApi } from '$lib/server/lemonsqueezy';

export const config = { runtime: 'nodejs20.x', maxDuration: 30 };

// ── POST /api/billing/portal ──────────────────────────────────────────────────

export const POST: RequestHandler = async ({ locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'You must be logged in.' }, { status: 401 });
	}

	// Look up the user's active subscription to get the customer portal URL
	const { data: subRow } = await locals.supabase
		.from('subscriptions')
		.select('ls_subscription_id')
		.eq('user_id', user.id)
		.in('status', ['active', 'on_trial', 'past_due'])
		.order('current_period_end', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (!subRow?.ls_subscription_id) {
		// Fall back to general LemonSqueezy customer portal
		return json({ url: 'https://app.lemonsqueezy.com/my-orders' });
	}

	try {
		const res = await lsApi(`/subscriptions/${subRow.ls_subscription_id}`);

		if (!res.ok) {
			console.error('[billing/portal] fetch subscription failed:', res.status);
			return json({ url: 'https://app.lemonsqueezy.com/my-orders' });
		}

		const data = await res.json();
		const portalUrl =
			data?.data?.attributes?.urls?.customer_portal ??
			'https://app.lemonsqueezy.com/my-orders';

		return json({ url: `${portalUrl}?back_url=${encodeURIComponent(`${url.origin}/settings`)}` });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[billing/portal]', message);
		return json({ url: 'https://app.lemonsqueezy.com/my-orders' });
	}
};
