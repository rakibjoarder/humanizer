<script lang="ts">
	type Plan = 'basic' | 'pro' | 'ultra';
	type BillingCycle = 'monthly' | 'yearly';

	interface Props {
		plan: Plan;
		highlighted?: boolean;
		billingCycle?: BillingCycle;
		onselect?: () => void;
	}

	let { plan, highlighted = false, billingCycle = 'monthly', onselect }: Props = $props();

	interface Feature {
		text: string;
		available: boolean;
	}

	interface PlanData {
		name: string;
		monthlyPrice: number;
		yearlyPrice: number;
		yearlyMonthlyEquiv: number;
		wordsPerMonth: string;
		cta: string;
		badge?: string;
		features: Feature[];
	}

	const plans: Record<Plan, PlanData> = {
		basic: {
			name: 'Basic',
			monthlyPrice: 9,
			yearlyPrice: 86.40,
			yearlyMonthlyEquiv: 7.20,
			wordsPerMonth: '4,500 words/mo',
			cta: 'Start Basic',
			features: [
				{ text: '4,500 words per month', available: true },
				{ text: 'Unlimited AI detections', available: true },
				{ text: 'AI Humanizer', available: true },
				{ text: 'History & saved results', available: true },
				{ text: 'Buy extra word packs', available: true },
				{ text: 'Email support', available: true }
			]
		},
		pro: {
			name: 'Pro',
			monthlyPrice: 19,
			yearlyPrice: 182.40,
			yearlyMonthlyEquiv: 15.20,
			wordsPerMonth: '12,000 words/mo',
			cta: 'Start Pro',
			badge: 'Most Popular',
			features: [
				{ text: '12,000 words per month', available: true },
				{ text: 'Unlimited AI detections', available: true },
				{ text: 'AI Humanizer', available: true },
				{ text: 'History & saved results', available: true },
				{ text: 'Buy extra word packs', available: true },
				{ text: 'Priority support', available: true }
			]
		},
		ultra: {
			name: 'Ultra',
			monthlyPrice: 39,
			yearlyPrice: 374.40,
			yearlyMonthlyEquiv: 31.20,
			wordsPerMonth: '35,000 words/mo',
			cta: 'Start Ultra',
			features: [
				{ text: '35,000 words per month', available: true },
				{ text: 'Unlimited AI detections', available: true },
				{ text: 'AI Humanizer', available: true },
				{ text: 'History & saved results', available: true },
				{ text: 'Buy extra word packs', available: true },
				{ text: 'Priority support', available: true }
			]
		}
	};

	const data = $derived(plans[plan]);

	const displayPrice = $derived(
		billingCycle === 'yearly' ? data.yearlyMonthlyEquiv : data.monthlyPrice
	);

	const yearlySavings = $derived(
		billingCycle === 'yearly'
			? (data.monthlyPrice * 12 - data.yearlyPrice).toFixed(0)
			: null
	);
</script>

<article
	class="pricing-card"
	class:highlighted
	aria-label="{data.name} plan"
