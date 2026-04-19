import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stripe } from '$lib/server/stripe';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

// ── DELETE /api/account/delete ────────────────────────────────────────────────

export const DELETE: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'You must be logged in.' }, { status: 401 });
	}

	// Use service role client to delete auth user (anon client cannot do this)
	const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	// 1. Cancel active Stripe subscription if any
	try {
		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('stripe_customer_id')
			.eq('id', user.id)
			.maybeSingle();

		if (profile?.stripe_customer_id) {
			const subscriptions = await stripe.subscriptions.list({
				customer: profile.stripe_customer_id,
				status: 'active',
				limit: 10
			});
			await Promise.all(
				subscriptions.data.map((sub) =>
					stripe.subscriptions.cancel(sub.id)
				)
			);
		}
	} catch {
		// Non-fatal: proceed with account deletion even if Stripe cleanup fails
	}

	// 2. Delete user data rows (cascade handled by FK in most tables, but be explicit)
	await Promise.allSettled([
		locals.supabase.from('detections').delete().eq('user_id', user.id),
		locals.supabase.from('humanizations').delete().eq('user_id', user.id),
		locals.supabase.from('subscriptions').delete().eq('user_id', user.id),
		locals.supabase.from('profiles').delete().eq('id', user.id)
	]);

	// 3. Delete the auth user via admin client
	const { error } = await adminClient.auth.admin.deleteUser(user.id);

	if (error) {
		return json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 });
	}

	return json({ success: true });
};
