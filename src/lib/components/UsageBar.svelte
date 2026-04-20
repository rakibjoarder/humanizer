<script lang="ts">
	interface Props {
		used: number;
		limit: number;
		plan: string;
	}

	let { used, limit, plan }: Props = $props();

	const isUnlimited = $derived(false);

	const ratio = $derived(isUnlimited ? 0 : Math.min(used / limit, 1));

	const barColor = $derived(
		isUnlimited ? 'var(--color-brand)' :
		ratio >= 1 ? 'var(--color-ai)' :
		ratio >= 0.8 ? 'var(--color-possibly-ai)' :
		'var(--color-brand)'
	);

	const trackColor = $derived(
		ratio >= 1 ? 'var(--color-ai-muted)' :
		ratio >= 0.8 ? '#f9731610' :
		'var(--color-brand-muted)'
	);

	function formatNumber(n: number): string {
		return n.toLocaleString('en-US');
	}

	const label = $derived(
		isUnlimited
			? `${formatNumber(used)} words used · Unlimited`
			: `${formatNumber(used)} / ${formatNumber(limit)} words today`
	);

	const percentage = $derived(Math.round(ratio * 100));
</script>

<div class="usage-bar-wrapper" role="group" aria-label="Word usage">
	<div class="usage-header">
		<span class="usage-label">{label}</span>
		{#if !isUnlimited}
			<span class="usage-pct" style="color: {barColor};">{percentage}%</span>
		{:else}
			<span class="unlimited-badge">Unlimited</span>
		{/if}
	</div>

	<div
		class="bar-track"
		style="background: {trackColor};"
		role="progressbar"
		aria-valuenow={isUnlimited ? undefined : used}
		aria-valuemin={0}
		aria-valuemax={isUnlimited ? undefined : limit}
		aria-label={label}
	>
		{#if isUnlimited}
			<div class="bar-fill bar-unlimited" style="background: {barColor};"></div>
		{:else}
			<div
				class="bar-fill"
				style="width: {ratio * 100}%; background: {barColor};"
			></div>
		{/if}
	</div>

	{#if !isUnlimited && ratio >= 1}
		<p class="over-limit-msg" role="alert">
			Daily limit reached. <a href="/settings" style="color:inherit;font-weight:600;">Top up or upgrade</a> for more words.
		</p>
	{:else if !isUnlimited && ratio >= 0.8}
		<p class="near-limit-msg">
			Approaching daily limit.
		</p>
	{/if}
</div>

<style>
	.usage-bar-wrapper {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
	}

	.usage-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.usage-label {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-text-secondary);
	}

	.usage-pct {
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		font-weight: 600;
		transition: color 300ms ease;
	}

	.unlimited-badge {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-brand);
		padding: 2px 10px;
		border-radius: 6px;
		background: var(--color-brand-muted);
		box-shadow: inset 0 0 0 1px var(--color-brand);
	}

	.bar-track {
		height: 6px;
		border-radius: 9999px;
		overflow: hidden;
		transition: background 300ms ease;
	}

	.bar-fill {
		height: 100%;
		border-radius: 9999px;
		transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1), background 300ms ease;
	}

	.bar-unlimited {
		width: 100%;
		opacity: 0.4;
	}

	.over-limit-msg {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12px;
		color: var(--color-ai);
		margin: 0;
	}

	.near-limit-msg {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12px;
		color: var(--color-possibly-ai);
		margin: 0;
	}
</style>
