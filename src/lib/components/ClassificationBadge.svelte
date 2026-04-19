<script lang="ts">
	type Classification = 'LIKELY_AI' | 'POSSIBLY_AI' | 'POSSIBLY_HUMAN' | 'LIKELY_HUMAN';
	type Size = 'sm' | 'md';

	interface Props {
		classification: Classification;
		size?: Size;
	}

	let { classification, size = 'md' }: Props = $props();

	interface BadgeConfig {
		color: string;
		bg: string;
		text: string;
		pulse: boolean;
	}

	const configs: Record<Classification, BadgeConfig> = {
		LIKELY_AI: {
			color: '#ef4444',
			bg: 'rgba(239,68,68,0.14)',
			text: 'AI Generated',
			pulse: true
		},
		POSSIBLY_AI: {
			color: '#f97316',
			bg: 'rgba(249,115,22,0.14)',
			text: 'Possibly AI',
			pulse: false
		},
		POSSIBLY_HUMAN: {
			color: '#eab308',
			bg: 'rgba(234,179,8,0.14)',
			text: 'Uncertain',
			pulse: false
		},
		LIKELY_HUMAN: {
			color: '#22c55e',
			bg: 'rgba(34,197,94,0.14)',
			text: 'Human Written',
			pulse: false
		}
	};

	const cfg = $derived(configs[classification]);

	const dotSize = $derived(size === 'sm' ? 5 : 7);
	const padding = $derived(size === 'sm' ? '4px 8px' : '6px 12px');
	const fontSize = $derived(size === 'sm' ? '11px' : '12px');
</script>

<span
	class="badge animate-fade-up"
	style="
		display: inline-flex;
		align-items: center;
		gap: {size === 'sm' ? '6px' : '8px'};
		padding: {padding};
		border-radius: 6px;
		background: {cfg.bg};
		box-shadow: inset 0 0 0 1px {cfg.color}30;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: {fontSize};
		font-weight: 600;
		letter-spacing: 0.11em;
		text-transform: uppercase;
		color: {cfg.color};
		white-space: nowrap;
		user-select: none;
	"
	role="status"
	aria-label={cfg.text}
>
	<span
		class={cfg.pulse ? 'animate-pulse-dot' : ''}
		style="
			display: inline-block;
			width: {dotSize}px;
			height: {dotSize}px;
			border-radius: 50%;
			background: {cfg.color};
			flex-shrink: 0;
		"
	></span>
	{cfg.text}
</span>
