<script lang="ts">
	import { onMount } from 'svelte';

	type Variant = 'arc' | 'ring' | 'bar' | 'ticks';

	interface Props {
		aiProbability: number;
		classification: string;
		animate?: boolean;
		size?: number;
		variant?: Variant;
	}

	let {
		aiProbability,
		classification,
		animate = true,
		size = 200,
		variant = 'arc'
	}: Props = $props();

	// Classification → color
	const classColor = $derived(
		classification === 'LIKELY_AI' ? '#ef4444' :
		classification === 'POSSIBLY_AI' ? '#f97316' :
		classification === 'POSSIBLY_HUMAN' ? '#eab308' :
		'#22c55e'
	);

	// AnimatedNumber: count from 0 to target over 800ms
	let animVal = $state(0);
	let displayNum = $state(0);
	let mounted = $state(false);

	$effect(() => {
		const target = aiProbability;
		if (!mounted) return;

		if (!animate) {
			animVal = target;
			displayNum = Math.round(target * 100);
			return;
		}

		const start = animVal;
		const startNum = displayNum;
		const targetNum = Math.round(target * 100);
		const duration = 800;
		let startTime: number | null = null;

		function easeOut(t: number): number {
			// cubic-bezier(0.22, 1, 0.36, 1) approximation
			return 1 - Math.pow(1 - t, 3);
		}

		function frame(ts: number) {
			if (startTime === null) startTime = ts;
			const elapsed = ts - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const eased = easeOut(progress);
			animVal = start + (target - start) * eased;
			displayNum = Math.round(startNum + (targetNum - startNum) * eased);
			if (progress < 1) requestAnimationFrame(frame);
		}

		requestAnimationFrame(frame);
	});

	onMount(() => {
		mounted = true;
	});

	// SVG arc math
	const r = $derived(size * 0.42);
	const cx = $derived(size / 2);
	const cy = $derived(size / 2 + size * 0.04);

	const circumference = $derived(2 * Math.PI * r * (240 / 360));

	// strokeDashoffset: 0 = full, circumference = empty
	const strokeDashoffset = $derived(circumference * (1 - animVal));

	// Arc path helper: angles in degrees (0=right, clockwise in SVG)
	// Design: start=-210° (bottom-left), end=30° (bottom-right), sweep=240°
	function polarToCartesian(
		cxP: number, cyP: number, radius: number, angleDeg: number
	): { x: number; y: number } {
		// SVG Y axis is flipped; subtract 90 so 0deg = top
		const rad = ((angleDeg - 90) * Math.PI) / 180;
		return {
			x: cxP + radius * Math.cos(rad),
			y: cyP + radius * Math.sin(rad)
		};
	}

	// start = 150deg in standard SVG (= -210 in design convention → 150 SVG)
	// end   = 390deg = 30deg in design → 30deg SVG
	// sweep = 240deg clockwise
	const arcPath = $derived.by(() => {
		const start = polarToCartesian(cx, cy, r, 150);
		const end = polarToCartesian(cx, cy, r, 30);
		return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${r.toFixed(3)} ${r.toFixed(3)} 0 1 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
	});

	// Dot position along the arc at current animVal
	// Map animVal [0,1] → angle [150°, 30°] clockwise = [150°, 390°]
	const dotAngle = $derived(150 + animVal * 240);
	const dotPos = $derived(polarToCartesian(cx, cy, r, dotAngle));

	// Tick label positions
	const tickStart = $derived(polarToCartesian(cx, cy, r + 14, 150));
	const tickEnd = $derived(polarToCartesian(cx, cy, r + 14, 30));

	const gradId = 'gaugeGrad';
</script>

{#if variant === 'arc'}
<svg
	width={size}
	height={size}
	viewBox="0 0 {size} {size}"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	aria-label={`AI probability: ${displayNum}%`}
	style="overflow: visible;"
>
	<defs>
		<linearGradient
			id={gradId}
			gradientUnits="userSpaceOnUse"
			x1={polarToCartesian(cx, cy, r, 150).x}
			y1={polarToCartesian(cx, cy, r, 150).y}
			x2={polarToCartesian(cx, cy, r, 30).x}
			y2={polarToCartesian(cx, cy, r, 30).y}
		>
			<stop offset="0%" stop-color="#22c55e" />
			<stop offset="50%" stop-color="#eab308" />
			<stop offset="100%" stop-color="#ef4444" />
		</linearGradient>
	</defs>

	<!-- Track arc -->
	<path
		d={arcPath}
		stroke="var(--color-bg-border)"
		stroke-width={size * 0.054}
		stroke-linecap="round"
		fill="none"
	/>

	<!-- Fill arc (gradient, animated via dashoffset) -->
	<path
		d={arcPath}
		stroke="url(#{gradId})"
		stroke-width={size * 0.054}
		stroke-linecap="round"
		fill="none"
		stroke-dasharray={circumference}
		stroke-dashoffset={strokeDashoffset}
		style="transition: stroke-dashoffset 800ms cubic-bezier(0.22,1,0.36,1);"
	/>

	<!-- Animated end-dot -->
	<circle
		cx={dotPos.x}
		cy={dotPos.y}
		r="3.5"
		fill={classColor}
		style="transition: cx 800ms cubic-bezier(0.22,1,0.36,1), cy 800ms cubic-bezier(0.22,1,0.36,1);"
	/>

	<!-- Tick label "0%" -->
	<text
		x={tickStart.x}
		y={tickStart.y}
		text-anchor="middle"
		dominant-baseline="middle"
		font-family="'JetBrains Mono', monospace"
		font-size={size * 0.055}
		fill="var(--color-text-muted)"
	>0%</text>

	<!-- Tick label "100%" -->
	<text
		x={tickEnd.x}
		y={tickEnd.y}
		text-anchor="middle"
		dominant-baseline="middle"
		font-family="'JetBrains Mono', monospace"
		font-size={size * 0.055}
		fill="var(--color-text-muted)"
	>100%</text>

	<!-- Kicker label "AI Probability" -->
	<text
		x={cx}
		y={cy - size * 0.13}
		text-anchor="middle"
		dominant-baseline="middle"
		font-family="'Space Grotesk', system-ui, sans-serif"
		font-size={size * 0.0525}
		letter-spacing="0.08em"
		fill="var(--color-text-muted)"
		style="text-transform: uppercase;"
	>AI Probability</text>

	<!-- Large animated number -->
	<text
		x={cx}
		y={cy + size * 0.04}
		text-anchor="middle"
		dominant-baseline="middle"
		font-family="'Newsreader', Georgia, serif"
		font-size={size * 0.26}
		font-weight="400"
		fill={classColor}
	>{displayNum}%</text>
</svg>
{/if}
