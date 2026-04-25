import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { plans } from '$lib/server/lemonsqueezy';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	if (session) {
		redirect(303, '/humanize');
	}

	return {
		proVariantIds: {
			monthly: plans.pro.monthlyVariantId,
			yearly: plans.pro.yearlyVariantId
		}
	};
};
