<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Reveal from '$lib/components/Reveal.svelte';

	type Variant = 'marketing' | 'blog';

	let { variant = 'marketing' }: { variant?: Variant } = $props();

	const items: Array<{
		src: string;
		title: string;
		stepLabel: string;
		caption: string;
		alt: string;
	}> = [
		{
			src: '/assets/success/ai-detection.png',
			title: 'AI detection',
			stepLabel: 'Start with detection',
			caption:
				'Get a clear read on how machine-like your draft sounds—so you know what to revise before you ship.',
			alt: 'Screenshot of AI detection results in HumanizeAIWrite'
		},
		{
			src: '/assets/success/humanizer.png',
			title: 'Humanize',
			stepLabel: 'Then humanize',
			caption:
				'Turn stiff AI-sounding lines into natural prose while keeping your facts and structure.',
			alt: 'Screenshot of the humanizer output in HumanizeAIWrite'
		},
		{
			src: '/assets/success/success-quillbot.png',
			title: 'Check with other tools',
			stepLabel: 'Then try another checker',
			caption:
				'Example: how humanized text can look when run through another checker (illustrative; third-party results vary).',
			alt: 'Illustrative example of text checked with QuillBot after humanizing'
		}
	];

	const n = items.length;
	const AUTOPLAY_MS = 4000;

	let slideIndex = $state(0);
	let carouselEl = $state<HTMLElement | null>(null);
	let inView = $state(false);
	let hoverPause = $state(false);
	let reduceMotion = $state(false);

	function goTo(i: number) {
		slideIndex = ((i % n) + n) % n;
	}

	function next() {
		goTo(slideIndex + 1);
	}

	function prev() {
		goTo(slideIndex - 1);
	}

	onMount(() => {
		if (!browser) return;
		reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});

	onMount(() => {
		const el = carouselEl;
		if (!el) return;
		const io = new IntersectionObserver(
			([entry]) => {
				inView = entry.isIntersecting;
			},
			{ threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
		);
		io.observe(el);
		return () => io.disconnect();
	});

	$effect(() => {
		if (!browser || reduceMotion) return;
		if (!inView || hoverPause) return;
		const id = setInterval(() => next(), AUTOPLAY_MS);
		return () => clearInterval(id);
	});
</script>

<section
	class="success-showcase"
	class:success-showcase--blog={variant === 'blog'}
	aria-labelledby="success-showcase-heading"
>
	<div class="success-showcase-band">
		<div class="success-showcase-inner">
			<Reveal delay={0}>
				<p class="success-showcase-eyebrow">How it works</p>
				<h2 id="success-showcase-heading" class="success-showcase-heading">
					See it in action
				</h2>
				<p class="success-showcase-lede">
					<strong class="success-lede-strong">First</strong> detection →
					<strong class="success-lede-strong">then</strong> humanize →
					<strong class="success-lede-strong">then</strong> check elsewhere. Use the prev/next buttons or dots below{reduceMotion ? '.' : '; the slideshow auto-advances while this section is visible.'}
				</p>
			</Reveal>

			<div
				class="success-carousel"
				bind:this={carouselEl}
				onmouseenter={() => (hoverPause = true)}
				onmouseleave={() => (hoverPause = false)}
				role="region"
				aria-roledescription="carousel"
				aria-label="Product screenshots: detection, humanize, third-party check"
			>
				<div class="success-carousel-chrome">
					<div class="success-step-header">
						<span class="success-step-num">Step {slideIndex + 1} of {n}</span>
						<span class="success-step-label">{items[slideIndex].stepLabel}</span>
					</div>

					<div class="success-slides-viewport" aria-live="polite" aria-atomic="true">
						<div
							class="success-slides-track"
							class:no-transition={reduceMotion}
							style="transform: translateX(calc(-100% * {slideIndex} / {n}));"
						>
							{#each items as item, i}
								<div class="success-slide" aria-hidden={slideIndex !== i}>
									<figure class="success-showcase-card hai-hover-lift">
										<div class="success-showcase-img-wrap">
											<img
												src={item.src}
												alt={item.alt}
												width={1200}
												height={800}
												loading={i === 0 ? 'eager' : 'lazy'}
												decoding="async"
												class="success-showcase-img"
												draggable="false"
											/>
										</div>
										<figcaption class="success-showcase-caption">
											<span class="success-showcase-title">{item.title}</span>
											<span class="success-showcase-body">{item.caption}</span>
										</figcaption>
									</figure>
								</div>
							{/each}
						</div>
					</div>

					<div class="success-carousel-controls">
						<button
							type="button"
							class="success-carousel-btn"
							aria-label="Previous slide"
							onclick={prev}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path
									d="M15 18l-6-6 6-6"
									stroke="currentColor"
									stroke-width="2.2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</button>

						<div class="success-carousel-dots" role="tablist" aria-label="Slide">
							{#each items as _, i}
								<button
									type="button"
									role="tab"
									class="success-dot"
									class:active={slideIndex === i}
									aria-selected={slideIndex === i}
									aria-label="Go to slide {i + 1}: {items[i].title}"
									onclick={() => goTo(i)}
								></button>
							{/each}
						</div>

						<button
							type="button"
							class="success-carousel-btn"
							aria-label="Next slide"
							onclick={next}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path
									d="M9 18l6-6-6-6"
									stroke="currentColor"
									stroke-width="2.2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.success-showcase {
		padding: 0;
		margin: 0;
	}

	.success-showcase--blog {
		margin: 0 -24px;
		padding: 0;
	}

	@media (min-width: 901px) {
		.success-showcase--blog {
			margin: 0;
		}
	}

	.success-showcase-band {
		background: var(--color-bg-surface);
		border-top: 1px solid var(--color-bg-border);
		border-bottom: 1px solid var(--color-bg-border);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
		padding: 32px 20px 40px;
	}

	:global(html[data-theme='light']) .success-showcase-band {
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
		background: linear-gradient(180deg, var(--color-bg-elevated) 0%, var(--color-bg-surface) 100%);
	}

	.success-showcase-inner {
		max-width: 560px;
		margin: 0 auto;
	}

	.success-showcase-eyebrow {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-brand);
		text-align: center;
		margin: 0 0 6px;
	}

	.success-showcase-heading {
		font-family: 'Newsreader', Georgia, serif;
		font-size: clamp(22px, 3.2vw, 28px);
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 8px;
		letter-spacing: -0.03em;
		line-height: 1.15;
		text-align: center;
	}

	.success-showcase-lede {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: clamp(13px, 1.5vw, 15px);
		line-height: 1.5;
		color: var(--color-text-secondary);
		margin: 0 auto 18px;
		max-width: 480px;
		text-align: center;
	}

	.success-lede-strong {
		font-weight: 700;
		color: var(--color-text-primary);
	}

	/* ── Carousel ──────────────────────────────────────────────────── */
	.success-carousel {
		margin-top: 8px;
	}

	.success-carousel-chrome {
		border-radius: 12px;
		border: 1px solid var(--color-bg-border-hi);
		background: var(--color-bg-base);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}

	.success-step-header {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 8px 10px;
		padding: 10px 12px 8px;
		border-bottom: 1px solid var(--color-bg-border);
		background: var(--color-bg-surface);
	}

	.success-step-num {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-brand);
		background: var(--color-brand-muted);
		padding: 3px 8px;
		border-radius: 5px;
		border: 1px solid rgba(16, 185, 129, 0.35);
	}

	.success-step-label {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-primary);
		letter-spacing: -0.02em;
	}

	.success-slides-viewport {
		overflow: hidden;
		outline: none;
	}

	.success-slides-viewport:focus-visible {
		box-shadow: inset 0 0 0 2px var(--color-brand);
	}

	/* Track width = n × viewport; each slide = 1/n of track */
	.success-slides-viewport {
		width: 100%;
	}

	.success-slides-track {
		display: flex;
		flex-direction: row;
		width: 300%;
		transition: transform 0.48s cubic-bezier(0.22, 1, 0.36, 1);
		will-change: transform;
	}

	.success-slides-track.no-transition {
		transition: none;
	}

	.success-slide {
		flex: 0 0 33.333333%;
		width: 33.333333%;
		min-width: 0;
		box-sizing: border-box;
	}

	.success-showcase-card {
		margin: 0;
		display: flex;
		flex-direction: column;
		border-radius: 0;
		overflow: hidden;
		background: transparent;
		border: none;
		box-shadow: none;
	}

	.success-showcase-img-wrap {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		background: var(--color-bg-sunk);
		padding: 8px 10px;
		line-height: 0;
	}

	.success-showcase-img {
		display: block;
		width: 100%;
		max-width: 100%;
		height: auto;
		max-height: min(320px, 48vh);
		object-fit: contain;
		object-position: center center;
		user-select: none;
	}

	.success-showcase-caption {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 10px 12px 12px;
		text-align: left;
		border-top: 1px solid var(--color-bg-border);
		background: var(--color-bg-surface);
	}

	.success-showcase-title {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 14px;
		font-weight: 700;
		color: var(--color-text-primary);
		letter-spacing: -0.02em;
	}

	.success-showcase-body {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12px;
		line-height: 1.45;
		color: var(--color-text-secondary);
	}

	.success-carousel-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px 10px 10px;
		background: var(--color-bg-surface);
		border-top: 1px solid var(--color-bg-border);
	}

	.success-carousel-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: 1px solid var(--color-bg-border);
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
		cursor: pointer;
		transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
		flex-shrink: 0;
	}

	.success-carousel-btn:hover {
		background: var(--color-brand-muted);
		border-color: var(--color-brand);
		color: var(--color-brand);
	}

	.success-carousel-btn:focus-visible {
		outline: 2px solid var(--color-brand);
		outline-offset: 2px;
	}

	.success-carousel-dots {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		flex: 1;
	}

	.success-dot {
		width: 6px;
		height: 6px;
		padding: 0;
		border-radius: 50%;
		border: none;
		background: var(--color-bg-border-hi);
		cursor: pointer;
		transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
	}

	.success-dot:hover {
		background: var(--color-text-muted);
		transform: scale(1.15);
	}

	.success-dot.active {
		background: var(--color-brand);
		box-shadow: 0 0 0 2px var(--color-brand-muted);
		transform: scale(1.15);
	}

	.success-dot:focus-visible {
		outline: 2px solid var(--color-brand);
		outline-offset: 3px;
	}

	@media (max-width: 520px) {
		.success-showcase-band {
			padding: 24px 16px 32px;
		}
		.success-carousel-controls {
			padding: 6px 8px 8px;
		}
	}
</style>
