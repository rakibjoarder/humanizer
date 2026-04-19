import type { PageServerLoad } from './$types';
import { STRIPE_PRO_MONTHLY_PRICE_ID, STRIPE_PRO_YEARLY_PRICE_ID } from '$env/static/private';

export const load: PageServerLoad = async () => {
	return {
		priceIds: {
			pro: {
				monthly: STRIPE_PRO_MONTHLY_PRICE_ID,
				yearly: STRIPE_PRO_YEARLY_PRICE_ID
			}
		}
	};
};
