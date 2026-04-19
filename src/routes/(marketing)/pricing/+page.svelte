<script lang="ts">
	import PricingCard from '$lib/components/PricingCard.svelte';
	import { goto } from '$app/navigation';

	type BillingCycle = 'monthly' | 'yearly';

	let billingCycle = $state<BillingCycle>('monthly');

	// Stripe price IDs — these match the plans in $lib/server/stripe.ts
	const priceIds: Record<string, Record<BillingCycle, string | null>> = {
		free: { monthly: null, yearly: null },
		pro: { monthly: 'price_pro_monthly', yearly: 'price_pro_yearly' },
		annual: { monthly: 'price_annual_monthly', yearly: 'price_annual_yearly' }
	};

	const yearlySavingsLabel: Record<string, string> = {
		pro: 'Save $45/year',
		annual: 'Save $189/year'
	};

	async function handleSelectPlan(planKey: string) {
		if (planKey === 'free') {
			goto('/register');
			return;
		}

		const priceId = priceIds[planKey]?.[billingCycle];
		if (!priceId) return;

		try {
			const res = await fetch('/api/stripe/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ priceId, billingCycle })
			});

			if (res.status === 401) {
				goto(`/login?redirect=/pricing`);
				return;
			}

			const data = await res.json();
			if (data.url) {
				window.location.href = data.url;
			}
		} catch {
			// Network error — do nothing, let the user retry
		}
	}

	const faqs = [
		{
			q: 'Can I upgrade or downgrade at any time?',
			a: 'Yes. Plan changes take effect immediately. Unused time on your current billing cycle is prorated.'
		},
		{
			q: 'What happens when I hit the free daily limit?',
			a: 'Detection is paused until midnight UTC. Humanization requires Pro or Agency — the free plan does not include it.'
		},
		{
			q: 'Is my text stored or used to train models?',
			a: 'No. Text submitted for detection or humanization is processed in memory and discarded immediately. We never store or train on your content.'
		},
		{
			q: 'Do you offer a free trial for paid plans?',
			a: 'All paid plans include a 7-day free trial. No credit card is required to start the Free plan.'
		},
		{
			q: 'What payment methods are accepted?',
			a: 'We accept all major credit and debit cards via Stripe. Promotion codes are supported at checkout.'
		},
		{
			q: 'What counts as a "word" for the daily limit?',
			a: 'A word is any whitespace-separated token. The daily counter resets at midnight UTC and covers both detection and humanization combined.'
		}
	];

	let openFaq = $state<number | null>(null);

	function toggleFaq(i: number) {
		openFaq = openFaq === i ? null : i;
	}
</script>

