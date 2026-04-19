<script lang="ts">
	let { children } = $props();
</script>

<main style="
	min-height: 100svh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color-bg-base);
	overflow-x: hidden;
">
	{@render children()}
</main>
