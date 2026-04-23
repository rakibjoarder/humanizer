import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {

	const code       = url.searchParams.get('code');
	const tokenHash  = url.searchParams.get('token_hash');
	const type       = url.searchParams.get('type') as 'recovery' | 'signup' | 'email' | null;
	const redirectTo = url.searchParams.get('redirect') ?? '/humanize';

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, redirectTo);
	}

	if (tokenHash && type) {
		const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
		if (!error) redirect(303, type === 'recovery' ? '/reset-password' : redirectTo);
	}

	redirect(303, `/login?error=auth_callback_failed`);
};
