<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import PricingCard from '$lib/components/PricingCard.svelte';
	import { trackPlanClick } from '$lib/client/analytics';

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
		trackPlanClick(planKey, billingCycle, 'plans_page');

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
				">Save 25%</span>
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
	<div style="margin-top: 48px; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 16px; overflow: hidden;">
		<div style="padding: 20px 24px; border-bottom: 1px solid var(--color-bg-border);">
			<h2 style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 16px; font-weight: 700; color: var(--color-text-primary); margin: 0;">Compare plans</h2>
		</div>
		<div style="overflow-x: auto;">
			<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px;">
				<thead>
					<tr style="border-bottom: 1px solid var(--color-bg-border);">
						<th style="padding: 14px 24px; text-align: left; color: var(--color-text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; width: 40%;">Features</th>
						<!-- Basic -->
						<th style="padding: 14px 16px; text-align: center; width: 20%;">
							<div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
								<span style="font-size: 14px; font-weight: 700; color: #3b82f6;">Basic</span>
								<span style="font-size: 11px; font-weight: 500; padding: 2px 10px; border-radius: 99px; background: #3b82f615; color: #3b82f6;">Starter</span>
							</div>
						</th>
						<!-- Pro -->
						<th style="padding: 14px 16px; text-align: center; width: 20%; border-top: 3px solid var(--color-brand); background: color-mix(in srgb, var(--color-brand) 5%, transparent);">
							<div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
								<span style="font-size: 14px; font-weight: 700; color: var(--color-brand);">Pro</span>
								<span style="font-size: 11px; font-weight: 500; padding: 2px 10px; border-radius: 99px; background: var(--color-brand-muted); color: var(--color-brand);">Most popular</span>
							</div>
						</th>
						<!-- Ultra -->
						<th style="padding: 14px 16px; text-align: center; width: 20%;">
							<div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
								<span style="font-size: 14px; font-weight: 700; color: #7c3aed;">Ultra</span>
								<span style="font-size: 11px; font-weight: 500; padding: 2px 10px; border-radius: 99px; background: #7c3aed15; color: #7c3aed;">Best value</span>
							</div>
						</th>
					</tr>
				</thead>
				<tbody>
					{#each [
						{
							icon: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M13 2v7h7',
							iconColor: '#3b82f6',
							label: 'Words per month',
							values: ['4,500', '12,000', '35,000'],
							isText: true
						},
						{
							icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2',
							iconColor: 'var(--color-brand)',
							label: 'Monthly price',
							values: ['$9.99', '$19.99', '$39.99'],
							isText: true
						},
						{
							icon: 'M8 2v4M16 2v4M3 10h18M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
							iconColor: '#10b981',
							label: 'Yearly price',
							yearlyNote: true,
							values: ['$86.99/yr', '$182.99/yr', '$374.99/yr'],
							isText: true
						},
						{
							icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
							iconColor: '#6366f1',
							label: 'AI Detection',
							values: [true, true, true],
							isText: false
						},
						{
							icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
							iconColor: 'var(--color-brand)',
							label: 'AI Humanizer',
							values: [true, true, true],
							isText: false
						},
						{
							icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
							iconColor: '#f59e0b',
							label: 'Word top-up packs',
							values: [true, true, true],
							isText: false
						},
						{
							icon: 'M12 8v4l3 3 M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5',
							iconColor: '#8b5cf6',
							label: 'History & saved results',
							values: [true, true, true],
							isText: false
						},
						{
							icon: 'M3 18v-6a9 9 0 0 1 18 0v6 M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z',
							iconColor: '#06b6d4',
							label: 'Support',
							values: ['Email', 'Priority', 'Priority'],
							isText: true
						},
					] as row, i}
						<tr style="border-bottom: 1px solid var(--color-bg-border);">
							<!-- Feature label with icon -->
							<td style="padding: 14px 24px;">
								<div style="display: flex; align-items: center; gap: 10px;">
									<div style="width: 28px; height: 28px; border-radius: 8px; background: color-mix(in srgb, {row.iconColor} 12%, transparent); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="{row.iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={row.icon}/></svg>
									</div>
									<span style="font-weight: 500; color: var(--color-text-secondary);">
										{row.label}
										{#if row.yearlyNote}
											<span style="margin-left: 6px; font-size: 10px; font-weight: 600; padding: 1px 7px; border-radius: 99px; background: var(--color-brand-muted); color: var(--color-brand); white-space: nowrap;">Save up to 20%</span>
										{/if}
									</span>
								</div>
							</td>
							<!-- Basic -->
							<td style="padding: 14px 16px; text-align: center;">
								{#if row.isText}
									<span style="font-weight: 600; color: var(--color-text-primary);">{row.values[0]}</span>
								{:else if row.values[0]}
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
								{:else}
									<span style="color: var(--color-text-dim);">—</span>
								{/if}
							</td>
							<!-- Pro (highlighted) -->
							<td style="padding: 14px 16px; text-align: center; background: color-mix(in srgb, var(--color-brand) 5%, transparent);">
								{#if row.isText}
									<span style="font-weight: 600; color: var(--color-brand);">{row.values[1]}</span>
								{:else if row.values[1]}
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
								{:else}
									<span style="color: var(--color-text-dim);">—</span>
								{/if}
							</td>
							<!-- Ultra -->
							<td style="padding: 14px 16px; text-align: center;">
								{#if row.isText}
									<span style="font-weight: 600; color: var(--color-text-primary);">{row.values[2]}</span>
								{:else if row.values[2]}
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
								{:else}
									<span style="color: var(--color-text-dim);">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div style="padding: 14px 24px; border-top: 1px solid var(--color-bg-border); background: var(--color-bg-elevated); text-align: center;">
			<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; color: var(--color-text-muted);">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:4px;" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
				Secure payments. Cancel anytime.
			</span>
		</div>
	</div>
</div>

<style>
	@media (max-width: 700px) {
		.pricing-grid {
			grid-template-columns: 1fr !important;
		}
	}
</style>
