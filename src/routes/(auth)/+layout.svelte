<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { children } = $props();
</script>

<main style="
	min-height: 100svh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color-bg-base);
	overflow-x: hidden;
	position: relative;
">
	<div style="position: absolute; top: 16px; right: 16px; z-index: 10;">
		<ThemeToggle />
	</div>
	{@render children()}
</main>
