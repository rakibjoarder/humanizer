import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

function adminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export const load: PageServerLoad = async () => {
	const db = adminClient();

	const [
		{ count: totalUsers },
		{ count: basicUsers },
		{ count: proUsers },
		{ count: ultraUsers },
		{ count: totalDetections },
		{ count: totalHumanizations },
		{ data: recentUsers }
	] = await Promise.all([
		db.from('profiles').select('id', { count: 'exact', head: true }),
		db.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'basic'),
		db.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'pro'),
		db.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'ultra'),
		db.from('detections').select('id', { count: 'exact', head: true }),
		db.from('humanizations').select('id', { count: 'exact', head: true }),
		db.from('profiles').select('id, email, plan, words_balance, created_at').order('created_at', { ascending: false }).limit(5)
	]);

	const paidUsers = (basicUsers ?? 0) + (proUsers ?? 0) + (ultraUsers ?? 0);

	return {
		stats: {
			totalUsers: totalUsers ?? 0,
			basicUsers: basicUsers ?? 0,
			proUsers: proUsers ?? 0,
			ultraUsers: ultraUsers ?? 0,
			freeUsers: (totalUsers ?? 0) - paidUsers,
			totalDetections: totalDetections ?? 0,
			totalHumanizations: totalHumanizations ?? 0
		},
		recentUsers: recentUsers ?? []
	};
};