>
	{#if data.badge}
		<div class="badge-wrapper">
			<span class="popular-badge">{data.badge}</span>
		</div>
	{/if}

	<header class="card-header">
		<h3 class="plan-name">{data.name}</h3>

		<div class="price-row">
			<span class="price-currency">$</span>
			<span class="price-amount">{displayPrice}</span>
			<span class="price-period">/mo</span>
		</div>

		{#if billingCycle === 'yearly'}
			<p class="billed-yearly">
				Billed ${data.yearlyPrice}/yr
				{#if yearlySavings}
					<span class="savings-tag">Save ${yearlySavings}</span>
				{/if}
			</p>
		{/if}

		<p class="words-label">{data.wordsPerMonth}</p>
	</header>

	<ul class="features-list" role="list">
		{#each data.features as feature}
			<li class="feature-item" class:unavailable={!feature.available}>
				<span class="feature-icon" aria-hidden="true">
					{#if feature.available}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<circle cx="8" cy="8" r="7" fill="var(--color-human-muted)" stroke="var(--color-human)" stroke-width="1"/>
							<path d="M5 8l2 2 4-4" stroke="var(--color-human)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					{:else}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<circle cx="8" cy="8" r="7" fill="var(--color-bg-border)" stroke="var(--color-bg-border)" stroke-width="1"/>
							<path d="M5.5 10.5l5-5M10.5 10.5l-5-5" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round"/>
						</svg>
					{/if}
				</span>
				<span class="feature-text">{feature.text}</span>
			</li>
		{/each}
	</ul>

	<footer class="card-footer">
		<button
			class="cta-button"
			class:cta-primary={highlighted}
			class:cta-ghost={!highlighted}
			type="button"
			onclick={onselect}
		>
			{data.cta}
		</button>
	</footer>
</article>

<style>
	.pricing-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding: 28px;
		border-radius: 16px;
		border: 1px solid var(--color-bg-border);
		background: var(--color-bg-surface);
		box-shadow: 0 4px 28px -12px rgba(0, 0, 0, 0.4);
		transition: border-color 200ms ease, box-shadow 200ms ease;
	}

	:global(html[data-theme='light']) .pricing-card {
		border-color: transparent;
		box-shadow: var(--shadow-card);
	}

	.pricing-card.highlighted {
		border-color: var(--color-brand);
		box-shadow:
			0 0 0 2px var(--color-brand),
			0 0 40px var(--color-brand-muted),
			0 8px 32px -12px rgba(0, 0, 0, 0.35);
	}

	:global(html[data-theme='light']) .pricing-card.highlighted {
		border-color: var(--color-brand);
		box-shadow:
			0 0 0 2px var(--color-brand),
			0 8px 32px -8px rgba(5, 150, 105, 0.2),
			0 2px 16px -4px rgba(15, 23, 42, 0.08);
	}

	.badge-wrapper {
		position: absolute;
		top: -13px;
		left: 50%;
		transform: translateX(-50%);
	}

	.popular-badge {
		display: inline-block;
		padding: 4px 14px;
		border-radius: 9999px;
		background: var(--color-brand);
		color: #fff;
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.card-header {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.plan-name {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.price-row {
		display: flex;
		align-items: flex-end;
		gap: 2px;
	}

	.price-currency {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 22px;
		font-weight: 500;
		color: var(--color-text-secondary);
		padding-bottom: 8px;
	}

	.price-amount {
		font-family: 'Instrument Serif', Georgia, serif;
		font-size: 56px;
		line-height: 1;
		color: var(--color-text-primary);
	}

	.price-period {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 16px;
		color: var(--color-text-muted);
		padding-bottom: 10px;
	}

	.billed-yearly {
		display: flex;
		align-items: center;
		gap: 8px;
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0;
	}

	.savings-tag {
		padding: 2px 8px;
		border-radius: 9999px;
		background: var(--color-human-muted);
		color: var(--color-human);
		font-size: 11px;
		font-weight: 600;
	}

	.words-label {
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-brand);
		margin: 0;
	}

	.features-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
		list-style: none;
		padding: 0;
		margin: 0;
		flex: 1;
	}

	.feature-item {
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 14px;
	}

	.feature-item .feature-text {
		color: var(--color-text-primary);
	}

	.feature-item.unavailable .feature-text {
		color: var(--color-text-muted);
	}

	.feature-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.card-footer {
		margin-top: auto;
	}

	.cta-button {
		width: 100%;
		padding: 12px 24px;
		border-radius: 10px;
		font-family: 'DM Sans', system-ui, sans-serif;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		transition: background 200ms ease, border-color 200ms ease, transform 100ms ease, box-shadow 200ms ease;
		border: 1px solid transparent;
	}

	.cta-button:active {
		transform: scale(0.98);
	}

	.cta-primary {
		background: var(--color-brand);
		color: #fff;
		border-color: var(--color-brand);
	}

	.cta-primary:hover {
		background: var(--color-brand-hover);
		border-color: var(--color-brand-hover);
		box-shadow: 0 0 20px var(--color-accent-glow);
	}

	.cta-ghost {
		background: transparent;
		color: var(--color-text-primary);
		border-color: var(--color-bg-border);
	}

	.cta-ghost:hover {
		border-color: var(--color-brand);
		color: var(--color-brand);
	}
</style>
