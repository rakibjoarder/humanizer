<script lang="ts">
	import { goto } from '$app/navigation';
	import Reveal from '$lib/components/Reveal.svelte';
	import ScoreGauge from '$lib/components/ScoreGauge.svelte';
	import ClassificationBadge from '$lib/components/ClassificationBadge.svelte';
	import TextEditor from '$lib/components/TextEditor.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	// ── Icon paths ──────────────────────────────────────────────────────────────
	const scanIcon = 'M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M7 12h10';
	const wandIcon = 'm15 4-2 2-2-2 M18 7l-2 2-2-2 M21 3v3 M3 21l9-9 M14 7l7 7-4 4-7-7z';
	const shieldIcon = 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z';
	const arrowR = 'M5 12h14 M13 6l6 6-6 6';
	const checkIcon = 'M20 6 9 17l-5-5';

	// ── Demo state ─────────────────────────────────────────────────────────────
	let demoText = $state("In today's rapidly evolving digital landscape, the fundamentally transformative power of AI-driven technologies has revolutionized operational efficiency. Furthermore, comprehensive data-driven paradigms have empowered stakeholders to leverage unprecedented synergy, fostering seamless integration across multifaceted workflows. Moreover, this transformative approach ensures that organizations can maintain crucial competitive advantages while enabling innovative solutions that drive sustainable growth.");
	let demoState = $state<'ready' | 'analyzing' | 'result'>('ready');
	let demoResult = $state<{ ai_probability: number; classification: string } | null>(null);

	const wordCount = $derived(
		demoText.trim().length === 0 ? 0 : demoText.trim().split(/\s+/).filter(Boolean).length
	);

	async function runDemo() {
		if (demoText.length < 50) return;
		demoState = 'analyzing';
		try {
			const res = await fetch('/api/detect', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: demoText })
			});
			const data = await res.json();
			demoResult = data;
			demoState = 'result';
		} catch {
			demoState = 'ready';
		}
	}

	function resetDemo() {
		demoState = 'ready';
		demoResult = null;
	}

	// ── Pricing ────────────────────────────────────────────────────────────────
	const plans = [
		{
			name: 'Free',
			price: '$0',
			period: '',
			highlight: false,
			savings: null,
			features: [
				'5 detections / day',
				'500 word limit per scan',
				'Community support'
			]
		},
		{
			name: 'Pro',
			price: '$12',
			period: '/ mo',
			highlight: true,
			savings: 'Save $29 / yr with annual',
			features: [
				'Unlimited detections',
				'10,000 word limit per scan',
				'Full humanizer (unlimited)',
				'History & PDF export',
				'Priority support'
			]
		},
	];

	// ── Features ───────────────────────────────────────────────────────────────
	const features = [
		{
			num: '01',
			icon: scanIcon,
			title: 'Own-model detection',
			body: 'Trained on 2M+ samples from GPT-4, Claude, Gemini and more. Our model achieves 98.2% accuracy on held-out test sets — not benchmarked on training data.'
		},
		{
			num: '02',
			icon: wandIcon,
			title: 'Precision humanizer',
			body: 'Rewrites at the sentence and word level, preserving your meaning while eliminating statistical AI fingerprints — burstiness, perplexity, vocabulary homogeneity.'
		},
		{
			num: '03',
			icon: shieldIcon,
			title: 'Your text stays yours',
			body: 'No logging, no training on your submissions. Text is processed in-memory and discarded. SOC 2 Type II in progress.'
		}
	];

	const logos = [
		'Northwestern',
		'Stanford Writing Lab',
		'ContentForge',
		'Penguin Labs',
		'EditorSuite',
		'Verity Press'
	];
</script>

<!-- ═══════════════════════════════════════════════════════════════════════════
     HERO
════════════════════════════════════════════════════════════════════════════ -->
<section style="
	background: var(--color-bg-base);
	padding: 80px 48px 64px;
