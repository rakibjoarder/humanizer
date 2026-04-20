import {
	STRIPE_SECRET_KEY,
	STRIPE_BASIC_MONTHLY_PRICE_ID,
	STRIPE_BASIC_YEARLY_PRICE_ID,
	STRIPE_PRO_MONTHLY_PRICE_ID,
	STRIPE_PRO_YEARLY_PRICE_ID,
	STRIPE_ULTRA_MONTHLY_PRICE_ID,
	STRIPE_ULTRA_YEARLY_PRICE_ID,
	STRIPE_WORD_PACK_SMALL_PRICE_ID,
	STRIPE_WORD_PACK_MEDIUM_PRICE_ID,
	STRIPE_WORD_PACK_LARGE_PRICE_ID
} from '$env/static/private';
import Stripe from 'stripe';

// ── Stripe client ─────────────────────────────────────────────────────────────

export const stripe = new Stripe(STRIPE_SECRET_KEY.trim(), {
	apiVersion: '2025-02-24.acacia'
});

// ── Plan configuration ────────────────────────────────────────────────────────

export interface PaidPlanConfig {
	monthlyPriceId: string;
	yearlyPriceId: string;
}

export interface WordPack {
	priceId: string;
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
		monthlyPriceId: (STRIPE_BASIC_MONTHLY_PRICE_ID ?? '').trim(),
		yearlyPriceId: (STRIPE_BASIC_YEARLY_PRICE_ID ?? '').trim()
	},
	pro: {
		monthlyPriceId: (STRIPE_PRO_MONTHLY_PRICE_ID ?? '').trim(),
		yearlyPriceId: (STRIPE_PRO_YEARLY_PRICE_ID ?? '').trim()
	},
	ultra: {
		monthlyPriceId: (STRIPE_ULTRA_MONTHLY_PRICE_ID ?? '').trim(),
		yearlyPriceId: (STRIPE_ULTRA_YEARLY_PRICE_ID ?? '').trim()
	}
};

/** Words granted per plan per billing cycle. */
export const WORDS_PER_PLAN: Record<string, number> = {
	basic: 4_500,
	pro: 12_000,
	ultra: 35_000
};

export const wordPacks: WordPack[] = [
	{ priceId: (STRIPE_WORD_PACK_SMALL_PRICE_ID ?? '').trim(),  words: 2_000,  price: 4.99,  label: 'Starter' },
	{ priceId: (STRIPE_WORD_PACK_MEDIUM_PRICE_ID ?? '').trim(), words: 12_000, price: 14.99, label: 'Popular' },
	{ priceId: (STRIPE_WORD_PACK_LARGE_PRICE_ID ?? '').trim(),  words: 40_000, price: 34.99, label: 'Power'   }
];
