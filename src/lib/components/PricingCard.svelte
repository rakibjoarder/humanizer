<script lang="ts">
	type Plan = 'free' | 'pro' | 'annual';
	type BillingCycle = 'monthly' | 'yearly';

	interface Props {
		plan: Plan;
		highlighted?: boolean;
		billingCycle?: BillingCycle;
	}

	let { plan, highlighted = false, billingCycle = 'monthly' }: Props = $props();

	interface Feature {
		text: string;
		available: boolean;
	}

	interface PlanData {
		name: string;
		monthlyPrice: number;
		yearlyPrice: number;
		yearlyMonthlyEquiv: number;
		wordsPerDay: string;
		cta: string;
		badge?: string;
		features: Feature[];
	}

	const plans: Record<Plan, PlanData> = {
		free: {
			name: 'Free',
			monthlyPrice: 0,
			yearlyPrice: 0,
			yearlyMonthlyEquiv: 0,
			wordsPerDay: '500 words/day',
			cta: 'Get Started Free',
			features: [
				{ text: '500 words per day', available: true },
				{ text: 'AI Detection', available: true },
				{ text: 'Humanizer', available: false },
				{ text: 'History & saved results', available: false },
				{ text: 'Email support', available: true },
				{ text: 'Priority support', available: false },
				{ text: 'API access', available: false }
			]
		},
		pro: {
			name: 'Pro',
			monthlyPrice: 12,
			yearlyPrice: 99,
			yearlyMonthlyEquiv: 8,
			wordsPerDay: 'Unlimited',
			cta: 'Start Pro',
			badge: 'Most Popular',
			features: [
				{ text: 'Unlimited words', available: true },
				{ text: 'AI Detection', available: true },
				{ text: 'Humanizer', available: true },
				{ text: 'History & saved results', available: true },
				{ text: 'Priority email support', available: true },
				{ text: 'Priority support', available: true },
				{ text: 'API access', available: false }
			]
		},
		annual: {
			name: 'Annual',
			monthlyPrice: 0,
			yearlyPrice: 79,
			yearlyMonthlyEquiv: 7,
			wordsPerDay: 'Unlimited',
			cta: 'Get Annual Plan',
			badge: 'Best Value',
			features: [
				{ text: 'Unlimited words', available: true },
				{ text: 'AI Detection', available: true },
				{ text: 'Humanizer', available: true },
				{ text: 'History & saved results', available: true },
				{ text: 'Priority email support', available: true },
				{ text: 'Priority support', available: true },
				{ text: 'API access', available: true }
			]
		}
	};

	const data = $derived(plans[plan]);

	const displayPrice = $derived(
		plan === 'annual' ? data.yearlyMonthlyEquiv :
		data.monthlyPrice === 0 ? 0 :
		billingCycle === 'yearly' ? data.yearlyMonthlyEquiv : data.monthlyPrice
	);

	const yearlySavings = $derived(
		billingCycle === 'yearly' && data.monthlyPrice > 0
			? Math.max(0, data.monthlyPrice * 12 - data.yearlyPrice) || null
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

		{#if (billingCycle === 'yearly' || plan === 'annual') && data.yearlyPrice > 0}
			<p class="billed-yearly">
				Billed ${data.yearlyPrice}/yr{plan === 'annual' ? ' · Annual only' : ''}
				{#if yearlySavings}
					<span class="savings-tag">Save ${yearlySavings}</span>
				{/if}
			</p>
		{/if}
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
			class:cta-primary={highlighted || plan === 'free'}
			class:cta-ghost={!highlighted && plan !== 'free'}
			type="button"
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
		box-shadow:
			inset 0 1px 0 0 var(--color-bg-border-hi),
			0 4px 24px -8px rgba(15, 23, 42, 0.1);
	}

	.pricing-card.highlighted {
		border-color: var(--color-brand);
		box-shadow:
			0 0 0 1px var(--color-brand),
			0 0 40px var(--color-brand-muted),
			0 8px 32px -12px rgba(0, 0, 0, 0.35);
	}

	:global(html[data-theme='light']) .pricing-card.highlighted {
		box-shadow:
			0 0 0 1px var(--color-brand),
			0 0 36px var(--color-brand-muted),
			inset 0 1px 0 0 var(--color-bg-border-hi),
			0 8px 28px -10px rgba(15, 23, 42, 0.12);
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
		gap: 8px;
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
