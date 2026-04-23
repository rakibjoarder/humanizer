import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ADMIN_EMAILS, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) error(401, 'Unauthorized');

	const adminList = ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase());
	if (!adminList.includes(user.email?.toLowerCase() ?? '')) error(403, 'Forbidden');

	const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!UUID_RE.test(params.id)) return json({ error: 'Invalid user ID.' }, { status: 400 });

	const body = await request.json();
	const { words_balance, plan, disabled } = body as { words_balance?: number; plan?: string; disabled?: boolean };

	const update: Record<string, unknown> = {};
	if (typeof words_balance === 'number' && words_balance >= -1) update.words_balance = words_balance;
	if (plan === 'free' || plan === 'basic' || plan === 'pro' || plan === 'ultra') update.plan = plan;
	if (typeof disabled === 'boolean') {
		update.disabled = disabled;
		update.disabled_at = disabled ? new Date().toISOString() : null;
	}

	if (Object.keys(update).length === 0) {
		return json({ error: 'Nothing to update.' }, { status: 400 });
	}

	const db = adminClient();

	// Fetch current balance before update so we can log the delta
	let previousBalance = 0;
	if (typeof words_balance === 'number') {
		const { data: current } = await db.from('profiles').select('words_balance').eq('id', params.id).single();
		previousBalance = current?.words_balance ?? 0;
	}

	let { error: dbErr } = await db.from('profiles').update(update).eq('id', params.id);
	if (dbErr) {
		// PostgREST schema cache can lag behind migrations; retry without disabled fields
		// so plan/words edits still work while cache refreshes.
		const msg = dbErr.message ?? '';
		const looksLikeDisabledCache =
			(msg.includes("Could not find the 'disabled' column") ||
				msg.includes('disabled_at') ||
				(msg.includes('schema cache') && msg.includes('disabled')));

		if (looksLikeDisabledCache && ('disabled' in update || 'disabled_at' in update)) {
			const { disabled: _d, disabled_at: _da, ...retryUpdate } = update;
			if (Object.keys(retryUpdate).length === 0) {
				return json(
					{
						error:
							"Account access can't be changed yet because the API schema cache hasn't picked up the `profiles.disabled` columns. Reload the Supabase API schema (or wait a minute) and try again."
					},
					{ status: 500 }
				);
			}

			const retry = await db.from('profiles').update(retryUpdate).eq('id', params.id);
			dbErr = retry.error ?? null;
		}
	}

	if (dbErr) return json({ error: dbErr.message }, { status: 500 });

	// Log admin credit when words were increased
	if (typeof words_balance === 'number' && words_balance > previousBalance) {
		const delta = words_balance - previousBalance;
		await db.from('word_credits').insert({
			user_id: params.id,
			amount: delta,
			source: 'admin_credit',
			description: `Admin credit (+${delta.toLocaleString()} words) by ${user.email}`
		});
	}

	return json({ ok: true });
};
