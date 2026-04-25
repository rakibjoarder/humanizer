<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';

	interface Props {
		show?: boolean;
		proMonthlyVariantId?: string;
		proYearlyVariantId?: string;
	}

	let { 
		show = true, 
		proMonthlyVariantId = '',
		proYearlyVariantId = ''
	}: Props = $props();

	let dismissed = $state(false);
	let billingCycle = $state<'monthly' | 'yearly'>('monthly');
	let checkoutLoading = $state(false);

	// Check localStorage on mount
	if (browser) {
		const stored = localStorage.getItem('promo-banner-dismissed');
		if (stored) dismissed = true;
	}

	function dismiss() {
		dismissed = true;
		if (browser) localStorage.setItem('promo-banner-dismissed', 'true');
	}

	function copyCode() {
		if (!browser) return;
		navigator.clipboard.writeText('U1MTU2OA');
		// Show brief feedback
		const btn = document.querySelector('.copy-btn');
		if (btn) {
			const orig = btn.textContent;
			btn.textContent = 'Copied!';
			setTimeout(() => { btn.textContent = orig; }, 1500);
		}
	}

	async function claimOffer() {
		const variantId = billingCycle === 'monthly' ? proMonthlyVariantId : proYearlyVariantId;
		if (!variantId) return;

		checkoutLoading = true;
		try {
			const res = await fetch('/api/lemonsqueezy/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					variantId, 
					billingCycle,
					discountCode: 'U1MTU2OA'
				})
			});

			const json = await res.json();

			if (res.status === 401) {
				// Store checkout intent in localStorage
				if (browser) {
					localStorage.setItem('pending-checkout', JSON.stringify({
						variantId,
						billingCycle,
						discountCode: 'U1MTU2OA'
					}));
				}
				goto('/?login=1');
				return;
			}

			if (!res.ok || !json.url) {
				alert(json.error ?? 'Something went wrong. Please try again.');
				checkoutLoading = false;
				return;
			}

			window.location.href = json.url;
		} catch {
			alert('Network error. Please check your connection and try again.');
			checkoutLoading = false;
		}
	}

	const visible = $derived(show && !dismissed);
</script>

