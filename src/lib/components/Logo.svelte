<script lang="ts">
	interface Props {
		size?: number;
		onclick?: () => void;
	}

	let { size = 32, onclick }: Props = $props();

	const wordmarkSize = $derived(size * 0.5625);
</script>

<button
	type="button"
	style="
		display: inline-flex;
		align-items: center;
		gap: {size * 0.375}px;
		background: none;
		border: none;
		padding: 0;
		cursor: {onclick ? 'pointer' : 'default'};
		user-select: none;
	"
	onclick={onclick}
	aria-label="HumanizeAI home"
>
	<!-- SVG Mark -->
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<rect x="2" y="2" width="20" height="20" rx="5" fill="#6366f1" />
		<path
			d="M7 8v8 M7 12h5 M12 8v8 M15 8l3 8 M18 8l-3 8"
			stroke="#fff"
			stroke-width="1.6"
			stroke-linecap="round"
		/>
	</svg>

	<!-- Wordmark -->
	<span
		style="
			font-family: 'Newsreader', Georgia, serif;
			font-size: {wordmarkSize}px;
			font-weight: 500;
			color: var(--color-text-primary);
			letter-spacing: -0.02em;
			line-height: 1;
			white-space: nowrap;
		"
	>Humanize<span style="color: var(--color-brand);">AI</span></span>
</button>
