import type { PageServerLoad } from './$types';
import { plans } from '$lib/server/lemonsqueezy';

export const load: PageServerLoad = async () => {
	return {
		variantIds: {
			basic:  { monthly: plans.basic.monthlyVariantId,  yearly: plans.basic.yearlyVariantId  },
			pro:    { monthly: plans.pro.monthlyVariantId,    yearly: plans.pro.yearlyVariantId    },
			ultra:  { monthly: plans.ultra.monthlyVariantId,  yearly: plans.ultra.yearlyVariantId  }
		}
	};
};