">
	<div style="max-width: 1200px; margin: 0 auto;">
		<!-- Kicker -->
		<Reveal delay={0}>
			<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 28px;">
				<span style="
					display: inline-block;
					width: 7px;
					height: 7px;
					border-radius: 50%;
					background: var(--color-human);
					animation: pulse-dot 1.5s infinite;
					flex-shrink: 0;
				"></span>
				<span style="
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 11px;
					font-weight: 600;
					color: var(--color-text-muted);
					letter-spacing: 0.12em;
					text-transform: uppercase;
				">v2.0 · Own-model precision · 98.2% accuracy</span>
			</div>
		</Reveal>

		<!-- H1 -->
		<Reveal delay={80}>
			<h1 style="
				font-family: 'Newsreader', Georgia, serif;
				font-size: clamp(52px, 7.3vw, 88px);
				line-height: 0.98;
				letter-spacing: -0.025em;
				color: var(--color-text-primary);
				font-weight: 400;
				margin: 0 0 28px;
				max-width: 900px;
			">
				Humanize what <em style="font-style: italic; color: var(--color-brand);">AI</em><br/>
				<em style="font-style: italic; color: var(--color-human);">writes.</em>
			</h1>
		</Reveal>

		<!-- Subtitle -->
		<Reveal delay={200}>
			<p style="
				font-family: 'Space Grotesk', system-ui, sans-serif;
				font-size: 19px;
				line-height: 1.6;
				color: var(--color-text-secondary);
				max-width: 560px;
				margin: 0 0 36px;
			">
				Detect AI-generated text with forensic precision. Rewrite it so it reads like a person wrote it — because a person is using the tool.
			</p>
		</Reveal>

		<!-- CTAs -->
		<Reveal delay={300}>
			<div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
				<Button variant="primary" size="lg" iconRight={arrowR} onclick={() => goto('/detect')}>
					Try the detector
				</Button>
				<Button variant="secondary" size="lg" onclick={() => goto('/pricing')}>
					See pricing
				</Button>
			</div>
		</Reveal>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     LOGO MARQUEE
