<script lang="ts">
	interface Props {
		lines?: number;
		height?: string;
	}

	let { lines = 4, height = '16px' }: Props = $props();

	// Generate varied widths to look more natural
	const lineWidths = $derived(
		Array.from({ length: lines }, (_, i) => {
			const widths = ['100%', '92%', '85%', '97%', '78%', '88%', '95%', '70%'];
			return widths[i % widths.length];
		})
	);
</script>

<div class="skeleton-wrapper" role="status" aria-label="Loading…" aria-busy="true">
	{#each lineWidths as width, i}
		<div
			class="skeleton-line animate-shimmer"
			style="width: {width}; height: {height}; animation-delay: {i * 80}ms;"
		></div>
	{/each}
	<span class="sr-only">Loading content…</span>
</div>

<style>
	.skeleton-wrapper {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 100%;
	}

	.skeleton-line {
		border-radius: 6px;
		flex-shrink: 0;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
