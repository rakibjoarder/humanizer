<script lang="ts">
	import PricingCard from '$lib/components/PricingCard.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { goto } from '$app/navigation';

	type BillingCycle = 'monthly' | 'yearly';
	type PlanKey = 'basic' | 'pro' | 'ultra';

	let { data } = $props();

	let billingCycle = $state<BillingCycle>('monthly');
	let checkoutLoading = $state<PlanKey | null>(null);
	let checkoutError = $state('');

	const yearlySavingsLabel: Record<PlanKey, string> = {
		basic: 'Save $32.89/year',
		pro: 'Save $56.89/year',
		ultra: 'Save $104.89/year'
	};

	async function handleSelectPlan(planKey: PlanKey) {
		const variantId =
			billingCycle === 'monthly'
				? data.variantIds?.[planKey]?.monthly
				: data.variantIds?.[planKey]?.yearly;

		if (!variantId) return;

		checkoutError = '';
		checkoutLoading = planKey;

		try {
			const res = await fetch('/api/lemonsqueezy/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ variantId, billingCycle })
			});

			const json = await res.json();

			if (res.status === 401) {
				goto('/?login=1&redirect=/pricing');
				return;
			}

			if (!res.ok || !json.url) {
				checkoutError = json.error ?? 'Something went wrong. Please try again.';
				return;
			}

			window.location.href = json.url;
		} catch {
			checkoutError = 'Network error. Please check your connection and try again.';
		} finally {
			checkoutLoading = null;
		}
	}

	const faqs = [
		{
			q: 'Can I upgrade or downgrade at any time?',
			a: 'Yes. Plan changes take effect immediately. Unused time on your current billing cycle is prorated.'
		},
		{
			q: 'What are words and how are they counted?',
			a: 'Each word you humanize counts against your monthly word balance. The word count of the humanized output is deducted. Your balance resets on each billing cycle date.'
		},
		{
			q: 'What happens when I run out of words?',
			a: 'Humanization is paused until your balance resets at the next billing cycle. You can also top up instantly by purchasing a word pack from your settings.'
		},
		{
			q: 'How many words does the Ultra plan include?',
			a: 'Ultra gives you 35,000 words per month — the highest allocation across all plans. You can also top up with word packs at any time.'
		},
		{
			q: 'Is my text stored or used to train models?',
			a: 'No. Text submitted for detection or humanization is processed in memory and discarded immediately. We never store or train on your content.'
		},
		{
			q: 'Do you offer a free trial?',
			a: 'We don’t currently offer a free trial. You can start on Free and upgrade any time.'
		},
		{
			q: 'What payment methods are accepted?',
			a: 'We accept all major credit and debit cards via Stripe. Promotion codes are supported at checkout.'
		}
	];

	let openFaq = $state<number | null>(null);

	function toggleFaq(i: number) {
		openFaq = openFaq === i ? null : i;
	}
</script>

<SEO
	title="Pricing — AI Humanizer Plans | HumanizeAIWrite"
	description="Humanize AI-generated text. Basic 4,500 words/mo from $9.99, Pro 12,000 words/mo from $19.99, Ultra 35,000 words/mo from $39.99. Bypass GPTZero, Turnitin, and more."
	canonical="https://humanizeaiwrite.com/pricing"
/>

