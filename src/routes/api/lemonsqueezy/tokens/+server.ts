import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lsApi, wordPacks, getStoreId } from '$lib/server/lemonsqueezy';
import { getUserProfile } from '$lib/server/auth';

// ── POST /api/lemonsqueezy/tokens ─────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		return json({ error: 'You must be logged in.' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body.' }, { status: 400 });
	}

	const { variantId } = body as { variantId?: unknown };

	if (typeof variantId !== 'string' || !variantId) {
		return json({ error: 'Missing required field: variantId.' }, { status: 400 });
	}

	const pack = wordPacks.find((p) => p.variantId === variantId);
	if (!pack) {
		return json({ error: 'Invalid word pack.' }, { status: 400 });
	}

	let profile: Awaited<ReturnType<typeof getUserProfile>>;
	try {
		profile = await getUserProfile(locals.supabase, user.id);
	} catch {
		return json({ error: 'Failed to fetch user profile.' }, { status: 500 });
	}

	const isPaidPlan = profile.plan === 'basic' || profile.plan === 'pro' || profile.plan === 'ultra';
	if (!isPaidPlan) {
		return json({ error: 'Word packs are only available for paid plan users.' }, { status: 403 });
	}

	const origin = url.origin;

	try {
		const res = await lsApi('/checkouts', {
			method: 'POST',
			body: JSON.stringify({
				data: {
					type: 'checkouts',
					attributes: {
						checkout_options: { logo: true },
						checkout_data: {
							email: profile.email,
							name:  profile.full_name ?? undefined,
							custom: {
								supabase_user_id: user.id,
								words: String(pack.words)
							}
						},
						product_options: {
							redirect_url: `${origin}/settings?words_added=true`
						}
					},
					relationships: {
						store:   { data: { type: 'stores',   id: getStoreId() } },
						variant: { data: { type: 'variants', id: variantId    } }
					}
				}
			})
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			console.error('[ls/tokens] create checkout:', err);
			return json({ error: 'Failed to process request. Please try again.' }, { status: 500 });
		}

		const data = await res.json();
		return json({ url: data.data?.attributes?.url });
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		return json({ error: msg }, { status: 500 });
	}
};