════════════════════════════════════════════════════════════════════════════ -->
<Reveal delay={400}>
	<section style="
		background: var(--color-bg-base);
		padding: 0 0 64px;
		overflow: hidden;
	">
		<div style="max-width: 1200px; margin: 0 auto; padding: 0 48px;">
			<p style="
				font-family: 'Space Grotesk', system-ui, sans-serif;
				font-size: 11px;
				font-weight: 600;
				color: var(--color-text-dim);
				letter-spacing: 0.14em;
				text-transform: uppercase;
				margin: 0 0 16px;
			">Trusted at —</p>
		</div>

		<div style="
			position: relative;
			overflow: hidden;
			mask-image: linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent);
			-webkit-mask-image: linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent);
		">
			<div style="
				display: flex;
				gap: 56px;
				animation: hai-marquee 40s linear infinite;
				width: max-content;
			">
				<!-- Two copies for seamless loop -->
				{#each [logos, logos] as group}
					{#each group as logo}
						<span style="
							font-family: 'Newsreader', Georgia, serif;
							font-size: 22px;
							font-style: italic;
							color: var(--color-text-muted);
							white-space: nowrap;
							flex-shrink: 0;
						">{logo}</span>
					{/each}
				{/each}
			</div>
		</div>
	</section>
</Reveal>

<!-- ═══════════════════════════════════════════════════════════════════════════
     LIVE DEMO CARD
════════════════════════════════════════════════════════════════════════════ -->
<section style="
	background: var(--color-bg-base);
	padding: 0 48px 80px;
">
	<div style="max-width: 1200px; margin: 0 auto;">
		<!-- Card -->
		<div style="
			background: var(--color-bg-surface);
			border-radius: 14px;
			box-shadow: inset 0 0 0 1px var(--color-bg-border);
			overflow: hidden;
		">
			<!-- Card header -->
			<div style="
				background: var(--color-bg-sunk);
				border-bottom: 1px solid var(--color-bg-border);
				padding: 14px 20px;
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 12px;
			">
				<div style="display: flex; align-items: center; gap: 8px;">
					<span style="
						display: inline-block;
						width: 8px;
						height: 8px;
						border-radius: 50%;
						background: var(--color-brand);
					"></span>
					<span style="
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 11px;
						font-weight: 600;
						color: var(--color-text-secondary);
						letter-spacing: 0.1em;
						text-transform: uppercase;
					">Live Demo · No login required</span>
				</div>
				<span style="
					font-family: 'JetBrains Mono', monospace;
					font-size: 11px;
					color: var(--color-text-muted);
					background: var(--color-bg-elevated);
					padding: 3px 8px;
					border-radius: 4px;
					box-shadow: inset 0 0 0 1px var(--color-bg-border);
				">POST /api/detect</span>
			</div>

			<!-- Two-column body -->
			<div style="
				display: grid;
				grid-template-columns: 1fr 380px;
				min-height: 420px;
			" class="demo-grid">
				<!-- Left: editor -->
				<div style="
					padding: 24px;
					border-right: 1px solid var(--color-bg-border);
					display: flex;
					flex-direction: column;
					gap: 16px;
				" class="demo-left">
					<TextEditor
						bind:value={demoText}
						placeholder="Paste or type text to analyze (min 50 chars)…"
						minChars={50}
						maxChars={10000}
					/>

					<div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
						<Button
							variant="primary"
							size="md"
							icon={scanIcon}
							disabled={demoText.length < 50 || demoState === 'analyzing'}
							loading={demoState === 'analyzing'}
							onclick={runDemo}
						>
							Analyze
						</Button>
						{#if demoState !== 'ready'}
							<Button variant="secondary" size="md" onclick={resetDemo}>Reset</Button>
						{/if}
						<span style="
							font-family: 'JetBrains Mono', monospace;
							font-size: 11px;
							color: var(--color-text-muted);
							margin-left: auto;
						">{wordCount} words</span>
					</div>
				</div>

				<!-- Right: result panel -->
				<div style="
					padding: 24px;
					background: var(--color-bg-surface);
					display: flex;
					align-items: center;
					justify-content: center;
					flex-direction: column;
					gap: 16px;
					text-align: center;
				" class="demo-right">
					{#if demoState === 'ready'}
						<!-- Ready state -->
						<div style="
							width: 56px;
							height: 56px;
							border-radius: 14px;
							background: var(--color-bg-elevated);
							box-shadow: inset 0 0 0 1px var(--color-bg-border);
							display: flex;
							align-items: center;
							justify-content: center;
						">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d={scanIcon} />
							</svg>
						</div>
						<p style="
							font-family: 'Space Grotesk', system-ui, sans-serif;
							font-size: 14px;
							color: var(--color-text-muted);
							margin: 0;
							max-width: 200px;
							line-height: 1.6;
						">Paste text and click Analyze</p>

					{:else if demoState === 'analyzing'}
						<!-- Analysis pulse -->
						<div style="position: relative; width: 160px; height: 160px;">
							<svg width="160" height="160" viewBox="0 0 160 160" fill="none" style="position: absolute; inset: 0;" aria-hidden="true">
								<circle cx="80" cy="80" r="60" stroke="var(--color-bg-border)" stroke-width="8" fill="none"/>
								<circle
									cx="80" cy="80" r="60"
									stroke="var(--color-brand)"
									stroke-width="8"
									fill="none"
									stroke-linecap="round"
									stroke-dasharray="40 400"
									style="animation: hai-spin 1.4s linear infinite; transform-origin: 80px 80px;"
								/>
							</svg>
							<div style="
								position: absolute;
								inset: 0;
								display: flex;
								align-items: center;
								justify-content: center;
							">
								<span style="
									font-family: 'JetBrains Mono', monospace;
									font-size: 22px;
									color: var(--color-brand);
									animation: hai-dots 1.4s ease-in-out infinite;
									letter-spacing: 0.12em;
								">···</span>
							</div>
						</div>
						<p style="
							font-family: 'Space Grotesk', system-ui, sans-serif;
							font-size: 11px;
							font-weight: 600;
							color: var(--color-text-muted);
							letter-spacing: 0.1em;
							text-transform: uppercase;
							margin: 0;
						">Scanning {wordCount} words</p>

					{:else if demoState === 'result' && demoResult}
						<!-- Result -->
						<ScoreGauge
							aiProbability={demoResult.ai_probability}
							classification={demoResult.classification as any}
							size={240}
							animate={true}
						/>
						<ClassificationBadge classification={demoResult.classification as any} />
						<Button
							variant="secondary"
							size="sm"
							onclick={() => goto('/humanize')}
						>
							Humanize this text
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     FEATURES
════════════════════════════════════════════════════════════════════════════ -->
<section style="
	background: var(--color-bg-base);
	padding: 80px 48px;
">
	<div style="max-width: 1200px; margin: 0 auto;">
		<Reveal delay={0}>
			<h2 style="
				font-family: 'Newsreader', Georgia, serif;
				font-size: 40px;
				font-weight: 400;
				color: var(--color-text-primary);
				margin: 0 0 48px;
				letter-spacing: -0.02em;
			">A forensics tool, not a toy.</h2>
		</Reveal>

		<div style="
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 20px;
		" class="features-grid">
			{#each features as feat, i}
				<Reveal delay={i * 100}>
					<div class="hai-hover-lift" style="
						background: var(--color-bg-surface);
						border-radius: 14px;
						box-shadow: inset 0 0 0 1px var(--color-bg-border);
						padding: 28px;
						height: 100%;
					">
						<div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px;">
							<!-- Icon box -->
							<div style="
								width: 40px;
								height: 40px;
								border-radius: 10px;
								background: var(--color-brand-muted);
								display: flex;
								align-items: center;
								justify-content: center;
								flex-shrink: 0;
							">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<path d={feat.icon} />
								</svg>
							</div>
							<!-- Mono label -->
							<span style="
								font-family: 'JetBrains Mono', monospace;
								font-size: 11px;
								color: var(--color-text-dim);
							">{feat.num}</span>
						</div>

						<h3 style="
							font-family: 'Space Grotesk', system-ui, sans-serif;
							font-size: 16px;
							font-weight: 700;
							color: var(--color-text-primary);
							margin: 0 0 10px;
						">{feat.title}</h3>

						<p style="
							font-family: 'Space Grotesk', system-ui, sans-serif;
							font-size: 14px;
							line-height: 1.65;
							color: var(--color-text-secondary);
							margin: 0;
						">{feat.body}</p>
					</div>
				</Reveal>
			{/each}
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     PRICING
════════════════════════════════════════════════════════════════════════════ -->
<section style="
	background: var(--color-bg-base);
	padding: 0 48px 96px;
">
	<div style="max-width: 1200px; margin: 0 auto;">
		<Reveal delay={0}>
			<div style="margin-bottom: 48px;">
				<h2 style="
					font-family: 'Newsreader', Georgia, serif;
					font-size: 40px;
					font-weight: 400;
					color: var(--color-text-primary);
					margin: 0 0 8px;
					letter-spacing: -0.02em;
				">Simple pricing.</h2>
				<p style="
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 15px;
					color: var(--color-text-secondary);
					margin: 0;
				">7-day free trial · cancel anytime</p>
			</div>
		</Reveal>

		<div style="
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 20px;
			align-items: start;
		" class="pricing-grid">
			{#each plans as plan, i}
				<Reveal delay={i * 80}>
					<div style="
						background: {plan.highlight ? 'rgba(99,102,241,0.06)' : 'var(--color-bg-surface)'};
						border-radius: 14px;
						box-shadow: inset 0 0 0 1px {plan.highlight ? 'var(--color-brand)' : 'var(--color-bg-border)'};
						{plan.highlight ? 'box-shadow: inset 0 0 0 1px var(--color-brand), 0 0 40px var(--color-brand-glow);' : ''}
						padding: 28px;
						position: relative;
					">
						{#if plan.highlight}
							<div style="
								position: absolute;
								top: -12px;
								left: 50%;
								transform: translateX(-50%);
								background: var(--color-brand);
								color: white;
								font-family: 'Space Grotesk', system-ui, sans-serif;
								font-size: 11px;
								font-weight: 700;
								letter-spacing: 0.08em;
								text-transform: uppercase;
								padding: 4px 12px;
								border-radius: 99px;
								white-space: nowrap;
							">Recommended</div>
						{/if}

						<p style="
							font-family: 'Space Grotesk', system-ui, sans-serif;
							font-size: 13px;
							font-weight: 600;
							color: var(--color-text-secondary);
							margin: 0 0 8px;
							letter-spacing: 0.04em;
							text-transform: uppercase;
						">{plan.name}</p>

						<div style="display: flex; align-items: baseline; gap: 4px; margin-bottom: 6px;">
							<span style="
								font-family: 'Newsreader', Georgia, serif;
								font-size: 48px;
								font-weight: 400;
								color: var(--color-text-primary);
								line-height: 1;
							">{plan.price}</span>
							{#if plan.period}
								<span style="
									font-family: 'Space Grotesk', system-ui, sans-serif;
									font-size: 14px;
									color: var(--color-text-muted);
								">{plan.period}</span>
							{/if}
						</div>

						{#if plan.savings}
							<p style="
								font-family: 'JetBrains Mono', monospace;
								font-size: 11px;
								color: var(--color-human);
								margin: 0 0 20px;
							">{plan.savings}</p>
						{:else}
							<div style="margin-bottom: 20px;"></div>
						{/if}

						<ul style="
							list-style: none;
							padding: 0;
							margin: 0 0 24px;
							display: flex;
							flex-direction: column;
							gap: 10px;
						">
							{#each plan.features as feat}
								<li style="display: flex; align-items: center; gap: 10px;">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-human)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink: 0;">
										<path d={checkIcon} />
									</svg>
									<span style="
										font-family: 'Space Grotesk', system-ui, sans-serif;
										font-size: 13.5px;
										color: var(--color-text-secondary);
									">{feat}</span>
								</li>
							{/each}
						</ul>

						<Button
							variant={plan.highlight ? 'primary' : 'secondary'}
							size="md"
							onclick={() => goto('/register')}
						>
							{plan.price === '$0' ? 'Get started free' : `Start ${plan.name}`}
						</Button>
					</div>
				</Reveal>
			{/each}
		</div>
	</div>
</section>

<style>
	@media (max-width: 900px) {
		.features-grid, .pricing-grid {
			grid-template-columns: 1fr !important;
		}
		.demo-grid {
			grid-template-columns: 1fr !important;
		}
		.demo-left {
			border-right: none !important;
			border-bottom: 1px solid var(--color-bg-border);
		}
	}
</style>
