import {
	LEMONSQUEEZY_API_KEY,
	LEMONSQUEEZY_STORE_ID,
	LEMONSQUEEZY_BASIC_MONTHLY_VARIANT_ID,
	LEMONSQUEEZY_BASIC_YEARLY_VARIANT_ID,
	LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID,
	LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID,
	LEMONSQUEEZY_ULTRA_MONTHLY_VARIANT_ID,
	LEMONSQUEEZY_ULTRA_YEARLY_VARIANT_ID,
	LEMONSQUEEZY_WORD_PACK_SMALL_VARIANT_ID,
	LEMONSQUEEZY_WORD_PACK_MEDIUM_VARIANT_ID,
	LEMONSQUEEZY_WORD_PACK_LARGE_VARIANT_ID
} from '$env/static/private';

const LS_API = 'https://api.lemonsqueezy.com/v1';

export interface PaidPlanConfig {
	monthlyVariantId: string;
	yearlyVariantId: string;
}

export interface WordPack {
	variantId: string;
	words: number;
	price: number;
	label: string;
}

export interface Plans {
	basic: PaidPlanConfig;
	pro: PaidPlanConfig;
	ultra: PaidPlanConfig;
}

export const plans: Plans = {
	basic: {
		monthlyVariantId: (LEMONSQUEEZY_BASIC_MONTHLY_VARIANT_ID ?? '').trim(),
		yearlyVariantId:  (LEMONSQUEEZY_BASIC_YEARLY_VARIANT_ID  ?? '').trim()
	},
	pro: {
		monthlyVariantId: (LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID ?? '').trim(),
		yearlyVariantId:  (LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID  ?? '').trim()
	},
	ultra: {
		monthlyVariantId: (LEMONSQUEEZY_ULTRA_MONTHLY_VARIANT_ID ?? '').trim(),
		yearlyVariantId:  (LEMONSQUEEZY_ULTRA_YEARLY_VARIANT_ID  ?? '').trim()
	}
};

export const WORDS_PER_PLAN: Record<string, number> = {
	basic: 4_500,
	pro:   12_000,
	ultra: 35_000
};

export const wordPacks: WordPack[] = [
	{ variantId: (LEMONSQUEEZY_WORD_PACK_SMALL_VARIANT_ID  ?? '').trim(), words: 2_000,  price: 4.99,  label: 'Starter' },
	{ variantId: (LEMONSQUEEZY_WORD_PACK_MEDIUM_VARIANT_ID ?? '').trim(), words: 12_000, price: 14.99, label: 'Popular' },
	{ variantId: (LEMONSQUEEZY_WORD_PACK_LARGE_VARIANT_ID  ?? '').trim(), words: 40_000, price: 34.99, label: 'Power'   }
];

export function getStoreId(): string {
	return (LEMONSQUEEZY_STORE_ID ?? '').trim();
}

export function resolvePlan(productName: string, variantName: string): 'free' | 'basic' | 'pro' | 'ultra' {
	const combined = `${productName} ${variantName}`.toLowerCase();
	if (combined.includes('ultra')) return 'ultra';
	if (combined.includes('pro'))   return 'pro';
	if (combined.includes('basic')) return 'basic';
	return 'basic';
}

export async function lsApi(path: string, options: RequestInit = {}): Promise<Response> {
	return fetch(`${LS_API}${path}`, {
		...options,
		headers: {
			Authorization: `Bearer ${LEMONSQUEEZY_API_KEY.trim()}`,
			Accept: 'application/vnd.api+json',
			'Content-Type': 'application/vnd.api+json',
			...(options.headers ?? {})
		}
	});
}
