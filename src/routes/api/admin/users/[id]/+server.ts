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
	const { words_balance, plan } = body as { words_balance?: number; plan?: string };

	const update: Record<string, unknown> = {};
	if (typeof words_balance === 'number' && words_balance >= -1) update.words_balance = words_balance;
	if (plan === 'free' || plan === 'basic' || plan === 'pro' || plan === 'ultra') update.plan = plan;

	if (Object.keys(update).length === 0) {
		return json({ error: 'Nothing to update.' }, { status: 400 });
	}

	const { error: dbErr } = await adminClient()
		.from('profiles')
		.update(update)
		.eq('id', params.id);

	if (dbErr) return json({ error: dbErr.message }, { status: 500 });

	return json({ ok: true });
};
