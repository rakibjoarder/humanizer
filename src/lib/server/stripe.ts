import {
	STRIPE_SECRET_KEY,
	STRIPE_PRO_MONTHLY_PRICE_ID,
	STRIPE_PRO_YEARLY_PRICE_ID,
	STRIPE_TOKEN_PACK_STARTER_PRICE_ID,
	STRIPE_TOKEN_PACK_POPULAR_PRICE_ID,
	STRIPE_TOKEN_PACK_POWER_PRICE_ID
} from '$env/static/private';
import Stripe from 'stripe';

// ── Stripe client ─────────────────────────────────────────────────────────────

export const stripe = new Stripe(STRIPE_SECRET_KEY.trim(), {
	apiVersion: '2025-02-24.acacia'
});

// ── Plan configuration ────────────────────────────────────────────────────────

export interface FreePlanConfig {
	price: 0;
}

export interface PaidPlanConfig {
	monthlyPriceId: string;
	yearlyPriceId: string;
}

export interface TokenPack {
	priceId: string;
	tokens: number;
	price: number;
	label: string;
}

export interface Plans {
	free: FreePlanConfig;
	pro: PaidPlanConfig;
}

export const plans: Plans = {
	free: {
		price: 0
	},
	pro: {
		monthlyPriceId: STRIPE_PRO_MONTHLY_PRICE_ID.trim(),
		yearlyPriceId: STRIPE_PRO_YEARLY_PRICE_ID.trim()
	}
};

export const PRO_TOKENS_PER_MONTH = 100;

export const tokenPacks: TokenPack[] = [
	{ priceId: STRIPE_TOKEN_PACK_STARTER_PRICE_ID.trim(), tokens: 50,  price: 2.99,  label: 'Starter' },
	{ priceId: STRIPE_TOKEN_PACK_POPULAR_PRICE_ID.trim(), tokens: 150, price: 7.99,  label: 'Popular' },
	{ priceId: STRIPE_TOKEN_PACK_POWER_PRICE_ID.trim(),   tokens: 500, price: 19.99, label: 'Power'   }
];
