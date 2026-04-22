import type { Actions, PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { stripe } from '$lib/server/stripe';

function adminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export interface StripeSub {
	id: string;
	status: string;
	cancel_at_period_end: boolean;
	current_period_start: string;
	current_period_end: string;
	price: number | null;
	interval: string | null;
	created: string;
}

export interface StripePayment {
	id: string;
	amount: number;
	currency: string;
	description: string;
	words: number | null;
	created: string;
	receiptUrl: string | null;
}

export interface StripeEvent {
	id: string;
	type: string;
	created: string;
	description: string;
}

export interface StripeCustomerInfo {
	balance: number;
	currency: string | null;
	defaultPaymentMethod: string | null;
	delinquent: boolean;
	totalSpent: number;
	topUpSpent: number;
	firstCharge: string | null;
	lastCharge: string | null;
}

function eventLabel(type: string): string {
	const map: Record<string, string> = {
		'customer.created': 'Customer created',
		'customer.updated': 'Customer updated',
		'customer.subscription.created': 'Subscription created',
		'customer.subscription.updated': 'Subscription updated',
		'customer.subscription.deleted': 'Subscription cancelled',
		'customer.subscription.trial_will_end': 'Trial ending soon',
		'invoice.created': 'Invoice created',
		'invoice.paid': 'Invoice paid',
		'invoice.payment_failed': 'Payment failed',
		'invoice.finalized': 'Invoice finalized',
		'checkout.session.completed': 'Checkout completed',
		'payment_intent.succeeded': 'Payment succeeded',
		'payment_intent.payment_failed': 'Payment failed',
		'charge.succeeded': 'Charge succeeded',
		'charge.refunded': 'Charge refunded',
	};
	return map[type] ?? type;
}

type AdminProfile = {
	id: string;
	email: string;
	full_name: string | null;
	plan: 'free' | 'basic' | 'pro' | 'ultra';
	words_balance: number | null;
	stripe_customer_id: string | null;
	created_at: string;
	disabled: boolean;
	disabled_at: string | null;
};

function coercePlan(raw: unknown): AdminProfile['plan'] {
	return raw === 'basic' || raw === 'pro' || raw === 'ultra' ? raw : 'free';
}

export const load: PageServerLoad = async ({ params }) => {
	const db = adminClient();

	const [
		{ count: detections },
		{ count: humanizations },
		{ data: recentDetections },
		{ data: recentHumanizations }
	] = await Promise.all([
		db.from('detections').select('id', { count: 'exact', head: true }).eq('user_id', params.id),
		db.from('humanizations').select('id', { count: 'exact', head: true }).eq('user_id', params.id),
		db.from('detections')
			.select('id, created_at')
			.eq('user_id', params.id)
			.order('created_at', { ascending: false })
			.limit(10),
		db.from('humanizations')
			.select('id, created_at')
			.eq('user_id', params.id)
			.order('created_at', { ascending: false })
			.limit(10)
	]);

	// `profiles.disabled` is optional until migration is applied.
	let profile: AdminProfile | null = null;

	{
		const withDisabled = await db
			.from('profiles')
			.select(
				'id, email, full_name, plan, words_balance, stripe_customer_id, created_at, disabled, disabled_at'
			)
			.eq('id', params.id)
			.maybeSingle();

		if (!withDisabled.error) {
			const d = withDisabled.data as Partial<AdminProfile> | null;
			profile = d
				? {
						id: d.id!,
						email: d.email!,
						full_name: (d.full_name ?? null) as string | null,
						plan: coercePlan(d.plan),
						words_balance: (d.words_balance ?? 0) as number | null,
						stripe_customer_id: (d.stripe_customer_id ?? null) as string | null,
						created_at: d.created_at!,
						disabled: Boolean(d.disabled),
						disabled_at: (d.disabled_at ?? null) as string | null
					}
				: null;
		} else if (
			withDisabled.error.message.includes('column') &&
			(withDisabled.error.message.includes('disabled') || withDisabled.error.message.includes('disabled_at'))
		) {
			// Migration not applied yet; retry without the new columns.
			const withoutDisabled = await db
				.from('profiles')
				.select('id, email, full_name, plan, words_balance, stripe_customer_id, created_at')
				.eq('id', params.id)
				.maybeSingle();
			if (withoutDisabled.error) {
				error(500, `Failed to load profile: ${withoutDisabled.error.message}`);
			}
			const d = withoutDisabled.data as Omit<AdminProfile, 'disabled' | 'disabled_at'> | null;
			profile = d
				? { ...d, disabled: false, disabled_at: null }
				: null;
		} else {
			error(500, `Failed to load profile: ${withDisabled.error.message}`);
		}
	}

	let resolvedProfile = profile;
	if (!resolvedProfile) {
		// If the auth user exists but the profile row is missing (e.g. trigger failed),
		// auto-create a minimal profile so the admin panel can load.
		const { data: authRes, error: authErr } = await db.auth.admin.getUserById(params.id);
		if (authErr) error(500, `Failed to fetch auth user: ${authErr.message}`);
		if (!authRes?.user) error(404, 'User not found');

		const email = authRes.user.email ?? `missing-email+${params.id}@local.invalid`;
		await db.from('profiles').upsert(
			{
				id: params.id,
				email,
				full_name: authRes.user.user_metadata?.full_name ?? null,
				plan: 'free',
				words_balance: 0,
				created_at: new Date(authRes.user.created_at).toISOString()
			},
			{ onConflict: 'id' }
		);

		const { data: reloaded, error: reloadError } = await db
			.from('profiles')
			.select('id, email, full_name, plan, words_balance, stripe_customer_id, created_at, disabled, disabled_at')
			.eq('id', params.id)
			.maybeSingle();
		if (reloadError) error(500, `Failed to reload profile: ${reloadError.message}`);

		const d = reloaded as Partial<AdminProfile> | null;
		resolvedProfile = d
			? {
					id: d.id!,
					email: d.email!,
					full_name: (d.full_name ?? null) as string | null,
					plan: coercePlan(d.plan),
					words_balance: (d.words_balance ?? 0) as number | null,
					stripe_customer_id: (d.stripe_customer_id ?? null) as string | null,
					created_at: d.created_at!,
					disabled: Boolean(d.disabled),
					disabled_at: (d.disabled_at ?? null) as string | null
				}
			: null;
		if (!resolvedProfile) error(404, 'User not found');
	}

	let subscriptions: StripeSub[] = [];
	let payments: StripePayment[] = [];
	let events: StripeEvent[] = [];
	let customerInfo: StripeCustomerInfo | null = null;

	if (resolvedProfile.stripe_customer_id) {
		await Promise.all([
			stripe.customers.retrieve(resolvedProfile.stripe_customer_id)
				.then((c) => {
					if (c.deleted) return;
					customerInfo = {
						balance: c.balance ?? 0,
						currency: c.currency ?? null,
						defaultPaymentMethod: typeof c.invoice_settings?.default_payment_method === 'string'
							? c.invoice_settings.default_payment_method
							: null,
						delinquent: c.delinquent ?? false,
						totalSpent: 0,
						topUpSpent: 0,
						firstCharge: null,
						lastCharge: null
					};
				}).catch(() => {}),

			stripe.subscriptions.list({ customer: resolvedProfile.stripe_customer_id, limit: 10 })
				.then((r) => {
					subscriptions = r.data.map((s) => ({
						id: s.id,
						status: s.status,
						cancel_at_period_end: s.cancel_at_period_end,
						current_period_start: new Date(s.current_period_start * 1000).toISOString(),
						current_period_end: new Date(s.current_period_end * 1000).toISOString(),
						price: s.items.data[0]?.price.unit_amount ?? null,
						interval: s.items.data[0]?.price.recurring?.interval ?? null,
						created: new Date(s.created * 1000).toISOString()
					}));
				}).catch(() => {}),

			stripe.charges.list({ customer: resolvedProfile.stripe_customer_id, limit: 100 })
				.then((r) => {
					const paid = r.data.filter((c) => c.paid && !c.refunded);
					const topUps = paid.filter((c) => c.metadata?.words);
					const sorted = [...paid].sort((a, b) => a.created - b.created);

					if (customerInfo && paid.length > 0) {
						customerInfo.totalSpent = paid.reduce((s, c) => s + c.amount, 0);
						customerInfo.topUpSpent = topUps.reduce((s, c) => s + c.amount, 0);
						customerInfo.firstCharge = new Date(sorted[0].created * 1000).toISOString();
						customerInfo.lastCharge = new Date(sorted[sorted.length - 1].created * 1000).toISOString();
					}

					payments = paid.slice(0, 20).map((c) => ({
						id: c.id,
						amount: c.amount,
						currency: c.currency,
						description: c.description ?? (c.metadata?.words ? `+${Number(c.metadata.words).toLocaleString()} words` : 'Payment'),
						words: c.metadata?.words ? Number(c.metadata.words) : null,
						created: new Date(c.created * 1000).toISOString(),
						receiptUrl: c.receipt_url
					}));
				}).catch(() => {}),

			stripe.events.list({ limit: 30 })
				.then((r) => {
					events = r.data
						.filter((e) => {
							const obj = e.data.object as unknown as Record<string, unknown>;
							return obj.customer === resolvedProfile.stripe_customer_id;
						})
						.map((e) => ({
							id: e.id,
							type: e.type,
							created: new Date(e.created * 1000).toISOString(),
							description: eventLabel(e.type)
						}));
				}).catch(() => {})
		]);
	}

	const activity = [
		...(recentDetections ?? []).map((d) => ({ type: 'detection' as const, created_at: d.created_at })),
		...(recentHumanizations ?? []).map((h) => ({ type: 'humanization' as const, created_at: h.created_at }))
	].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15);

	return {
		profile: resolvedProfile,
		subscriptions,
		payments,
		events,
		activity,
		customerInfo,
		detections: detections ?? 0,
		humanizations: humanizations ?? 0,
		recentDetections: recentDetections ?? [],
		recentHumanizations: recentHumanizations ?? []
	};
};