{#if visible}
	<div class="promo-floater">
		<button class="promo-close" onclick={dismiss} aria-label="Dismiss" type="button">×</button>
		
		<div class="promo-content">
			<div class="promo-badge">✨ Limited Offer</div>
			<h3 class="promo-title">Get 10% Off Pro Plan</h3>
			<p class="promo-desc">Use code at checkout for your first Pro subscription</p>
			
			<!-- Billing cycle toggle -->
			<div class="billing-toggle">
				<button 
					class="billing-btn" 
					class:active={billingCycle === 'monthly'}
					onclick={() => (billingCycle = 'monthly')}
					type="button"
				>Monthly</button>
				<button 
					class="billing-btn" 
					class:active={billingCycle === 'yearly'}
					onclick={() => (billingCycle = 'yearly')}
					type="button"
				>Yearly <span class="save-badge">Save 20%</span></button>
			</div>

			<!-- Price display -->
			<div class="price-display">
				{#if billingCycle === 'monthly'}
					<div class="price-main">
						<span class="price-currency">$</span>
						<span class="price-amount">17.99</span>
						<span class="price-period">/mo</span>
					</div>
					<div class="price-original">Originally $19.99/mo</div>
				{:else}
					<div class="price-main">
						<span class="price-currency">$</span>
						<span class="price-amount">14.39</span>
						<span class="price-period">/mo</span>
					</div>
					<div class="price-detail">$172.68/year (Originally $191.88)</div>
				{/if}
			</div>

			<div class="promo-code-wrap">
				<code class="promo-code">U1MTU2OA</code>
				<button type="button" class="copy-btn" onclick={copyCode}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
					</svg>
					Copy
				</button>
			</div>

			<button class="promo-cta" onclick={claimOffer} disabled={checkoutLoading}>
				{#if checkoutLoading}
					<span class="cta-spinner"></span>
					Loading checkout…
				{:else}
					Claim Offer →
				{/if}
			</button>
		</div>
	</div>
{/if}

<style>
	@keyframes slideUp {
		from {
			transform: translateY(100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.promo-floater {
		position: fixed;
		bottom: 20px;
		right: 20px;
		z-index: 100;
		width: 280px;
		background: linear-gradient(135deg, var(--color-brand) 0%, #047857 100%);
		border-radius: 14px;
		padding: 16px;
		box-shadow: 
			0 10px 25px rgba(0, 0, 0, 0.15),
			0 4px 10px rgba(0, 0, 0, 0.1),
			0 0 0 1px rgba(255, 255, 255, 0.1) inset;
		animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.promo-close {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 28px;
		height: 28px;
		border: none;
		background: rgba(255, 255, 255, 0.15);
		color: white;
		border-radius: 6px;
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 150ms;
	}
	.promo-close:hover { background: rgba(255, 255, 255, 0.25); }

	.promo-content {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.promo-badge {
		display: inline-block;
		align-self: flex-start;
		padding: 2px 8px;
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border-radius: 99px;
		font-family: 'Space Grotesk', system-ui;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.promo-title {
		font-family: 'Newsreader', Georgia, serif;
		font-size: 19px;
		font-weight: 500;
		color: white;
		margin: 0;
		line-height: 1.2;
	}

	.promo-desc {
		font-family: 'Space Grotesk', system-ui;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.9);
		margin: 0;
		line-height: 1.3;
	}

	/* Billing toggle */
	.billing-toggle {
		display: flex;
		gap: 4px;
		padding: 3px;
		background: rgba(0, 0, 0, 0.15);
		border-radius: 7px;
	}
	.billing-btn {
		flex: 1;
		padding: 5px 8px;
		background: transparent;
		border: none;
		border-radius: 5px;
		font-family: 'Space Grotesk', system-ui;
		font-size: 11px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		transition: background 150ms, color 150ms;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
	}
	.billing-btn.active {
		background: white;
		color: var(--color-brand);
	}
	.save-badge {
		font-size: 9px;
		padding: 1px 4px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 99px;
	}
	.billing-btn.active .save-badge {
		background: var(--color-brand);
		color: white;
	}

	/* Price display */
	.price-display {
		text-align: center;
		padding: 8px 0 2px;
	}
	.price-main {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 1px;
		line-height: 1;
	}
	.price-currency {
		font-family: 'Space Grotesk', system-ui;
		font-size: 15px;
		font-weight: 700;
		color: white;
	}
	.price-amount {
		font-family: 'Newsreader', Georgia, serif;
		font-size: 30px;
		font-weight: 600;
		color: white;
	}
	.price-period {
		font-family: 'Space Grotesk', system-ui;
		font-size: 12px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.8);
	}
	.price-original, .price-detail {
		font-family: 'Space Grotesk', system-ui;
		font-size: 10px;
		color: rgba(255, 255, 255, 0.7);
		margin-top: 3px;
		text-decoration: line-through;
	}
	.price-detail {
		text-decoration: none;
	}

	.promo-code-wrap {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 10px;
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(10px);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.promo-code {
		flex: 1;
		font-family: 'JetBrains Mono', monospace;
		font-size: 14px;
		font-weight: 700;
		color: white;
		letter-spacing: 0.05em;
		background: none;
		border: none;
		padding: 0;
	}

	.copy-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		background: white;
		color: var(--color-brand);
		border: none;
		border-radius: 6px;
		font-family: 'Space Grotesk', system-ui;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		transition: transform 100ms, box-shadow 150ms;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
	.copy-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}
	.copy-btn:active { transform: translateY(0); }

	.promo-cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 10px 16px;
		background: white;
		color: var(--color-brand);
		border: none;
		border-radius: 8px;
		font-family: 'Space Grotesk', system-ui;
		font-size: 13px;
		font-weight: 700;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
		transition: transform 100ms, box-shadow 150ms, opacity 150ms;
		cursor: pointer;
	}
	.promo-cta:not(:disabled):hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
	}
	.promo-cta:active { transform: translateY(0); }
	.promo-cta:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.cta-spinner {
		width: 12px;
		height: 12px;
		border: 2px solid rgba(5, 150, 105, 0.3);
		border-top-color: var(--color-brand);
		border-radius: 50%;
		animation: spin 600ms linear infinite;
	}

	/* Mobile */
	@media (max-width: 640px) {
		.promo-floater {
			bottom: 16px;
			right: 16px;
			left: 16px;
			width: auto;
			max-width: none;
			padding: 14px;
		}
		.promo-title { font-size: 17px; }
		.promo-desc { font-size: 11px; }
		.promo-code { font-size: 13px; }
		.billing-btn { font-size: 10px; padding: 4px 6px; }
		.save-badge { font-size: 8px; padding: 1px 3px; }
		.price-currency { font-size: 14px; }
		.price-amount { font-size: 26px; }
		.price-period { font-size: 11px; }
		.promo-cta { padding: 9px 14px; font-size: 12px; }
	}
</style>
