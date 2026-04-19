<script lang="ts">
	import { type Snippet } from 'svelte';

	interface Props {
		icon?: string;
		label: string;
		right?: Snippet;
	}

	let { icon, label, right }: Props = $props();
</script>

<div style="
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 20px;
	border-bottom: 1px solid var(--color-bg-border);
	background: var(--color-bg-sunk);
	border-radius: 14px 14px 0 0;
">
	<div style="display: flex; align-items: center; gap: 10px;">
		{#if icon}
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="var(--color-text-muted)"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d={icon} />
			</svg>
		{/if}
		<span style="
			font-family: 'Space Grotesk', system-ui, sans-serif;
			font-size: 11px;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: var(--color-text-secondary);
			font-weight: 500;
		">{label}</span>
	</div>
	{#if right}{@render right()}{/if}
</div>
