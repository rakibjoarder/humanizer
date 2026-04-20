import type { PageServerLoad } from './$types';
import { plans } from '$lib/server/stripe';

export const load: PageServerLoad = async () => {
	return {
		priceIds: {
			basic: {
				monthly: plans.basic.monthlyPriceId,
				yearly: plans.basic.yearlyPriceId
			},
			pro: {
				monthly: plans.pro.monthlyPriceId,
				yearly: plans.pro.yearlyPriceId
			},
			ultra: {
				monthly: plans.ultra.monthlyPriceId,
				yearly: plans.ultra.yearlyPriceId
			}
		}
	};
};
