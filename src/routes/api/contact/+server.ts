import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { RESEND_API_KEY, ADMIN_EMAILS, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const RATE_LIMIT_MS = 60_000;
const recentSubmissions = new Map<string, number>();

export const POST: RequestHandler = async ({ request, locals }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request.' }, { status: 400 });
	}

	const { name, email, subject, message } = body as Record<string, unknown>;

	if (
		typeof name !== 'string' || name.trim().length < 1 ||
		typeof email !== 'string' || !email.includes('@') ||
		typeof subject !== 'string' || subject.trim().length < 1 ||
		typeof message !== 'string' || message.trim().length < 10
	) {
		return json({ error: 'Please fill in all fields.' }, { status: 400 });
	}

	// Simple in-memory rate limit per email
	const key = email.toLowerCase().trim();
	const last = recentSubmissions.get(key);
	if (last && Date.now() - last < RATE_LIMIT_MS) {
		return json({ error: 'Please wait before sending another message.' }, { status: 429 });
	}
	recentSubmissions.set(key, Date.now());

	const { session, user } = await locals.safeGetSession();

	// Save to Supabase
	const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
	await adminClient.from('contact_messages').insert({
		name: name.trim().slice(0, 200),
		email: key.slice(0, 200),
		subject: subject.trim().slice(0, 300),
		message: message.trim().slice(0, 5000),
		user_id: user?.id ?? null
	});

	// Send email via Resend if configured
	if (RESEND_API_KEY && !RESEND_API_KEY.startsWith('re_placeholder')) {
		const resend = new Resend(RESEND_API_KEY);
		const adminEmail = ADMIN_EMAILS.split(',')[0].trim();
		await resend.emails.send({
			from: 'HumanizeAIWrite <info@droidappbd.com>',
			to: 'info@droidappbd.com',
			reply_to: key,
			subject: `[Contact] ${subject.trim().slice(0, 100)}`,
			text: `Name: ${name.trim()}\nEmail: ${key}\n\n${message.trim()}`
		});
	}

	return json({ success: true });
};
