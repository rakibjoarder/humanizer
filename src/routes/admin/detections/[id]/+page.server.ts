import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

function adminClient() {
	return createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export const load: PageServerLoad = async ({ params }) => {
	const db = adminClient();

	const { data } = await db
		.from('detections')
		.select('*, profiles!inner(id, email, full_name, plan)')
		.eq('id', params.id)
		.single();

	if (!data) error(404, 'Detection not found');

	return { detection: data };
};
