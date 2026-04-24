import type { PageServerLoad } from './$types';
import { lsApi } from '$lib/server/lemonsqueezy';

export const load: PageServerLoad = async ({ url }) => {
	const statusFilter = url.searchParams.get('status') ?? 'active';

	// LemonSqueezy statuses: on_trial, active, paused, past_due, unpaid, cancelled, expired
	const queryParams = new URLSearchParams({ 'page[size]': '100' });
	if (statusFilter !== 'all') queryParams.set('filter[status]', statusFilter);

	const res = await lsApi(`/subscriptions?${queryParams}`);
	const body = res.ok ? await res.json() : { data: [] };

	const subscriptions = (body.data ?? []).map((s: Record<string, unknown>) => {
		const attrs = s.attributes as Record<string, unknown>;
		const variantName = String(attrs.variant_name ?? '').toLowerCase();
		const interval = variantName.includes('year') ? 'yearly' : 'monthly';

		return {
			id:                  String(s.id),
			customerId:          String(attrs.customer_id ?? ''),
			email:               String(attrs.user_email ?? ''),
			plan:                String(attrs.product_name ?? ''),
			status:              String(attrs.status ?? ''),
			cancel_at_period_end: Boolean(attrs.cancelled),
			interval,
			amount:              null as number | null,
			current_period_end:  String(attrs.renews_at ?? attrs.ends_at ?? attrs.updated_at ?? ''),
			created:             String(attrs.created_at ?? '')
		};
	});

	return { subscriptions, total: subscriptions.length, status: statusFilter };
};
