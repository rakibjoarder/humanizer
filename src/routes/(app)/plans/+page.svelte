<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import PricingCard from '$lib/components/PricingCard.svelte';

	type BillingCycle = 'monthly' | 'yearly';
	type PlanKey = 'basic' | 'pro' | 'ultra';

	let { data } = $props();

	const isPaid = $derived(
		data.profile?.plan === 'basic' || data.profile?.plan === 'pro' || data.profile?.plan === 'ultra'
	);
	const planLabel = $derived(
		data.profile?.plan === 'ultra' ? 'Ultra' :
		data.profile?.plan === 'pro' ? 'Pro' :
		data.profile?.plan === 'basic' ? 'Basic' : 'Free'
	);

	let billingCycle = $state<BillingCycle>('monthly');
	let checkoutLoading = $state<PlanKey | null>(null);
	let checkoutError = $state('');

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

			// Subscription existed but profile was out of sync — server fixed it, reload.
			if (res.ok && json.synced) {
				await invalidate('supabase:auth');
				goto('/settings');
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
</script>

<div style="max-width: 900px; margin: 0 auto;">
	<!-- Header -->
	<div style="text-align: center; margin-bottom: 36px;">
		<h1 style="font-family: 'Instrument Serif', Georgia, serif; font-size: clamp(26px, 4vw, 36px); font-weight: 400; color: var(--color-text-primary); margin: 0 0 10px;">
			Choose your plan
		</h1>
		<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-muted); margin: 0 0 24px;">
			Humanize AI text and bypass detectors. Cancel any time.
		</p>

		<!-- Billing toggle -->
		<div style="display: inline-flex; align-items: center; gap: 0; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); border-radius: 10px; padding: 3px;">
			<button
				onclick={() => (billingCycle = 'monthly')}
				style="
					padding: 7px 18px;
					border-radius: 8px;
					border: none;
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 13px;
					font-weight: 600;
					cursor: pointer;
					transition: all 150ms;
					background: {billingCycle === 'monthly' ? 'var(--color-bg-surface)' : 'transparent'};
					color: {billingCycle === 'monthly' ? 'var(--color-text-primary)' : 'var(--color-text-muted)'};
					box-shadow: {billingCycle === 'monthly' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'};
				"
			>Monthly</button>
			<button
				onclick={() => (billingCycle = 'yearly')}
				style="
					display: flex;
					align-items: center;
					gap: 6px;
					padding: 7px 18px;
					border-radius: 8px;
					border: none;
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 13px;
					font-weight: 600;
					cursor: pointer;
					transition: all 150ms;
					background: {billingCycle === 'yearly' ? 'var(--color-bg-surface)' : 'transparent'};
					color: {billingCycle === 'yearly' ? 'var(--color-text-primary)' : 'var(--color-text-muted)'};
					box-shadow: {billingCycle === 'yearly' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'};
				"
			>
				Yearly
				<span style="
					font-size: 10px;
					font-weight: 700;
					padding: 2px 7px;
					border-radius: 99px;
					background: var(--color-brand-muted);
					color: var(--color-brand);
					border: 1px solid var(--color-brand);
				">Save 20%</span>
			</button>
		</div>
	</div>

	{#if isPaid}
		<!-- Subscribed state: show badge, not pricing cards -->
		<div style="
			margin-bottom: 36px;
			padding: 24px 28px;
			background: var(--color-brand-muted);
			border: 1px solid var(--color-brand);
			border-radius: 14px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 20px;
			flex-wrap: wrap;
		">
			<div style="display: flex; align-items: center; gap: 14px;">
				<div style="
					width: 44px; height: 44px; border-radius: 12px;
					background: var(--color-brand); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
				">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M20 6 9 17l-5-5"/>
					</svg>
				</div>
				<div>
					<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 16px; font-weight: 700; color: var(--color-text-primary); margin: 0 0 3px;">
						You're subscribed to the {planLabel} plan
					</p>
					<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-text-secondary); margin: 0;">
						Manage your subscription, billing, and payment details in Settings.
					</p>
				</div>
			</div>
			<a href="/settings" style="
				display: inline-flex; align-items: center; gap: 6px;
				padding: 10px 18px; border-radius: 9px;
				background: var(--color-brand); color: white;
				font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; font-weight: 700;
				text-decoration: none; white-space: nowrap; flex-shrink: 0;
			">Manage billing</a>
		</div>
	{:else}
		{#if checkoutError}
			<div style="
				margin-bottom: 20px;
				padding: 12px 16px;
				background: #ef444420;
				border: 1px solid #ef444440;
				border-radius: 10px;
				font-family: 'Space Grotesk', system-ui, sans-serif;
				font-size: 13px;
				color: #ef4444;
			">{checkoutError}</div>
		{/if}

		<!-- Plan cards -->
		<div style="
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 20px;
			align-items: start;
		" class="pricing-grid">
			{#each (['basic', 'pro', 'ultra'] as PlanKey[]) as planKey, i}
				<div style="padding-top: {i === 1 ? '0' : '16px'}">
					<PricingCard
						plan={planKey}
						{billingCycle}
						highlighted={planKey === 'pro'}
						onselect={() => handleSelectPlan(planKey)}
					/>
					{#if checkoutLoading === planKey}
						<p style="text-align:center;font-family:'Space Grotesk',system-ui;font-size:12px;color:var(--color-text-muted);margin-top:8px;">Redirecting to checkout…</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Comparison table -->
	<div style="margin-top: 48px; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 14px; overflow: hidden;">
		<div style="padding: 16px 20px; border-bottom: 1px solid var(--color-bg-border);">
			<h2 style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; font-weight: 600; color: var(--color-text-primary); margin: 0;">Compare plans</h2>
		</div>
		<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px;">
			<thead>
				<tr style="border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated);">
					<th style="padding: 10px 20px; text-align: left; color: var(--color-text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;">Feature</th>
					<th style="padding: 10px 16px; text-align: center; color: #3b82f6; font-size: 12px; font-weight: 700;">Basic</th>
					<th style="padding: 10px 16px; text-align: center; color: var(--color-brand); font-size: 12px; font-weight: 700; background: var(--color-brand-muted);">Pro</th>
					<th style="padding: 10px 16px; text-align: center; color: #7c3aed; font-size: 12px; font-weight: 700;">Ultra</th>
				</tr>
			</thead>
			<tbody>
				{#each [
					['Words per month', '4,500', '12,000', '35,000'],
					['Monthly price', '$9.99', '$19.99', '$39.99'],
					['Yearly price', '$86.99/yr', '$182.99/yr', '$374.99/yr'],
					['AI Detection', '✓', '✓', '✓'],
					['AI Humanizer', '✓', '✓', '✓'],
					['Word top-up packs', '✓', '✓', '✓'],
					['History & saved results', '✓', '✓', '✓'],
					['Support', 'Email', 'Priority', 'Priority'],
				] as row, i}
					<tr style="border-bottom: 1px solid var(--color-bg-border); background: {i % 2 === 0 ? 'transparent' : 'var(--color-bg-elevated)10'};">
						{#each row as cell, j}
							<td style="
								padding: 10px {j === 0 ? '20px' : '16px'};
								color: {j === 0 ? 'var(--color-text-secondary)' : 'var(--color-text-primary)'};
								text-align: {j === 0 ? 'left' : 'center'};
								font-weight: {j === 0 ? '500' : '400'};
								background: {j === 2 ? 'var(--color-brand-muted)' : 'transparent'};
							">{cell}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	@media (max-width: 700px) {
		.pricing-grid {
			grid-template-columns: 1fr !important;
		}
	}
</style>
