import type { Actions, PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { lsApi } from '$lib/server/lemonsqueezy';

function adminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export interface LSSub {
	id: string;
	status: string;
	cancel_at_period_end: boolean;
	current_period_start: string;
	current_period_end: string;
	interval: string | null;
	created: string;
	cancelled_at: string | null;
}

export interface LSPayment {
	id: string;
	amount: number;
	currency: string;
	description: string;
	words: number | null;
	created: string;
	receiptUrl: string | null;
}

export interface LSCustomerInfo {
	totalSpent: number;
	firstCharge: string | null;
	lastCharge: string | null;
}

type AdminProfile = {
	id: string;
	email: string;
	full_name: string | null;
	plan: 'free' | 'basic' | 'pro' | 'ultra';
	words_balance: number | null;
	stripe_customer_id: string | null;
	ls_customer_id: string | null;
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
		{ data: recentHumanizations },
		{ data: wordCredits }
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
			.limit(10),
		db.from('word_credits')
			.select('id, amount, source, description, created_at')
			.eq('user_id', params.id)
			.order('created_at', { ascending: false })
			.limit(100)
	]);

	let profile: AdminProfile | null = null;

	{
		const withDisabled = await db
			.from('profiles')
			.select(
				'id, email, full_name, plan, words_balance, stripe_customer_id, ls_customer_id, created_at, disabled, disabled_at'
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
						ls_customer_id: (d.ls_customer_id ?? null) as string | null,
						created_at: d.created_at!,
						disabled: Boolean(d.disabled),
						disabled_at: (d.disabled_at ?? null) as string | null
					}
				: null;
		} else if (
			withDisabled.error.message.includes('column') &&
			(withDisabled.error.message.includes('disabled') || withDisabled.error.message.includes('disabled_at'))
		) {
			const withoutDisabled = await db
				.from('profiles')
				.select('id, email, full_name, plan, words_balance, stripe_customer_id, ls_customer_id, created_at')
				.eq('id', params.id)
				.maybeSingle();
			if (withoutDisabled.error) {
				error(500, `Failed to load profile: ${withoutDisabled.error.message}`);
			}
			const d = withoutDisabled.data as Omit<AdminProfile, 'disabled' | 'disabled_at'> | null;
			profile = d ? { ...d, disabled: false, disabled_at: null } : null;
		} else {
			error(500, `Failed to load profile: ${withDisabled.error.message}`);
		}
	}

	let resolvedProfile = profile;
	if (!resolvedProfile) {
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
			.select('id, email, full_name, plan, words_balance, stripe_customer_id, ls_customer_id, created_at, disabled, disabled_at')
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
					ls_customer_id: (d.ls_customer_id ?? null) as string | null,
					created_at: d.created_at!,
					disabled: Boolean(d.disabled),
					disabled_at: (d.disabled_at ?? null) as string | null
				}
			: null;
		if (!resolvedProfile) error(404, 'User not found');
	}

	let subscriptions: LSSub[] = [];
	let payments: LSPayment[] = [];
	let customerInfo: LSCustomerInfo | null = null;

	// Fetch subscriptions from our DB (LS doesn't support filter[customer_id])
	const { data: dbSubs } = await db
		.from('subscriptions')
		.select('ls_subscription_id, plan, status, cancel_at_period_end, current_period_start, current_period_end, created_at')
		.eq('user_id', params.id)
		.not('ls_subscription_id', 'is', null)
		.order('current_period_end', { ascending: false })
		.limit(10);

	if (dbSubs && dbSubs.length > 0) {
		// Fetch live status from LS for each subscription
		await Promise.all(
			dbSubs.map((sub) =>
				lsApi(`/subscriptions/${sub.ls_subscription_id}`)
					.then((r) => (r.ok ? r.json() : null))
					.then((body) => {
						if (!body?.data) return;
						const attrs = body.data.attributes as Record<string, unknown>;
						const variantName = String(attrs.variant_name ?? '').toLowerCase();
						const resolvedStatus = String(attrs.status ?? sub.status);
						const isCancelled = resolvedStatus === 'cancelled' || resolvedStatus === 'expired';
						subscriptions.push({
							id: String(body.data.id),
							status: resolvedStatus,
							cancel_at_period_end: Boolean(attrs.cancelled),
							current_period_start: String(attrs.created_at ?? sub.current_period_start),
							current_period_end: String(attrs.renews_at ?? attrs.ends_at ?? sub.current_period_end),
							interval: variantName.includes('year') ? 'yearly' : 'monthly',
							created: String(attrs.created_at ?? sub.created_at),
							cancelled_at: isCancelled ? String(attrs.updated_at ?? attrs.ends_at ?? '') || null : null
						});
					})
					.catch(() => {})
			)
		);
	}

	// Fetch orders by email (LS doesn't support filter[customer_id] for orders)
	const userEmail = resolvedProfile.email;
	if (userEmail) {
		await lsApi(`/orders?filter[user_email]=${encodeURIComponent(userEmail)}&page[size]=50`)
			.then((r) => (r.ok ? r.json() : { data: [] }))
			.then((body) => {
				const orders = (body.data ?? []).filter(
					(o: Record<string, unknown>) => (o.attributes as Record<string, unknown>).status === 'paid'
				);

				if (orders.length > 0) {
					const totalSpent = orders.reduce((sum: number, o: Record<string, unknown>) => {
						return sum + Number((o.attributes as Record<string, unknown>).total ?? 0);
					}, 0);
					const sorted = [...orders].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
						const ta = new Date(String((a.attributes as Record<string, unknown>).created_at)).getTime();
						const tb = new Date(String((b.attributes as Record<string, unknown>).created_at)).getTime();
						return ta - tb;
					});
					customerInfo = {
						totalSpent,
						firstCharge: String((sorted[0].attributes as Record<string, unknown>).created_at ?? ''),
						lastCharge: String((sorted[sorted.length - 1].attributes as Record<string, unknown>).created_at ?? '')
					};
				}

				payments = orders.slice(0, 20).map((o: Record<string, unknown>) => {
					const attrs = o.attributes as Record<string, unknown>;
					const item = attrs.first_order_item as Record<string, unknown> | undefined;
					const urls = attrs.urls as Record<string, string> | undefined;
					return {
						id: String(o.id),
						amount: Number(attrs.total ?? 0),
						currency: String(attrs.currency ?? 'usd').toLowerCase(),
						description: item ? `${item.product_name} — ${item.variant_name}` : 'Order',
						words: null as number | null,
						created: String(attrs.created_at ?? ''),
						receiptUrl: urls?.receipt ?? null
					};
				});
			})
			.catch(() => {});
	}

	const activity = [
		...(recentDetections ?? []).map((d) => ({ type: 'detection' as const, created_at: d.created_at })),
		...(recentHumanizations ?? []).map((h) => ({ type: 'humanization' as const, created_at: h.created_at }))
	].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15);

	return {
		profile: resolvedProfile,
		subscriptions,
		payments,
		activity,
		customerInfo,
		detections: detections ?? 0,
		humanizations: humanizations ?? 0,
		recentDetections: recentDetections ?? [],
		recentHumanizations: recentHumanizations ?? [],
		wordCredits: wordCredits ?? []
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