<!-- ── Page ─────────────────────────────────────────────────────────────── -->
<div class="pricing-page">
	<!-- Background glow -->
	<div class="bg-glow" aria-hidden="true"></div>

	<!-- ── Hero text ── -->
	<section class="hero-section">
		<h1 class="hero-title">Simple, transparent pricing</h1>
		<p class="hero-sub">Start free. Upgrade when you need more power. Cancel any time.</p>

		<!-- Billing toggle -->
		<div class="billing-toggle" role="group" aria-label="Billing cycle">
			<button
				class="toggle-btn"
				class:active={billingCycle === 'monthly'}
				onclick={() => (billingCycle = 'monthly')}
				aria-pressed={billingCycle === 'monthly'}
			>
				Monthly
			</button>
			<button
				class="toggle-btn"
				class:active={billingCycle === 'yearly'}
				onclick={() => (billingCycle = 'yearly')}
				aria-pressed={billingCycle === 'yearly'}
			>
				Yearly
				<span class="savings-chip">Up to 33% off</span>
			</button>
		</div>

		{#if billingCycle === 'yearly'}
			<p class="yearly-note">Billed annually · Cancel any time</p>
		{/if}
	</section>

	<!-- ── Pricing cards ── -->
	<section class="cards-section" aria-label="Pricing plans">
		<div class="cards-grid">
			<!-- Free -->
			<div class="card-wrapper" onclick={() => handleSelectPlan('free')} role="button" tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && handleSelectPlan('free')}>
				<PricingCard plan="free" {billingCycle} highlighted={false} />
			</div>

			<!-- Pro -->
			<div class="card-wrapper card-wrapper-highlighted" onclick={() => handleSelectPlan('pro')} role="button" tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && handleSelectPlan('pro')}>
				{#if billingCycle === 'yearly'}
					<div class="savings-banner">{yearlySavingsLabel.pro}</div>
				{/if}
				<PricingCard plan="pro" {billingCycle} highlighted={true} />
			</div>

			<!-- Agency -->
			<div class="card-wrapper" onclick={() => handleSelectPlan('annual')} role="button" tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && handleSelectPlan('annual')}>
				{#if billingCycle === 'yearly'}
					<div class="savings-banner savings-banner-annual">{yearlySavingsLabel.annual}</div>
				{/if}
				<PricingCard plan="annual" {billingCycle} highlighted={false} />
			</div>
		</div>

		<p class="footnote">
			All plans include a 7-day free trial on paid tiers. No credit card required for Free.
		</p>
	</section>

	<!-- ── Feature comparison highlights ── -->
	<section class="compare-section">
		<h2 class="compare-title">Everything included in every plan</h2>
		<div class="compare-grid">
			{#each [
				{ icon: '🔒', title: 'Privacy first', desc: 'Your text is never stored beyond the request. Zero training on your data.' },
				{ icon: '⚡', title: 'Lightning fast detection', desc: 'AI probability score in under 2 seconds for texts up to 50,000 characters.' },
				{ icon: '🌍', title: 'Multi-model coverage', desc: 'Detects outputs from GPT-4, Claude, Gemini, Llama, and more.' },
				{ icon: '📊', title: 'Detailed scoring', desc: 'Get AI probability, human probability, and a 4-tier classification badge.' }
			] as feat}
				<div class="compare-card">
					<div class="compare-icon">{feat.icon}</div>
					<h3 class="compare-card-title">{feat.title}</h3>
					<p class="compare-card-desc">{feat.desc}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- ── FAQ ── -->
	<section class="faq-section" aria-label="Frequently asked questions">
		<h2 class="faq-title">Frequently asked questions</h2>

		<div class="faq-list">
			{#each faqs as faq, i}
				<div class="faq-item">
					<button
						class="faq-question"
						onclick={() => toggleFaq(i)}
						aria-expanded={openFaq === i}
						aria-controls="faq-answer-{i}"
					>
						<span>{faq.q}</span>
						<svg
							class="faq-chevron"
							class:rotated={openFaq === i}
							width="18"
							height="18"
							viewBox="0 0 18 18"
							fill="none"
							aria-hidden="true"
						>
							<path
								d="M4.5 6.75L9 11.25L13.5 6.75"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>

					{#if openFaq === i}
						<div class="faq-answer" id="faq-answer-{i}">
							<p>{faq.a}</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<!-- ── Bottom CTA ── -->
	<section class="bottom-cta">
		<div class="bottom-cta-inner">
			<h2 class="bottom-cta-title">Ready to write like a human?</h2>
			<p class="bottom-cta-sub">
				Join thousands of writers, students, and professionals who trust HumanizeAI.
			</p>
			<a href="/register" class="bottom-cta-btn">Create your free account</a>
		</div>
	</section>

	<!-- ── Footer ── -->
	<footer class="page-footer">
		<span class="footer-copy">
			&copy; 2026 Humanize<span class="logo-accent">AI</span>. All rights reserved.
		</span>
		<div class="footer-links">
			<a href="/terms" class="footer-link">Terms</a>
			<a href="/privacy" class="footer-link">Privacy</a>
		</div>
	</footer>
</div>

<style>
	/* ── Base ── */
	.pricing-page {
		min-height: 100vh;
		background: var(--color-bg-base);
		display: flex;
		flex-direction: column;
		position: relative;
		overflow-x: hidden;
	}

	.bg-glow {
		pointer-events: none;
		position: fixed;
		inset: 0;
		background: radial-gradient(
			ellipse 70% 50% at 50% 10%,
			rgba(99, 102, 241, 0.1) 0%,
			transparent 70%
		);
		z-index: 0;
	}

	/* ── Header ── */
	.page-header {
		position: sticky;
		top: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 32px;
		background: rgba(10, 10, 15, 0.8);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--color-bg-border);
	}

	.logo {
		font-family: 'Instrument Serif', Georgia, serif;
		font-size: 20px;
		font-weight: 600;
		color: var(--color-text-primary);
		text-decoration: none;
		letter-spacing: -0.01em;
	}

	.logo-accent {
		color: var(--color-brand);
	}

	/* ── Hero ── */
	.hero-section {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 72px 24px 48px;
		gap: 20px;
	}

	.hero-title {
		font-family: 'Instrument Serif', Georgia, serif;
		font-size: clamp(2rem, 5vw, 3.5rem);
		font-weight: 400;
		color: var(--color-text-primary);
		margin: 0;
		line-height: 1.1;
	}

	.hero-sub {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 18px;
		color: var(--color-text-secondary);
		margin: 0;
		max-width: 480px;
		line-height: 1.6;
	}

	/* ── Billing toggle ── */
	.billing-toggle {
		display: inline-flex;
		padding: 4px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-bg-border);
		border-radius: 12px;
		gap: 4px;
	}

	.toggle-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 9px 20px;
		border-radius: 9px;
		border: none;
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-secondary);
		background: transparent;
		cursor: pointer;
		transition: background 200ms ease, color 200ms ease;
	}

	.toggle-btn.active {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.savings-chip {
		font-size: 11px;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 99px;
		background: var(--color-human-muted);
		color: var(--color-human);
		border: 1px solid var(--color-human);
	}

	.yearly-note {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0;
	}

	/* ── Cards ── */
	.cards-section {
		position: relative;
		z-index: 1;
		padding: 0 24px 64px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
	}

	.cards-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
		max-width: 1000px;
		width: 100%;
	}

	@media (max-width: 768px) {
		.cards-grid {
			grid-template-columns: 1fr;
			max-width: 420px;
		}
	}

	.card-wrapper {
		position: relative;
		cursor: pointer;
		border-radius: 18px;
		transition: transform 200ms ease;
	}

	.card-wrapper:hover {
		transform: translateY(-3px);
	}

	.card-wrapper-highlighted {
		margin-top: -12px;
	}

	.savings-banner {
		position: absolute;
		top: -12px;
		right: 16px;
		z-index: 2;
		padding: 4px 10px;
		background: var(--color-human);
		color: var(--color-bg-base);
		border-radius: 99px;
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.04em;
	}

	.savings-banner-annual {
		background: var(--color-brand);
		color: white;
	}

	.footnote {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-text-muted);
		text-align: center;
		margin: 0;
	}

	/* ── Feature comparison ── */
	.compare-section {
		position: relative;
		z-index: 1;
		padding: 64px 24px;
		background: var(--color-bg-surface);
		border-top: 1px solid var(--color-bg-border);
		border-bottom: 1px solid var(--color-bg-border);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 40px;
	}

	.compare-title {
		font-family: 'Instrument Serif', Georgia, serif;
		font-size: 28px;
		font-weight: 400;
		color: var(--color-text-primary);
		margin: 0;
		text-align: center;
	}

	.compare-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 20px;
		max-width: 1000px;
		width: 100%;
	}

	@media (max-width: 768px) {
		.compare-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 480px) {
		.compare-grid {
			grid-template-columns: 1fr;
		}
	}

	.compare-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 20px;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-bg-border);
		border-radius: 12px;
	}

	.compare-icon {
		font-size: 24px;
		line-height: 1;
	}

	.compare-card-title {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.compare-card-desc {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.6;
	}

	/* ── FAQ ── */
	.faq-section {
		position: relative;
		z-index: 1;
		padding: 72px 24px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 40px;
	}

	.faq-title {
		font-family: 'Instrument Serif', Georgia, serif;
		font-size: 28px;
		font-weight: 400;
		color: var(--color-text-primary);
		margin: 0;
		text-align: center;
	}

	.faq-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		max-width: 720px;
		width: 100%;
		border: 1px solid var(--color-bg-border);
		border-radius: 14px;
		overflow: hidden;
	}

	.faq-item {
		border-bottom: 1px solid var(--color-bg-border);
	}

	.faq-item:last-child {
		border-bottom: none;
	}

	.faq-question {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 18px 24px;
		background: var(--color-bg-surface);
		border: none;
		cursor: pointer;
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 15px;
		font-weight: 500;
		color: var(--color-text-primary);
		text-align: left;
		transition: background 150ms ease;
	}

	.faq-question:hover {
		background: var(--color-bg-elevated);
	}

	.faq-chevron {
		flex-shrink: 0;
		color: var(--color-text-muted);
		transition: transform 200ms ease;
	}

	.faq-chevron.rotated {
		transform: rotate(180deg);
	}

	.faq-answer {
		padding: 0 24px 18px;
		background: var(--color-bg-surface);
	}

	.faq-answer p {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 14px;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.7;
	}

	/* ── Bottom CTA ── */
	.bottom-cta {
		position: relative;
		z-index: 1;
		padding: 64px 24px;
		background: var(--color-bg-surface);
		border-top: 1px solid var(--color-bg-border);
		display: flex;
		justify-content: center;
	}

	.bottom-cta-inner {
		max-width: 560px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 20px;
	}

	.bottom-cta-title {
		font-family: 'Instrument Serif', Georgia, serif;
		font-size: 32px;
		font-weight: 400;
		color: var(--color-text-primary);
		margin: 0;
	}

	.bottom-cta-sub {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 15px;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.6;
	}

	.bottom-cta-btn {
		display: inline-block;
		padding: 14px 32px;
		background: var(--color-brand);
		color: white;
		border-radius: 12px;
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 15px;
		font-weight: 600;
		text-decoration: none;
		transition: background 200ms ease;
		box-shadow: 0 0 28px rgba(99, 102, 241, 0.3);
	}

	.bottom-cta-btn:hover {
		background: var(--color-brand-hover);
	}

	/* ── Footer ── */
	.page-footer {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24px 32px;
		border-top: 1px solid var(--color-bg-border);
		background: var(--color-bg-base);
	}

	.footer-copy {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.footer-links {
		display: flex;
		gap: 24px;
	}

	.footer-link {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-text-muted);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.footer-link:hover {
		color: var(--color-text-secondary);
	}
</style>
