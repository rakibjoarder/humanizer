import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lsApi } from '$lib/server/lemonsqueezy';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

// ── DELETE /api/account/delete ────────────────────────────────────────────────

export const DELETE: RequestHandler = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'You must be logged in.' }, { status: 401 });
	}

	const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	// 1. Cancel active LemonSqueezy subscriptions
	try {
		const { data: subs } = await locals.supabase
			.from('subscriptions')
			.select('ls_subscription_id')
			.eq('user_id', user.id)
			.in('status', ['active', 'on_trial'])
			.not('ls_subscription_id', 'is', null);

		if (subs && subs.length > 0) {
			await Promise.all(
				subs
					.filter((s) => s.ls_subscription_id)
					.map((s) => lsApi(`/subscriptions/${s.ls_subscription_id}`, { method: 'DELETE' }))
			);
		}
	} catch {
		// Non-fatal: proceed with account deletion even if LS cleanup fails
	}

	// 2. Delete user data rows
	await Promise.allSettled([
		locals.supabase.from('detections').delete().eq('user_id', user.id),
		locals.supabase.from('humanizations').delete().eq('user_id', user.id),
		locals.supabase.from('subscriptions').delete().eq('user_id', user.id),
		locals.supabase.from('profiles').delete().eq('id', user.id)
	]);

	// 3. Delete the auth user
	const { error } = await adminClient.auth.admin.deleteUser(user.id);

	if (error) {
		return json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 });
	}

	return json({ success: true });
};
