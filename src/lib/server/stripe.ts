import {
	STRIPE_SECRET_KEY,
	STRIPE_PRO_MONTHLY_PRICE_ID,
	STRIPE_PRO_YEARLY_PRICE_ID
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

export interface Plans {
	free: FreePlanConfig;
	pro: PaidPlanConfig;
}

export const plans: Plans = {
	free: {
		price: 0
	},
	pro: {
		monthlyPriceId: STRIPE_PRO_MONTHLY_PRICE_ID,
		yearlyPriceId: STRIPE_PRO_YEARLY_PRICE_ID
	}
};
