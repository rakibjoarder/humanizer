import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe';
import { getUserProfile } from '$lib/server/auth';

export const config = { runtime: 'nodejs20.x', maxDuration: 30 };

export const GET: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) return json({ error: 'Unauthorized' }, { status: 401 });

	let profile: Awaited<ReturnType<typeof getUserProfile>>;
	try {
		profile = await getUserProfile(locals.supabase, user.id);
	} catch {
		return json({ error: 'Failed to fetch profile.' }, { status: 500 });
	}

	if (!profile.stripe_customer_id) {
		return json({ invoices: [], cancellations: [] });
	}

	try {
		const [invoicesRes, canceledSubsRes] = await Promise.all([
			stripe.invoices.list({ customer: profile.stripe_customer_id, limit: 12 }),
			stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'canceled', limit: 5 })
		]);

		const invoices = invoicesRes.data.map((inv) => ({
			id: inv.id,
			number: inv.number,
			status: inv.status,
			amount_paid: inv.amount_paid,
			currency: inv.currency,
			created: inv.created,
			period_start: inv.period_start,
			period_end: inv.period_end,
			hosted_invoice_url: inv.hosted_invoice_url,
			billing_reason: inv.billing_reason,
			description: inv.description ?? inv.lines?.data?.[0]?.description ?? null
		}));

		const cancellations = canceledSubsRes.data.map((sub) => ({
			id: sub.id,
			canceled_at: sub.canceled_at,
			ended_at: sub.ended_at,
			plan: (sub.items?.data?.[0]?.price?.nickname ?? null) as string | null
		}));

		return json({ invoices, cancellations });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error('[billing/history]', msg);
		return json({ error: msg }, { status: 500 });
	}
};