<div class="pricing-page">
	<div class="bg-glow" aria-hidden="true"></div>

	<!-- ── Hero text ── -->
	<section class="hero-section">
		<h1 class="hero-title">Simple, transparent pricing</h1>
		<p class="hero-sub">Pay per word, not per click. Upgrade or cancel any time.</p>

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
				<span class="savings-chip">Save 20%</span>
			</button>
		</div>

		{#if billingCycle === 'yearly'}
			<p class="yearly-note">Billed annually · Cancel any time</p>
		{/if}
	</section>

	<!-- ── Pricing cards ── -->
	<section class="cards-section" aria-label="Pricing plans">
		<div class="cards-grid">
			<!-- Basic -->
			<div class="card-wrapper" class:loading={checkoutLoading === 'basic'}>
				{#if billingCycle === 'yearly'}
					<div class="savings-banner">{yearlySavingsLabel.basic}</div>
				{/if}
				<PricingCard plan="basic" {billingCycle} highlighted={false} onselect={() => checkoutLoading === null && handleSelectPlan('basic')} />
			</div>

			<!-- Pro (highlighted) -->
			<div class="card-wrapper card-wrapper-highlighted" class:loading={checkoutLoading === 'pro'}>
				{#if billingCycle === 'yearly'}
					<div class="savings-banner">{yearlySavingsLabel.pro}</div>
				{/if}
				<PricingCard plan="pro" {billingCycle} highlighted={true} onselect={() => checkoutLoading === null && handleSelectPlan('pro')} />
			</div>

			<!-- Ultra -->
			<div class="card-wrapper" class:loading={checkoutLoading === 'ultra'}>
				{#if billingCycle === 'yearly'}
					<div class="savings-banner">{yearlySavingsLabel.ultra}</div>
				{/if}
				<PricingCard plan="ultra" {billingCycle} highlighted={false} onselect={() => checkoutLoading === null && handleSelectPlan('ultra')} />
			</div>
		</div>

		{#if checkoutError}
			<p class="checkout-error">{checkoutError}</p>
		{/if}

		<p class="footnote">
			Cancel anytime.
		</p>
	</section>

	<!-- ── Feature comparison ── -->
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

	<!-- ── Plan comparison table ── -->
	<section class="table-section">
		<h2 class="compare-title">Compare plans</h2>
		<div class="plan-table-wrap">
			<table class="plan-table">
				<thead>
					<tr>
						<th class="feature-col">Feature</th>
						<th>Basic</th>
						<th class="highlighted-col">Pro</th>
						<th>Ultra</th>
					</tr>
				</thead>
				<tbody>
					{#each [
						['Monthly price', '$9.99', '$19.99', '$39.99'],
						['Yearly price', '$86.99/yr', '$182.99/yr', '$374.99/yr'],
						['Words per month', '4,500', '12,000', '35,000'],
						['AI Detection', '✓', '✓', '✓'],
						['AI Humanizer', '✓', '✓', '✓'],
						['Word top-up packs', '✓', '✓', '✓'],
						['History & saved results', '✓', '✓', '✓'],
						['Support', 'Email', 'Priority', 'Priority'],
					] as row}
						<tr>
							{#each row as cell, i}
								<td class:feature-col={i === 0} class:highlighted-col={i === 2}>{cell}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
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
			<h2 class="bottom-cta-title">Ready to humanize what AI writes?</h2>
			<p class="bottom-cta-sub">
				Join thousands of writers, students, and professionals who trust HumanizeAIWrite.
			</p>
			<a href="/register" class="bottom-cta-btn">Get started today</a>
		</div>
	</section>
</div>

<style>
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
			rgba(16, 185, 129, 0.08) 0%,
			transparent 70%
		);
		z-index: 0;
	}

	:global(html[data-theme='light']) .pricing-page .bg-glow {
		background: radial-gradient(
			ellipse 70% 50% at 50% 8%,
			rgba(5, 150, 105, 0.06) 0%,
			transparent 72%
		);
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
		max-width: 960px;
		width: 100%;
	}

	@media (max-width: 900px) {
		.cards-grid {
			grid-template-columns: 1fr;
			max-width: 420px;
		}
	}

	.card-wrapper {
		position: relative;
		cursor: pointer;
		border-radius: 18px;
		transition: transform 200ms ease, opacity 200ms ease;
	}

	.card-wrapper:hover {
		transform: translateY(-3px);
	}

	.card-wrapper.loading {
		opacity: 0.6;
		cursor: wait;
		pointer-events: none;
	}

	.checkout-error {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 13px;
		color: #ef4444;
		text-align: center;
		margin: 0;
	}

	.card-wrapper-highlighted {
		padding-top: 16px;
	}

	.savings-banner {
		position: absolute;
		top: -12px;
		right: 16px;
		z-index: 2;
		padding: 4px 10px;
		background: var(--color-human);
		color: #fff;
		border-radius: 99px;
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.04em;
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
		border-bottom: 1px solid var(--color-divider);
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
		.compare-grid { grid-template-columns: repeat(2, 1fr); }
	}

	@media (max-width: 480px) {
		.compare-grid { grid-template-columns: 1fr; }
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

	.compare-icon { font-size: 24px; line-height: 1; }

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

	/* ── Plan table ── */
	.table-section {
		position: relative;
		z-index: 1;
		padding: 64px 24px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 32px;
	}

	.plan-table-wrap {
		width: 100%;
		max-width: 720px;
		overflow-x: auto;
		border: 1px solid var(--color-bg-border);
		border-radius: 14px;
	}

	.plan-table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 14px;
	}

	.plan-table th {
		padding: 14px 20px;
		text-align: center;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-secondary);
		background: var(--color-bg-elevated);
		border-bottom: 1px solid var(--color-bg-border);
	}

	.plan-table th.feature-col {
		text-align: left;
	}

	.plan-table th.highlighted-col,
	.plan-table td.highlighted-col {
		background: var(--color-brand-muted);
		color: var(--color-brand);
	}

	.plan-table td {
		padding: 12px 20px;
		text-align: center;
		color: var(--color-text-primary);
		border-bottom: 1px solid var(--color-divider);
	}

	.plan-table tr:last-child td {
		border-bottom: none;
	}

	.plan-table td.feature-col {
		text-align: left;
		color: var(--color-text-secondary);
		font-weight: 500;
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
		background: var(--color-bg-surface);
		border-top: 1px solid var(--color-bg-border);
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
		border-bottom: 1px solid var(--color-divider);
	}

	.faq-item:last-child { border-bottom: none; }

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

	.faq-question:hover { background: var(--color-bg-elevated); }

	.faq-chevron {
		flex-shrink: 0;
		color: var(--color-text-muted);
		transition: transform 200ms ease;
	}

	.faq-chevron.rotated { transform: rotate(180deg); }

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
		box-shadow: 0 0 28px rgba(16, 185, 129, 0.3);
	}

	.bottom-cta-btn:hover { background: var(--color-brand-hover); }
</style>
