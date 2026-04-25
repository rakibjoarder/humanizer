import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { lsApi } from '$lib/server/lemonsqueezy';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

function adminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export const load: PageServerLoad = async ({ params }) => {
	const res = await lsApi(`/subscriptions/${params.id}`);
	if (!res.ok) error(404, 'Subscription not found');

	const body = await res.json();
	const s = body.data;
	const attrs = s.attributes as Record<string, unknown>;

	const variantName = String(attrs.variant_name ?? '').toLowerCase();
	const interval = variantName.includes('year') ? 'yearly' : 'monthly';

	const subscription = {
		id:                   String(s.id),
		customerId:           String(attrs.customer_id ?? ''),
		orderId:              String(attrs.order_id ?? ''),
		productName:          String(attrs.product_name ?? ''),
		variantName:          String(attrs.variant_name ?? ''),
		email:                String(attrs.user_email ?? ''),
		name:                 String(attrs.user_name ?? ''),
		status:               String(attrs.status ?? ''),
		statusFormatted:      String(attrs.status_formatted ?? ''),
		interval,
		cancelled:            Boolean(attrs.cancelled),
		trialEndsAt:          attrs.trial_ends_at ? String(attrs.trial_ends_at) : null,
		billingAnchor:        attrs.billing_anchor ?? null,
		renewsAt:             attrs.renews_at ? String(attrs.renews_at) : null,
		endsAt:               attrs.ends_at ? String(attrs.ends_at) : null,
		createdAt:            String(attrs.created_at ?? ''),
		updatedAt:            String(attrs.updated_at ?? ''),
		firstSubscriptionItem: (attrs.first_subscription_item as Record<string, unknown>) ?? null,
	};

	// Try to find matching user in Supabase by email
	const db = adminClient();
	const { data: profile } = await db
		.from('profiles')
		.select('id, email, full_name, plan, words_balance, ls_customer_id, created_at, disabled')
		.eq('email', subscription.email)
		.maybeSingle();

	return { subscription, profile: profile ?? null };
};
