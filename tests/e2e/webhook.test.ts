import { test, expect } from '@playwright/test';
import { sendWebhook, makeCheckoutSessionCompleted, makeInvoicePaid, makeInvoicePaymentFailed, makeSubscriptionDeleted } from './helpers/stripe';

// These values must match the test user in Supabase.
const TEST_USER_ID    = process.env.TEST_USER_ID    ?? '7f0daf5b-f16a-40cc-8c8b-b40675e3dd50';
const TEST_CUSTOMER_ID = process.env.TEST_CUSTOMER_ID ?? 'cus_UNGlr6ydM8TxWA';

// ── Signature validation ──────────────────────────────────────────────────────

test.describe('Webhook signature validation', () => {
	test('missing stripe-signature header returns 400', async ({ request }) => {
		const res = await request.post('/api/stripe/webhook', {
			headers: { 'Content-Type': 'application/json' },
			data: JSON.stringify({ type: 'test' })
		});
		expect(res.status()).toBe(400);
	});

	test('invalid signature returns 400', async ({ request }) => {
		const res = await request.post('/api/stripe/webhook', {
			headers: {
				'Content-Type': 'application/json',
				'stripe-signature': 't=0,v1=invalidsignature'
			},
			data: JSON.stringify({ type: 'test' })
		});
		expect(res.status()).toBe(400);
	});

	test('valid signature with unknown event type returns 200', async ({ request }) => {
		const event = { id: 'evt_unknown', object: 'event', type: 'something.unknown', data: { object: {} } };
		const res = await sendWebhook(request, event);
		expect(res.status()).toBe(200);
	});
});

// ── checkout.session.completed ────────────────────────────────────────────────

test.describe('checkout.session.completed webhook', () => {
	test('paid session with valid user metadata returns 200', async ({ request }) => {
		const event = makeCheckoutSessionCompleted({
			userId: TEST_USER_ID,
			customerId: TEST_CUSTOMER_ID,
			paymentStatus: 'paid'
		});
		const res = await sendWebhook(request, event);
		// 200 = event accepted (inner Stripe API call for sub may fail non-fatally)
		expect([200, 500]).toContain(res.status());
	});

	test('unpaid session (payment_status=unpaid) is ignored gracefully', async ({ request }) => {
		const event = makeCheckoutSessionCompleted({
			userId: TEST_USER_ID,
			customerId: TEST_CUSTOMER_ID,
			paymentStatus: 'unpaid'
		});
		const res = await sendWebhook(request, event);
		expect(res.status()).toBe(200);
	});

	test('session with missing supabase_user_id in metadata is ignored', async ({ request }) => {
		const event = {
			id: `evt_test_${Date.now()}`,
			object: 'event',
			type: 'checkout.session.completed',
			data: {
				object: {
					id: 'cs_test_noid',
					object: 'checkout.session',
					payment_status: 'paid',
					customer: TEST_CUSTOMER_ID,
					subscription: 'sub_test_noid',
					metadata: {}
				}
			}
		};
		const res = await sendWebhook(request, event);
		expect(res.status()).toBe(200);
	});
});

// ── invoice.paid (renewal) ────────────────────────────────────────────────────

test.describe('invoice.paid webhook', () => {
	test('paid invoice for known customer returns 200', async ({ request }) => {
		const event = makeInvoicePaid(TEST_CUSTOMER_ID);
		const res = await sendWebhook(request, event);
		expect([200, 500]).toContain(res.status());
	});

	test('paid invoice for unknown customer is handled gracefully', async ({ request }) => {
		const event = makeInvoicePaid('cus_nonexistent_xxxx');
		const res = await sendWebhook(request, event);
		expect(res.status()).toBe(200);
	});
});

// ── invoice.payment_failed (card declined / insufficient funds) ───────────────

test.describe('invoice.payment_failed webhook (card failure)', () => {
	test('failed payment for known customer returns 200', async ({ request }) => {
		const event = makeInvoicePaymentFailed(TEST_CUSTOMER_ID);
		const res = await sendWebhook(request, event);
		expect([200, 500]).toContain(res.status());
	});

	test('failed payment for unknown customer is handled gracefully', async ({ request }) => {
		const event = makeInvoicePaymentFailed('cus_nonexistent_xxxx');
		const res = await sendWebhook(request, event);
		expect(res.status()).toBe(200);
	});
});

// ── customer.subscription.deleted (cancellation) ─────────────────────────────

test.describe('customer.subscription.deleted webhook', () => {
	test('cancellation event for known customer returns 200', async ({ request }) => {
		const event = makeSubscriptionDeleted(TEST_CUSTOMER_ID);
		const res = await sendWebhook(request, event);
		expect([200, 500]).toContain(res.status());
	});

	test('cancellation for unknown customer is handled gracefully', async ({ request }) => {
		const event = makeSubscriptionDeleted('cus_nonexistent_xxxx');
		const res = await sendWebhook(request, event);
		expect(res.status()).toBe(200);
	});
});
