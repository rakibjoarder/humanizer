import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

/** Generate a valid Stripe-Signature header for a given payload string. */
export function stripeSignature(payload: string, secret = WEBHOOK_SECRET): string {
	const timestamp = Math.floor(Date.now() / 1000);
	const signed = `${timestamp}.${payload}`;
	const sig = crypto.createHmac('sha256', secret).update(signed).digest('hex');
	return `t=${timestamp},v1=${sig}`;
}

/** Send a signed Stripe webhook event to the local server. */
export async function sendWebhook(
	request: import('@playwright/test').APIRequestContext,
	event: object,
	secret = WEBHOOK_SECRET
) {
	const payload = JSON.stringify(event);
	const signature = stripeSignature(payload, secret);
	return request.post('/api/stripe/webhook', {
		headers: {
			'Content-Type': 'application/json',
			'stripe-signature': signature
		},
		data: payload
	});
}

// ── Stripe test cards ─────────────────────────────────────────────────────────
export const TEST_CARDS = {
	success:        '4242424242424242', // always succeeds
	declined:       '4000000000000002', // always declined
	insufficientFunds: '4000000000009995',
	requiresAuth:   '4000002500003155'  // 3D Secure
} as const;

// ── Fake Stripe event factories ───────────────────────────────────────────────

export function makeCheckoutSessionCompleted(overrides: {
	userId: string;
	customerId: string;
	subscriptionId?: string;
	paymentStatus?: string;
}) {
	return {
		id: `evt_test_${Date.now()}`,
		object: 'event',
		type: 'checkout.session.completed',
		data: {
			object: {
				id: `cs_test_${Date.now()}`,
				object: 'checkout.session',
				payment_status: overrides.paymentStatus ?? 'paid',
				customer: overrides.customerId,
				subscription: overrides.subscriptionId ?? `sub_test_${Date.now()}`,
				metadata: { supabase_user_id: overrides.userId }
			}
		}
	};
}

export function makeInvoicePaid(customerId: string) {
	return {
		id: `evt_test_${Date.now()}`,
		object: 'event',
		type: 'invoice.paid',
		data: {
			object: {
				id: `in_test_${Date.now()}`,
				object: 'invoice',
				customer: customerId,
				status: 'paid',
				amount_paid: 1900,
				currency: 'usd',
				billing_reason: 'subscription_cycle',
				lines: { data: [{ price: { product: { name: 'Pro' } } }] }
			}
		}
	};
}

export function makeInvoicePaymentFailed(customerId: string) {
	return {
		id: `evt_test_${Date.now()}`,
		object: 'event',
		type: 'invoice.payment_failed',
		data: {
			object: {
				id: `in_test_${Date.now()}`,
				object: 'invoice',
				customer: customerId,
				status: 'open',
				amount_due: 1900,
				currency: 'usd'
			}
		}
	};
}

export function makeSubscriptionDeleted(customerId: string) {
	return {
		id: `evt_test_${Date.now()}`,
		object: 'event',
		type: 'customer.subscription.deleted',
		data: {
			object: {
				id: `sub_test_${Date.now()}`,
				object: 'subscription',
				customer: customerId,
				status: 'canceled',
				items: { data: [{ price: { product: { name: 'Pro' } } }] }
			}
		}
	};
}
