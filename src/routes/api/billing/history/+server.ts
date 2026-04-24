import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lsApi } from '$lib/server/lemonsqueezy';
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

	// Get subscription IDs from DB for this user
	const { data: subRows } = await locals.supabase
		.from('subscriptions')
		.select('ls_subscription_id, plan, status, current_period_end')
		.eq('user_id', user.id)
		.not('ls_subscription_id', 'is', null)
		.order('current_period_end', { ascending: false })
		.limit(5);

	const lsSubId   = subRows?.[0]?.ls_subscription_id ?? null;
	const userEmail = (profile as unknown as Record<string, string | null>).email ?? null;

	if (!lsSubId && !userEmail) {
		return json({ invoices: [], cancellations: [] });
	}

	try {
		const results = await Promise.all([
			// Subscription invoices (recurring charges)
			lsSubId
				? lsApi(`/subscription-invoices?filter[subscription_id]=${lsSubId}&page[size]=12&sort=-created_at`)
						.then((r) => (r.ok ? r.json() : { data: [] }))
						.catch(() => ({ data: [] }))
				: Promise.resolve({ data: [] }),

			// All orders for this user (subscription + word packs)
			userEmail
				? lsApi(`/orders?filter[user_email]=${encodeURIComponent(userEmail)}&page[size]=20`)
						.then((r) => (r.ok ? r.json() : { data: [] }))
						.catch(() => ({ data: [] }))
				: Promise.resolve({ data: [] })
		]);

		const [invoicesRes, ordersRes] = results;

		const invoices = [
			// Map subscription invoices
			...(invoicesRes.data ?? []).map((inv: Record<string, unknown>) => {
				const attrs = inv.attributes as Record<string, unknown>;
				return {
					id: String(inv.id),
					number: null as string | null,
					status: String(attrs.status ?? 'paid'),
					amount_paid: Number(attrs.total ?? 0),
					currency: String(attrs.currency ?? 'usd').toLowerCase(),
					created: Math.floor(new Date(String(attrs.created_at)).getTime() / 1000),
					hosted_invoice_url: (attrs.urls as Record<string, string> | null)?.invoice_url ?? null,
					billing_reason: String(attrs.billing_reason ?? ''),
					description: attrs.billing_reason === 'initial' ? 'Subscription started' : 'Subscription renewal'
				};
			}),
			// Map one-time orders
			...(ordersRes.data ?? []).map((order: Record<string, unknown>) => {
				const attrs = order.attributes as Record<string, unknown>;
				const item = attrs.first_order_item as Record<string, unknown> | undefined;
				return {
					id: String(order.id),
					number: String(attrs.order_number ?? ''),
					status: String(attrs.status ?? 'paid'),
					amount_paid: Number(attrs.total ?? 0),
					currency: String(attrs.currency ?? 'usd').toLowerCase(),
					created: Math.floor(new Date(String(attrs.created_at)).getTime() / 1000),
					hosted_invoice_url: (attrs.urls as Record<string, string> | null)?.receipt ?? null,
					billing_reason: 'order',
					description: item ? `${item.product_name} — ${item.variant_name}` : 'Order'
				};
			})
		].sort((a, b) => b.created - a.created);

		// Cancelled subscriptions from DB
		const cancellations = (subRows ?? [])
			.filter((s) => s.status === 'cancelled' || s.status === 'expired')
			.map((s) => ({
				id: s.ls_subscription_id ?? '',
				canceled_at: Math.floor(new Date(s.current_period_end).getTime() / 1000),
				ended_at:    Math.floor(new Date(s.current_period_end).getTime() / 1000),
				plan:        s.plan ?? null
			}));

		return json({ invoices, cancellations });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error('[billing/history]', msg);
		return json({ error: msg }, { status: 500 });
	}
};