function parseIds(form: FormData): string[] {
	const raw = String(form.get('ids') ?? '[]');
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
	} catch {
		return [];
	}
}

export const actions: Actions = {
	deleteUserDetectionsSelected: async ({ request, params }) => {
		const db = adminClient();
		const form = await request.formData();
		const ids = parseIds(form);
		if (ids.length === 0) return fail(400, { error: 'Select at least one row.' });

		const { error: delError } = await db.from('detections').delete().in('id', ids).eq('user_id', params.id);
		if (delError) return fail(500, { error: delError.message });
		return { ok: true };
	},

	deleteUserHumanizationsSelected: async ({ request, params }) => {
		const db = adminClient();
		const form = await request.formData();
		const ids = parseIds(form);
		if (ids.length === 0) return fail(400, { error: 'Select at least one row.' });

		const { error: delError } = await db.from('humanizations').delete().in('id', ids).eq('user_id', params.id);
		if (delError) return fail(500, { error: delError.message });
		return { ok: true };
	},

	deleteUserDetectionsAll: async ({ request, params }) => {
		const db = adminClient();
		const form = await request.formData();
		if (String(form.get('confirm') ?? '') !== 'DELETE') return fail(400, { error: 'Type DELETE to confirm.' });

		const { error: delError } = await db.from('detections').delete().eq('user_id', params.id);
		if (delError) return fail(500, { error: delError.message });
		return { ok: true };
	},

	deleteUserHumanizationsAll: async ({ request, params }) => {
		const db = adminClient();
		const form = await request.formData();
		if (String(form.get('confirm') ?? '') !== 'DELETE') return fail(400, { error: 'Type DELETE to confirm.' });

		const { error: delError } = await db.from('humanizations').delete().eq('user_id', params.id);
		if (delError) return fail(500, { error: delError.message });
		return { ok: true };
	}
};
