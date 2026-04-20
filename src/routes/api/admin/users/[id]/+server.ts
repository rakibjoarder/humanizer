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

	const body = await request.json();
	const { tokens, plan } = body as { tokens?: number; plan?: string };

	const update: Record<string, unknown> = {};
	if (typeof tokens === 'number' && tokens >= 0) update.tokens = tokens;
	if (plan === 'free' || plan === 'pro') update.plan = plan;

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
