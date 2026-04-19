import { STRIPE_SECRET_KEY } from '$env/static/private';
import Stripe from 'stripe';

// ── Stripe client ─────────────────────────────────────────────────────────────

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
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
	annual: PaidPlanConfig;
}

export const plans: Plans = {
	free: {
		price: 0
	},
	pro: {
		monthlyPriceId: 'price_pro_monthly',
		yearlyPriceId: 'price_pro_yearly'
	},
	annual: {
		monthlyPriceId: 'price_annual_monthly',
		yearlyPriceId: 'price_annual_yearly'
	}
};
