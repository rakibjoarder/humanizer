<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { openLoginModal } from '$lib/stores/loginModal';
	import { openRegisterModal } from '$lib/stores/registerModal';
	import Reveal from '$lib/components/Reveal.svelte';
	import PricingCard from '$lib/components/PricingCard.svelte';
	import SEO from '$lib/components/SEO.svelte';

	const homeJsonLd = {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				'@id': 'https://humanizeaiwrite.com/#website',
				url: 'https://humanizeaiwrite.com',
				name: 'HumanizeAIWrite',
				description:
					'Humanize AI-generated text and check drafts with an AI detector — built for essays, articles, and professional writing.',
				potentialAction: {
					'@type': 'SearchAction',
					target: { '@type': 'EntryPoint', urlTemplate: 'https://humanizeaiwrite.com/detect?q={search_term_string}' },
					'query-input': 'required name=search_term_string'
				}
			},
			{
				'@type': 'SoftwareApplication',
				name: 'HumanizeAIWrite',
				applicationCategory: 'UtilitiesApplication',
				operatingSystem: 'Web',
				url: 'https://humanizeaiwrite.com',
				description:
					'Make ChatGPT, Claude, Gemini, and other AI drafts read more naturally — with detection and humanizing in one workflow.',
				offers: {
					'@type': 'Offer',
					price: '9.99',
					priceCurrency: 'USD',
					availability: 'https://schema.org/InStock',
					priceValidUntil: '2026-12-31'
				},
				aggregateRating: {
					'@type': 'AggregateRating',
					ratingValue: '4.8',
					reviewCount: '320'
				},
				featureList: [
					'Bypass GPTZero AI detection',
					'Bypass Turnitin AI detection',
					'Humanize ChatGPT text',
					'AI essay humanizer for students',
					'Make AI writing undetectable'
				]
			},
			{
				'@type': 'FAQPage',
				mainEntity: [
					{
						'@type': 'Question',
						name: 'Can HumanizeAIWrite bypass Turnitin AI detection?',
						acceptedAnswer: { '@type': 'Answer', text: "Yes. Our humanizer rewrites AI-generated text to closely mimic natural human writing patterns, making it significantly harder for Turnitin's AI detector to flag." }
					},
					{
						'@type': 'Question',
						name: 'Does it work with ChatGPT, Claude, and other AI outputs?',
						acceptedAnswer: { '@type': 'Answer', text: 'Yes — paste text from ChatGPT, Claude, Gemini, or any AI tool and our engine rewrites it into natural human-style prose.' }
					},
					{
						'@type': 'Question',
						name: 'Is my text kept private?',
						acceptedAnswer: { '@type': 'Answer', text: 'Yes. We do not sell or share your text with third parties. Submitted text is used solely to produce your humanized output.' }
					},
					{
						'@type': 'Question',
						name: 'How many free detections do I get?',
						acceptedAnswer: { '@type': 'Answer', text: 'Free accounts get 2 lifetime AI detections. Upgrade to Pro for unlimited detections and 100 humanization credits per month.' }
					}
				]
			}
		]
	};

	let { data } = $props();

	type BillingCycle = 'monthly' | 'yearly';
	let billingCycle = $state<BillingCycle>('monthly');
	let openFaq = $state<number | null>(null);

	const isPro = $derived(
		data.profile?.plan === 'basic' || data.profile?.plan === 'pro' || data.profile?.plan === 'ultra'
	);

	function stashAndGoto(path: '/humanize' | '/detect') {
		if (path === '/humanize' && !data.user) {
			openLoginModal('/humanize');
			return;
		}
		goto(path);
	}

	function toggleFaq(i: number) {
		openFaq = openFaq === i ? null : i;
	}

	// ── Step demo state ─────────────────────────────────────────────────────────
	const SAMPLE_DETECT_TEXT =
		"In today's rapidly evolving digital landscape, AI-generated content often follows predictable patterns that detectors can easily identify.";
	const HUMANIZED_OUTPUT =
		'AI-generated writing can sometimes sound predictable, which makes it easier for detectors to flag. This rewrite keeps the same idea but uses a more natural, human tone.';

	let demoTriggered = $state(false);
	let detectTypingText = $state(SAMPLE_DETECT_TEXT);
	let isTypingDetect = $state(false);
	let detectActive = $state(false);

	let humanizeReady = $state(false);
	let humanizeDone = $state(false);
	let humanizedDisplayText = $state('');
	let isTypingHumanize = $state(false);

	let verifyReady = $state(false);
	let verifyDone = $state(false);

	let stepsEl: HTMLElement | null = $state(null);

	function sleep(ms: number): Promise<void> {
		return new Promise((r) => setTimeout(r, ms));
	}

	async function runAutoDemo() {
		detectTypingText = '';
		isTypingDetect = true;
		let i = 0;
		await new Promise<void>((resolve) => {
			const t = setInterval(() => {
				i++;
				detectTypingText = SAMPLE_DETECT_TEXT.slice(0, i);
				if (i >= SAMPLE_DETECT_TEXT.length) {
					clearInterval(t);
					resolve();
				}
			}, 18);
		});
		isTypingDetect = false;
		detectActive = true;
		humanizeReady = true;

		await sleep(700);
		await sleep(650);
		humanizeDone = true;
		humanizedDisplayText = '';
		isTypingHumanize = true;
		i = 0;
		await new Promise<void>((resolve) => {
			const t = setInterval(() => {
				i++;
				humanizedDisplayText = HUMANIZED_OUTPUT.slice(0, i);
				if (i >= HUMANIZED_OUTPUT.length) {
					clearInterval(t);
					resolve();
				}
			}, 16);
		});
		isTypingHumanize = false;
		verifyReady = true;

		await sleep(700);
		await sleep(750);
		verifyDone = true;
	}

	onMount(() => {
		let io: IntersectionObserver | null = null;
		if (stepsEl) {
			io = new IntersectionObserver(
				(entries) => {
					entries.forEach((e) => {
						if (e.isIntersecting && !demoTriggered) {
							demoTriggered = true;
							setTimeout(() => runAutoDemo(), 550);
						}
					});
				},
				{ threshold: 0.22 }
			);
			io.observe(stepsEl);
		}
		return () => {
			io?.disconnect();
		};
	});

	const homeFaqs = [
		{
			q: 'What is the AI Detector?',
			a: 'It estimates how likely your pasted text was produced by an AI model and gives a classification (e.g. likely AI vs likely human). Free accounts get a limited number of scans per our pricing page.'
		},
		{
			q: 'What is the Humanizer?',
			a: 'It rewrites text to read more naturally while keeping your meaning. Humanizing is included on Pro; Free is focused on trying detection.'
		},
		{
			q: 'How does the free tier work?',
			a: 'Guests can try one preview detection in the browser. After you sign up, Free includes a small number of lifetime detections with a per-scan word cap — see pricing for current numbers.'
		},
		{
			q: 'Do you train on my content?',
			a: "No. We don't use your submissions to train public models. Text is processed to deliver the result; we're clear about retention in our Privacy Policy."
		}
	];
</script>

<SEO
	title="AI Humanizer & Detector | HumanizeAIWrite"
	description="Humanize ChatGPT, Claude, Gemini, and other AI drafts—and scan for AI-like patterns before you publish. Free detector tier; humanizer on Pro."
	canonical="https://humanizeaiwrite.com"
	jsonLd={homeJsonLd}
/>

<!-- ══════════════════════════════════════════════════════════════════════
     HERO
══════════════════════════════════════════════════════════════════════ -->
<section class="hero-bg">
	<div class="hero-container">
		<!-- Left -->
		<div class="hero-left">
			<div class="fade-up hero-badge">✦ AI Humanizer &amp; Detector</div>
			<h1 class="fade-up d1 hero-h1">
				<span style="white-space: nowrap;">Humanize AI text.</span><br />Outsmart <span style="color: var(--color-brand)">AI detectors.</span>
			</h1>
			<p class="fade-up d2 hero-sub">
				Make AI-generated content sound natural, human, and trustworthy — in seconds.
			</p>
			<div class="fade-up d4 hero-cta-row">
			<button class="btn-primary" onclick={() => (data.user ? goto('/humanize') : openRegisterModal('/humanize'))}>
				Start writing for free →
			</button>
				<button class="btn-outline" onclick={() => document.getElementById('steps')?.scrollIntoView({ behavior: 'smooth' })}>
					▷ See how it works
				</button>
			</div>
		</div>

		<!-- Right: floating visual -->
		<div class="hero-visual">
			<div class="dot-grid hero-dot-grid"></div>
			<div class="hero-glow-blob"></div>

			<!-- Top input card -->
			<div class="soft-card hero-card-top">
				<div class="card-header">
					<span>Your text</span>
					<span>240 / 3,000 words</span>
				</div>
				<div class="card-body-text">
					In today's <mark class="mark-ai">rapidly evolving</mark> digital landscape, organizations must
					continuously adapt to remain competitive, efficient, and relevant. Success is no longer defined
					solely by the quality of products or services, but by the ability to
					<mark class="mark-ai">integrate technology, data</mark>, and human insight.
				</div>
			</div>

			<!-- Alert badge -->
			<div class="soft-card hero-alert">
				AI patterns detected<br />
				<span style="color: var(--color-ai); opacity: 0.8;">High AI probability</span>
			</div>

			<!-- Bottom output card -->
			<div class="soft-card hero-card-bottom">
				<div class="card-header">
					<span>Humanized output</span>
					<span class="chip-human">Human-written</span>
				</div>
				<div class="card-body-text">
					In today's fast-changing digital world, organizations need to stay adaptable, efficient, and
					relevant to stay ahead. It's not just about offering great products or services anymore—success
					comes from combining technology, data, and human insight in a way that drives results.
				</div>
			</div>

			<!-- Feature bar -->
			<div class="soft-card hero-feature-bar">
				<span class="feat-chip">✓ Meaning preserved</span>
				<span class="feat-chip">✓ Natural phrasing</span>
				<span class="feat-chip">✓ Bypasses AI detectors</span>
			</div>
		</div>
	</div>
</section>

<!-- ══════════════════════════════════════════════════════════════════════
     TRUST MARQUEE
══════════════════════════════════════════════════════════════════════ -->
<section class="trust-marquee-section">
	<div class="trust-marquee-card soft-card">
		<p class="trust-marquee-label">Trusted by writers and teams worldwide</p>
		<div class="marquee-wrap">
			<div class="marquee-track">
				<div class="marquee-group">
					<span class="logo-text">QuillBot</span>
					<span class="logo-text">turnitin</span>
					<span class="logo-text">◎ GPTZero</span>
					<span class="logo-text">Originality.ai</span>
					<span class="logo-text">Copyleaks</span>
				</div>
				<div class="marquee-group">
					<span class="logo-text">QuillBot</span>
					<span class="logo-text">turnitin</span>
					<span class="logo-text">◎ GPTZero</span>
					<span class="logo-text">Originality.ai</span>
					<span class="logo-text">Copyleaks</span>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ══════════════════════════════════════════════════════════════════════
     STEPS — HOW IT WORKS
══════════════════════════════════════════════════════════════════════ -->
<section id="steps" class="steps-section" bind:this={stepsEl}>
	<div class="steps-container">
		<div class="steps-header reveal">
			<div>
				<p class="steps-eyebrow">How it works</p>
				<h2 class="steps-h2">From AI to Human in 3 simple steps</h2>
			</div>
			<button class="btn-primary steps-try-btn" onclick={() => stashAndGoto('/humanize')}>
				Try it live →
			</button>
		</div>

		<div class="steps-grid">
			<!-- Step 1: Detect -->
			<div class="step-card reveal" class:detect-active={detectActive}>
				<div class="step-head">
					<span class="step-num">1</span>
					<div>
						<h3 class="step-title">Detect AI content</h3>
						<p class="step-desc">Watch the detector analyze the sample text automatically.</p>
					</div>
				</div>

				<div class="detect-stage">
					<!-- Placeholder: typing view -->
					<div class="detect-placeholder soft-card" class:hidden={detectActive}>
						<p class="card-label">Sample input</p>
						<div class="typing-box" class:is-typing={isTypingDetect}>{detectTypingText}</div>
						<div class="step-action-btn">
							<span>{isTypingDetect ? 'Scanning...' : 'Detecting AI...'}</span>
						</div>
					</div>

					<!-- Result view -->
					<div class="detect-result soft-card" class:hidden={!detectActive}>
						<div class="detect-result-top">
							<p class="card-label">AI Detection Result</p>
							<span class="badge-ai">High AI</span>
						</div>
						<div class="detect-result-body">
							<div class="gauge-wrap">
								<svg class="gauge-svg" viewBox="0 0 100 100">
									<circle cx="50" cy="50" r="42" fill="none" stroke="#fee2e2" stroke-width="8" />
									<circle cx="50" cy="50" r="42" fill="none" stroke="#ef4444" stroke-width="8"
										stroke-dasharray="264" stroke-dashoffset="26" stroke-linecap="round"
										transform="rotate(-90 50 50)" />
								</svg>
								<div class="gauge-center">
									<p class="gauge-num">99%</p>
								</div>
							</div>
							<div class="detect-bars">
								<div>
									<div class="bar-label">
										<span>AI-generated</span><span>99%</span>
									</div>
									<div class="bar-track"><div class="bar-fill bar-fill-ai" style="width:95%"></div></div>
								</div>
								<div>
									<div class="bar-label">
										<span>Human-written</span><span>1%</span>
									</div>
									<div class="bar-track"><div class="bar-fill bar-fill-human" style="width:5%"></div></div>
								</div>
							</div>
						</div>
						<div class="detect-note">
							This text shows strong AI patterns and is highly likely to be generated by AI.
						</div>
					</div>
				</div>
			</div>

			<!-- Arrow -->
			<div class="step-arrow arrow-animate">→</div>

			<!-- Step 2: Humanize -->
			<div class="step-card reveal" style="opacity: {humanizeReady ? 1 : 0.55}; transition: opacity .35s ease;">
				<div class="step-head">
					<span class="step-num">2</span>
					<div>
						<h3 class="step-title">Humanize the text</h3>
						<p class="step-desc">Once detection is complete, the text is humanized automatically.</p>
					</div>
				</div>
				<div class="soft-card step-demo">
					{#if !humanizeReady}
						<div class="waiting-state">
							<span class="waiting-icon">↳</span>
							<p class="waiting-text">Waiting for AI detection result...</p>
						</div>
					{:else if !humanizeDone}
						<div class="humanize-active-state">
							<div>
								<p class="card-label">Detected text</p>
								<p class="humanize-input-text">AI-generated content often follows predictable patterns that detectors can easily identify.</p>
							</div>
							<div class="step-action-btn mt-auto">Humanizing text...</div>
						</div>
					{:else}
						<div class="humanize-output-state">
							<p class="card-label" style="color:#059669">Humanized output</p>
							<div class="typing-box" class:is-typing={isTypingHumanize}>{humanizedDisplayText}</div>
							<div class="output-chips">
								<span class="output-chip">✓ Natural tone</span>
								<span class="output-chip">✓ Meaning preserved</span>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Arrow -->
			<div class="step-arrow arrow-animate">→</div>

			<!-- Step 3: Verify -->
			<div class="step-card reveal" style="opacity: {verifyReady ? 1 : 0.55}; transition: opacity .35s ease;">
				<div class="step-head">
					<span class="step-num">3</span>
					<div>
						<h3 class="step-title">Pass AI detectors</h3>
						<p class="step-desc">After humanizing, the final detector result appears automatically.</p>
					</div>
				</div>
				<div class="soft-card step-demo" style="text-align: center;">
					{#if !verifyReady}
						<div class="waiting-state">
							<span class="waiting-icon">✓</span>
							<p class="waiting-text">Waiting for humanized text...</p>
						</div>
					{:else if !verifyDone}
						<div class="humanize-active-state">
							<div>
								<p class="verify-tool-name">QuillBot <span class="verify-tool-ver">v5.9.1</span></p>
								<p style="margin-top:20px; font-size:14px; line-height:1.7; color:var(--color-text-secondary); text-align:left">Humanized text is ready. Run a detector check to verify the result.</p>
							</div>
							<div class="step-action-btn mt-auto" style="margin-top: auto;">Verifying result...</div>
						</div>
					{:else}
						<div class="verify-output-state">
							<p class="verify-tool-name" style="text-align:left">QuillBot <span class="verify-tool-ver">v5.9.1</span></p>
							<div class="verify-gauge-wrap">
								<svg class="verify-gauge-svg" viewBox="0 0 100 100">
									<circle cx="50" cy="50" r="45" fill="none" stroke="#ecfdf5" stroke-width="8" />
									<circle cx="50" cy="50" r="45" fill="none" stroke="#059669" stroke-width="8"
										stroke-linecap="round" stroke-dasharray="283" stroke-dashoffset="283"
										class="verify-ring" transform="rotate(-90 50 50)" />
								</svg>
								<div class="verify-gauge-center">
									<p class="verify-score">0<span style="font-size:20px">%</span></p>
								</div>
							</div>
							<p style="color:var(--color-text-secondary); margin-top:16px">of text is likely AI</p>
							<span class="badge-human-written">✓ Human-written</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ══════════════════════════════════════════════════════════════════════
     FEATURES
══════════════════════════════════════════════════════════════════════ -->
<section id="features" class="features-section">
	<div class="features-container">
		<Reveal>
			<div class="features-card">
				<div class="features-left">
					<p class="features-eyebrow">Beyond rewriting</p>
					<h2 class="features-h2">Intelligent writing,<br />built for real results</h2>
					<p class="features-sub">HumanizeAIWrite goes beyond simple rewriting. It helps you understand, improve, and publish with complete confidence.</p>
					<button class="btn-white" onclick={() => goto('/pricing')}>Explore all features →</button>
				</div>
				<div class="features-grid">
					<div class="feature-item">
						<div class="mini-icon mb-5">⌁</div>
						<h3 class="feature-title">Smart detection</h3>
						<p class="feature-body">Advanced AI detection with clear breakdowns and actionable insights.</p>
						<div class="soft-card feature-demo-card">
							<p style="font-size:12px; font-weight:800; color:var(--color-text-primary)">Signal breakdown</p>
							<div style="margin-top:16px; display:flex; flex-direction:column; gap:10px;">
								<div style="height:8px; border-radius:999px; background:#6ee7b7;"></div>
								<div style="height:8px; border-radius:999px; background:#f87171;"></div>
								<div style="height:8px; border-radius:999px; background:#fdba74; width:75%;"></div>
							</div>
						</div>
					</div>
					<div class="feature-item">
						<div class="mini-icon mb-5">✦</div>
						<h3 class="feature-title">Natural rewriting</h3>
						<p class="feature-body">Human-like rewrites that keep your meaning, tone, and intent intact.</p>
						<div class="soft-card feature-demo-card">
							<div style="display:flex; flex-direction:column; gap:10px;">
								<div style="height:12px; border-radius:999px; background:#e2e8f0;"></div>
								<div style="height:12px; border-radius:999px; background:#e2e8f0; width:91%;"></div>
								<div style="height:12px; border-radius:999px; background:#6ee7b7; width:66%;"></div>
								<div style="height:12px; border-radius:999px; background:#a7f3d0; width:83%;"></div>
							</div>
						</div>
					</div>
					<div class="feature-item">
						<div class="mini-icon mb-5">✓</div>
						<h3 class="feature-title">Built for real use</h3>
						<p class="feature-body">Designed to pass real detectors and protect your integrity.</p>
						<div class="soft-card feature-demo-card">
							<p style="font-size:14px; font-weight:700; color:var(--color-text-primary); line-height:2;">
								✓ Passes AI detectors<br />
								✓ Meaning preserved<br />
								✓ Plagiarism safe<br />
								✓ Privacy focused
							</p>
						</div>
					</div>
				</div>
			</div>
		</Reveal>
	</div>
</section>

<!-- ══════════════════════════════════════════════════════════════════════
     CTA DARK
══════════════════════════════════════════════════════════════════════ -->
<section class="cta-section">
	<div class="cta-container">
		<Reveal>
			<div class="cta-card">
				<h2 class="cta-h2">Ready to make your writing <span style="color:#6ee7b7">undetectable?</span></h2>
				<p class="cta-sub">Join thousands of writers who create with AI and publish with confidence.</p>
			<button class="btn-white" style="margin-top:36px; padding: 16px 40px; font-size:15px;" onclick={() => (data.user ? goto('/humanize') : openRegisterModal('/humanize'))}>
				Start for free →
			</button>
				<p style="margin-top:20px; font-size:14px; color:rgba(255,255,255,.55);">No credit card required</p>
			</div>
		</Reveal>
	</div>
</section>

<!-- ══════════════════════════════════════════════════════════════════════
     PRICING
══════════════════════════════════════════════════════════════════════ -->
{#if !isPro}
	<section class="pricing-section">
		<div class="pricing-container">
			<Reveal>
				<div style="margin-bottom: 40px; text-align: center;">
					<h2 class="section-h2">Simple pricing.</h2>
					<div class="billing-toggle" role="group" aria-label="Billing cycle">
						<button
							class="billing-btn"
							class:billing-btn-active={billingCycle === 'monthly'}
							onclick={() => (billingCycle = 'monthly')}
							aria-pressed={billingCycle === 'monthly'}
						>Monthly</button>
						<button
							class="billing-btn billing-btn-yearly"
							class:billing-btn-active={billingCycle === 'yearly'}
							onclick={() => (billingCycle = 'yearly')}
							aria-pressed={billingCycle === 'yearly'}
						>
							Yearly
							<span class="save-badge">Save 20%</span>
						</button>
					</div>
				</div>
			</Reveal>
			<div class="pricing-grid">
				<Reveal delay={0}>
					<a href="/pricing" style="display: block; text-decoration: none;">
						<PricingCard plan="basic" {billingCycle} highlighted={false} />
					</a>
				</Reveal>
				<Reveal delay={80}>
					<a href="/pricing" style="display: block; text-decoration: none; padding-top: 16px;">
						<PricingCard plan="pro" {billingCycle} highlighted={true} />
					</a>
				</Reveal>
				<Reveal delay={160}>
					<a href="/pricing" style="display: block; text-decoration: none;">
						<PricingCard plan="ultra" {billingCycle} highlighted={false} />
					</a>
				</Reveal>
			</div>
		</div>
	</section>
{/if}

<!-- ══════════════════════════════════════════════════════════════════════
     FAQ
══════════════════════════════════════════════════════════════════════ -->
<section class="faq-section">
	<div class="faq-container">
		<Reveal>
			<h2 class="section-h2" style="text-align:center; margin-bottom:28px;">FAQ</h2>
		</Reveal>
		<div style="display: flex; flex-direction: column; gap: 10px;">
			{#each homeFaqs as item, i}
				<div class="faq-item">
					<button
						type="button"
						class="faq-trigger"
						aria-expanded={openFaq === i}
						aria-controls="faq-panel-{i}"
						id="faq-trigger-{i}"
						onclick={() => toggleFaq(i)}
					>
						<span class="faq-q">{item.q}</span>
						<span class="faq-chevron" aria-hidden="true">{openFaq === i ? '−' : '+'}</span>
					</button>
					{#if openFaq === i}
						<div class="faq-panel" id="faq-panel-{i}" role="region" aria-labelledby="faq-trigger-{i}">
							<p>{item.a}</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	/* ─── GLOBAL RESET FOR THIS PAGE ─────────────────────────────────── */
	:global(body) {
		background: var(--color-bg-base);
	}

	/* ─── UTILITIES ──────────────────────────────────────────────────── */
	.soft-card {
		border: 1px solid var(--color-bg-border);
		background: var(--color-bg-surface);
		box-shadow: var(--shadow-card);
	}

	.mini-icon {
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: var(--color-brand-muted);
		color: var(--color-brand);
		font-weight: 900;
		flex-shrink: 0;
		font-size: 14px;
	}

	.mb-5 {
		margin-bottom: 20px;
	}

	.mt-auto {
		margin-top: auto;
	}

	.hidden {
		display: none !important;
	}

	/* ─── ANIMATIONS ─────────────────────────────────────────────────── */
	.fade-up {
		opacity: 0;
		transform: translateY(22px);
		animation: fadeUp 0.8s ease forwards;
	}
	.d1 { animation-delay: 0.08s; }
	.d2 { animation-delay: 0.18s; }
	.d4 { animation-delay: 0.38s; }
	@keyframes fadeUp {
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes floatTop {
		0%, 100% { transform: translateY(0) rotate(6deg); }
		50% { transform: translateY(-10px) rotate(6deg); }
	}
	@keyframes floatBottom {
		0%, 100% { transform: translateY(0) rotate(-1deg); }
		50% { transform: translateY(-12px) rotate(-1deg); }
	}
	@keyframes floatBar {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-8px); }
	}
	@keyframes alertPulse {
		0%, 100% { transform: translateY(0) scale(1); }
		50% { transform: translateY(-6px) scale(1.02); }
	}
	@keyframes marqueeAnim {
		from { transform: translateX(0); }
		to { transform: translateX(-50%); }
	}
	@keyframes arrowMove {
		0%, 100% { transform: translateX(0); opacity: 0.55; }
		50% { transform: translateX(8px); opacity: 1; }
	}
	@keyframes blink {
		50% { opacity: 0; }
	}
	@keyframes ringDraw {
		to { stroke-dashoffset: 0; }
	}

	/* ─── HERO ───────────────────────────────────────────────────────── */
	.hero-bg {
		background:
			radial-gradient(circle at 78% 32%, rgba(16, 185, 129, 0.15), transparent 28%),
			radial-gradient(circle at 85% 44%, rgba(16, 185, 129, 0.10), transparent 18%),
			var(--color-bg-base);
		position: relative;
		overflow: hidden;
		padding: 80px 32px 96px;
	}

	.hero-container {
		max-width: 1180px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: 1fr 1.04fr;
		align-items: center;
		gap: 64px;
	}

	.hero-left {
		min-width: 0;
	}

	.hero-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		border-radius: 999px;
		background: var(--color-brand-muted);
		padding: 8px 16px;
		font-size: 11px;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-brand);
		margin-bottom: 28px;
	}

	.hero-h1 {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(36px, 9.5vw, 64px);
		line-height: 1.05;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 32px;
		letter-spacing: -0.045em;
		overflow: visible;
	}

	@media (min-width: 640px) {
		.hero-h1 {
			font-size: 64px;
			line-height: 0.98;
		}
	}

	.hero-sub {
		font-size: 18px;
		line-height: 2;
		color: var(--color-text-secondary);
		margin: 0 0 36px;
		max-width: 560px;
		font-weight: 400;
	}

	.hero-cta-row {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		margin-bottom: 40px;
	}

	.btn-primary {
		border-radius: 12px;
		background: var(--color-brand);
		padding: 14px 28px;
		font-weight: 900;
		font-size: 14px;
		color: #fff;
		border: none;
		cursor: pointer;
		box-shadow: 0 20px 40px var(--color-brand-glow);
		transition: filter 150ms;
		font-family: inherit;
	}
	.btn-primary:hover { filter: brightness(1.07); }

	.btn-outline {
		border-radius: 12px;
		border: 1px solid var(--color-bg-border);
		background: var(--color-bg-surface);
		padding: 14px 28px;
		font-weight: 900;
		font-size: 14px;
		color: var(--color-text-primary);
		cursor: pointer;
		box-shadow: var(--shadow-card);
		transition: background 150ms;
		font-family: inherit;
	}
	.btn-outline:hover { background: var(--color-bg-elevated); }

	.btn-white {
		border-radius: 12px;
		background: var(--color-bg-surface);
		padding: 16px 28px;
		font-weight: 900;
		font-size: 14px;
		color: var(--color-text-primary);
		border: none;
		cursor: pointer;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		transition: filter 150ms;
		font-family: inherit;
	}
	.btn-white:hover { filter: brightness(0.97); }

	/* ─── HERO VISUAL ─────────────────────────────────────────────────── */
	.hero-visual {
		position: relative;
		min-height: 610px;
		overflow: visible;
	}

	.hero-dot-grid {
		position: absolute;
		right: -12px;
		top: 190px;
		height: 330px;
		width: 300px;
		opacity: 0.7;
		background-image: radial-gradient(rgba(5, 150, 105, 0.22) 1px, transparent 1px);
		background-size: 12px 12px;
		border: none !important;
		box-shadow: none !important;
		background-color: transparent !important;
	}

	.hero-glow-blob {
		position: absolute;
		right: 60px;
		top: 40px;
		height: 520px;
		width: 520px;
		border-radius: 50%;
		background: var(--color-brand-glow);
		filter: blur(64px);
		pointer-events: none;
	}

	.hero-card-top {
		position: absolute;
		right: 30px;
		top: 0;
		z-index: 10;
		width: 455px;
		border-radius: 24px;
		padding: 24px;
		animation: floatTop 5.8s ease-in-out infinite;
	}

	.hero-alert {
		position: absolute;
		right: 460px;
		top: 260px;
		z-index: 25;
		width: 190px;
		border-radius: 18px;
		padding: 20px;
		border-color: var(--color-ai-muted) !important;
		background: var(--color-bg-surface) !important;
		font-size: 12px;
		font-weight: 900;
		color: var(--color-ai);
		animation: alertPulse 2.8s ease-in-out infinite;
		line-height: 1.5;
	}

	.hero-card-bottom {
		position: absolute;
		right: 0;
		top: 285px;
		z-index: 40;
		width: 500px;
		border-radius: 24px;
		padding: 24px;
		animation: floatBottom 6.8s ease-in-out infinite;
	}

	.hero-feature-bar {
		position: absolute;
		right: 0;
		bottom: -20px;
		width: 500px;
		z-index: 30;
		border-radius: 16px;
		padding: 12px 20px;
		animation: floatBar 6.2s ease-in-out infinite;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		align-items: center;
		background: var(--color-bg-surface) !important;
		box-shadow: var(--shadow-card) !important;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		font-size: 11px;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-muted);
	}

	.chip-human {
		border-radius: 999px;
		background: var(--color-brand-muted);
		padding: 4px 12px;
		color: var(--color-brand);
		font-weight: 800;
		font-size: 11px;
	}

	.card-body-text {
		border-radius: 16px;
		border: 1px solid var(--color-bg-border);
		background: var(--color-bg-elevated);
		padding: 24px;
		font-size: 13px;
		font-weight: 600;
		line-height: 2;
		color: var(--color-text-secondary);
	}

	.mark-ai {
		border-radius: 4px;
		background: var(--color-ai-muted);
		padding: 0 4px;
		color: var(--color-ai);
	}

	.feat-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		white-space: nowrap;
		border-radius: 999px;
		background: var(--color-brand-muted);
		padding: 8px 12px;
		font-size: 11px;
		font-weight: 900;
		color: var(--color-brand);
	}

	/* ─── TRUST MARQUEE ──────────────────────────────────────────────── */
	.trust-marquee-section {
		max-width: 1180px;
		margin: -32px auto 0;
		position: relative;
		z-index: 10;
		padding: 0 32px;
	}

	.trust-marquee-card {
		border-radius: 20px;
		padding: 32px;
		text-align: center;
	}

	.trust-marquee-label {
		margin: 0 0 28px;
		font-size: 11px;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-text-muted);
	}

	.marquee-wrap {
		overflow: hidden;
		-webkit-mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
		mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
	}

	.marquee-track {
		display: flex;
		width: max-content;
		animation: marqueeAnim 22s linear infinite;
		will-change: transform;
	}

	.marquee-group {
		display: flex;
		align-items: center;
		gap: 72px;
		padding-right: 72px;
		flex-shrink: 0;
	}

	.logo-text {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 22px;
		font-weight: 900;
		color: var(--color-text-primary);
		white-space: nowrap;
	}

	/* ─── STEPS ──────────────────────────────────────────────────────── */
	.steps-section {
		padding: 112px 32px;
	}

	.steps-container {
		max-width: 1180px;
		margin: 0 auto;
	}

	.steps-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 20px;
		margin-bottom: 64px;
	}

	@media (min-width: 768px) {
		.steps-header {
			flex-direction: row;
			align-items: flex-end;
			justify-content: space-between;
			text-align: left;
		}
	}

	.steps-eyebrow {
		margin: 0 0 8px;
		font-size: 11px;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-brand);
	}

	.steps-h2 {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(28px, 3.6vw, 40px);
		line-height: 1.05;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
		letter-spacing: -0.03em;
	}

	.steps-try-btn {
		white-space: nowrap;
		align-self: flex-end;
	}

	.steps-grid {
		display: grid;
		grid-template-columns: 1fr auto 1fr auto 1fr;
		gap: 0 48px;
		align-items: stretch;
	}

	.step-card {
		display: flex;
		flex-direction: column;
		min-height: 430px;
		border-radius: 24px;
		transition: transform 0.25s ease, filter 0.25s ease;
	}

	.step-card:hover {
		transform: translateY(-4px);
		filter: drop-shadow(0 14px 24px rgba(15, 23, 42, 0.055));
	}

	.step-head {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 20px;
	}

	.step-num {
		display: grid;
		width: 48px;
		height: 48px;
		flex-shrink: 0;
		place-items: center;
		border-radius: 50%;
		background: var(--color-brand-muted);
		font-size: 20px;
		font-weight: 900;
		color: var(--color-brand);
	}

	.step-title {
		font-size: 20px;
		font-weight: 900;
		color: var(--color-text-primary);
		margin: 0 0 8px;
	}

	.step-desc {
		margin: 0;
		font-size: 13px;
		line-height: 1.6;
		color: var(--color-text-secondary);
	}

	.step-demo {
		flex: 1;
		border-radius: 20px;
		padding: 32px;
		display: flex;
		flex-direction: column;
		min-height: 270px;
	}

	.step-arrow {
		display: none;
		padding-top: 176px;
		font-size: 36px;
		color: var(--color-text-muted);
		animation: arrowMove 1.6s infinite ease-in-out;
		align-self: flex-start;
	}

	.arrow-animate {
		animation: arrowMove 1.6s infinite ease-in-out;
	}

	/* Detect stage */
	.detect-stage {
		position: relative;
		flex: 1;
		min-height: 270px;
	}

	.detect-placeholder,
	.detect-result {
		border-radius: 20px;
		padding: 28px;
		display: flex;
		flex-direction: column;
	}

	.detect-placeholder {
		position: absolute;
		inset: 0;
		transition: opacity 0.45s ease, transform 0.45s ease;
	}

	.detect-result {
		position: absolute;
		inset: 0;
		transition: opacity 0.45s ease, transform 0.45s ease;
	}

	.card-label {
		font-size: 11px;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
		margin: 0 0 20px;
	}

	.typing-box {
		font-size: 13px;
		font-weight: 500;
		line-height: 1.75;
		color: var(--color-text-secondary);
		flex: 1;
	}

	.typing-box.is-typing::after {
		content: '';
		display: inline-block;
		width: 2px;
		height: 1.1em;
		margin-left: 3px;
		vertical-align: -2px;
		background: var(--color-brand);
		animation: blink 0.85s steps(1) infinite;
	}

	.step-action-btn {
		display: inline-flex;
		border-radius: 12px;
		background: var(--color-brand);
		padding: 12px 24px;
		font-size: 13px;
		font-weight: 900;
		color: #fff;
		box-shadow: 0 8px 20px var(--color-brand-glow);
		margin-top: 32px;
		cursor: default;
	}

	.detect-result-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0;
	}

	.badge-ai {
		border-radius: 999px;
		background: var(--color-ai-muted);
		padding: 4px 12px;
		font-size: 11px;
		font-weight: 700;
		color: var(--color-ai);
	}

	.detect-result-body {
		display: flex;
		align-items: center;
		gap: 24px;
		margin-top: 24px;
	}

	.gauge-wrap {
		position: relative;
		width: 96px;
		height: 96px;
		flex-shrink: 0;
	}

	.gauge-svg {
		width: 96px;
		height: 96px;
	}

	.gauge-center {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
	}

	.gauge-num {
		font-size: 24px;
		font-weight: 900;
		color: var(--color-ai);
		margin: 0;
	}

	.detect-bars {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.bar-label {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		font-weight: 700;
		color: var(--color-text-muted);
		margin-bottom: 8px;
	}

	.bar-track {
		height: 8px;
		border-radius: 999px;
		background: var(--color-bg-elevated);
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		border-radius: 999px;
	}

	.bar-fill-ai { background: var(--color-ai); }
	.bar-fill-human { background: var(--color-brand); }

	.detect-note {
		margin-top: 24px;
		border-radius: 12px;
		background: var(--color-bg-elevated);
		padding: 16px;
		font-size: 12px;
		color: var(--color-text-secondary);
		line-height: 1.5;
	}

	/* Humanize step */
	.waiting-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		height: 100%;
		flex: 1;
	}

	.waiting-icon {
		display: grid;
		width: 56px;
		height: 56px;
		place-items: center;
		border-radius: 50%;
		background: var(--color-bg-elevated);
		font-size: 24px;
		color: var(--color-text-muted);
	}

	.waiting-text {
		margin: 20px 0 0;
		font-size: 13px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.humanize-active-state {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.humanize-input-text {
		margin: 16px 0 0;
		font-size: 13px;
		line-height: 1.75;
		color: var(--color-text-secondary);
	}

	.humanize-output-state {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.output-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 24px;
	}

	.output-chip {
		display: inline-flex;
		align-items: center;
		border-radius: 999px;
		background: var(--color-brand-muted);
		padding: 8px 12px;
		font-size: 11px;
		font-weight: 900;
		color: var(--color-brand);
	}

	/* Verify step */
	.verify-tool-name {
		font-size: 20px;
		font-weight: 900;
		color: var(--color-brand);
		margin: 0;
	}

	.verify-tool-ver {
		font-size: 11px;
		color: var(--color-text-muted);
		font-weight: 400;
	}

	.verify-output-state {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.verify-gauge-wrap {
		position: relative;
		width: 144px;
		height: 144px;
		margin-top: 32px;
	}

	.verify-gauge-svg {
		width: 144px;
		height: 144px;
	}

	.verify-ring {
		animation: ringDraw 1s ease forwards;
	}

	.verify-gauge-center {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
	}

	.verify-score {
		font-size: 48px;
		font-weight: 900;
		color: var(--color-brand);
		margin: 0;
	}

	.badge-human-written {
		display: inline-flex;
		border-radius: 999px;
		background: var(--color-brand-muted);
		padding: 12px 20px;
		font-size: 13px;
		font-weight: 900;
		color: var(--color-brand);
		margin-top: 24px;
	}

	/* ─── FEATURES ───────────────────────────────────────────────────── */
	.features-section {
		padding: 0 32px 96px;
	}

	.features-container {
		max-width: 1180px;
		margin: 0 auto;
	}

	.features-card {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 40px;
		border-radius: 28px;
		border: 1px solid var(--color-brand-muted);
		background: var(--color-brand-muted);
		padding: 40px;
		align-items: start;
	}

	.features-left {
		display: flex;
		flex-direction: column;
	}

	.features-eyebrow {
		margin: 0 0 16px;
		font-size: 11px;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-brand);
	}

	.features-h2 {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 36px;
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-text-primary);
		margin: 0 0 20px;
		letter-spacing: -0.025em;
	}

	.features-sub {
		margin: 0 0 32px;
		max-width: 320px;
		line-height: 1.75;
		color: var(--color-text-secondary);
		font-size: 14px;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 24px;
	}

	.feature-item {
		display: flex;
		flex-direction: column;
	}

	.feature-title {
		font-size: 15px;
		font-weight: 900;
		color: var(--color-text-primary);
		margin: 0 0 12px;
	}

	.feature-body {
		margin: 0 0 24px;
		font-size: 13px;
		line-height: 1.6;
		color: var(--color-text-secondary);
	}

	.feature-demo-card {
		border-radius: 16px;
		padding: 20px;
		margin-top: auto;
	}

	/* ─── CTA ────────────────────────────────────────────────────────── */
	.cta-section {
		padding: 0 32px 64px;
	}

	.cta-container {
		max-width: 1180px;
		margin: 0 auto;
	}

	.cta-card {
		border-radius: 28px;
		background: #063f32;
		padding: 56px 32px;
		text-align: center;
		color: #fff;
		box-shadow: 0 32px 80px rgba(6, 63, 50, 0.2);
	}

	.cta-h2 {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: clamp(28px, 4vw, 48px);
		font-weight: 700;
		margin: 0;
		letter-spacing: -0.025em;
		line-height: 1.1;
	}

	.cta-sub {
		margin: 20px auto 0;
		max-width: 540px;
		color: rgba(255, 255, 255, 0.75);
		font-size: 15px;
		line-height: 1.6;
	}

	/* ─── PRICING ────────────────────────────────────────────────────── */
	.pricing-section {
		padding: 0 48px 96px;
	}

	.pricing-container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.section-h2 {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 36px;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 24px;
		letter-spacing: -0.025em;
	}

	.billing-toggle {
		display: inline-flex;
		padding: 4px;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-bg-border);
		border-radius: 12px;
		gap: 4px;
		margin-top: 8px;
	}

	.billing-btn {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 8px 18px;
		border-radius: 9px;
		border: none;
		font-family: inherit;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: background 200ms, color 200ms;
		background: transparent;
		color: var(--color-text-muted);
	}

	.billing-btn-active {
		background: var(--color-bg-surface) !important;
		color: var(--color-text-primary) !important;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
	}

	.save-badge {
		font-size: 10px;
		font-weight: 700;
		padding: 2px 7px;
		border-radius: 99px;
		background: var(--color-brand-muted);
		color: var(--color-brand);
		border: 1px solid var(--color-brand);
	}

	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
		max-width: 960px;
		margin: 0 auto;
		align-items: start;
	}

	/* ─── FAQ ────────────────────────────────────────────────────────── */
	.faq-section {
		padding: 56px 24px 80px;
	}

	.faq-container {
		max-width: 640px;
		margin: 0 auto;
	}

	.faq-item {
		border-radius: 12px;
		background: var(--color-bg-surface);
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		overflow: hidden;
	}

	.faq-trigger {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 14px 18px;
		border: none;
		background: transparent;
		cursor: pointer;
		text-align: left;
		font: inherit;
		color: var(--color-text-primary);
		transition: background 120ms ease;
	}

	.faq-trigger:hover { background: var(--color-bg-elevated); }

	.faq-q {
		font-family: inherit;
		font-size: 14px;
		font-weight: 600;
		line-height: 1.4;
	}

	.faq-chevron {
		flex-shrink: 0;
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-muted);
		line-height: 1;
	}

	.faq-panel {
		padding: 0 18px 16px;
		border-top: 1px solid var(--color-bg-border);
	}

	.faq-panel p {
		margin: 0;
		padding-top: 12px;
		font-size: 13px;
		line-height: 1.65;
		color: var(--color-text-secondary);
	}

	/* ─── RESPONSIVE ─────────────────────────────────────────────────── */
	@media (min-width: 1025px) {
		.step-arrow { display: block; }
	}

	@media (max-width: 1100px) {
		.hero-bg { padding-left: 24px; padding-right: 24px; }
		.hero-card-top { right: 70px; width: 420px; }
		.hero-card-bottom { right: 40px; top: 270px; width: 450px; }
		.hero-alert { right: 410px; top: 135px; }
		.hero-feature-bar { left: 70px; right: 55px; bottom: 0; }
	}

	@media (max-width: 1024px) {
		.steps-grid {
			grid-template-columns: 1fr;
			gap: 32px;
		}
		.step-arrow { display: none !important; }
		.step-card { min-height: auto; }
	}

	@media (max-width: 900px) {
		.hero-container {
			grid-template-columns: 1fr;
			gap: 0;
		}
		.hero-visual {
			min-height: 620px;
			transform: scale(0.92);
			transform-origin: top center;
			margin-bottom: -40px;
		}
		.hero-card-top { right: 48px; top: 0; width: 420px; }
		.hero-card-bottom { right: 24px; top: 285px; width: 455px; }
		.hero-alert { right: 395px; top: 130px; width: 180px; }
		.hero-feature-bar { left: 54px; right: 36px; bottom: 20px; }
		.features-card {
			grid-template-columns: 1fr;
		}
		.features-grid { grid-template-columns: 1fr; }
		.pricing-grid { grid-template-columns: 1fr !important; }
	}

	@media (max-width: 640px) {
		.hero-bg { padding: 40px 16px 48px; }
		.hero-h1 { font-size: clamp(34px, 9.5vw, 48px); }
		.hero-visual {
			min-height: auto;
			transform: none;
			display: flex;
			flex-direction: column;
			gap: 14px;
			margin: 44px 0 0;
		}
		.hero-dot-grid,
		.hero-glow-blob { display: none; }
		.hero-card-top,
		.hero-alert,
		.hero-card-bottom,
		.hero-feature-bar {
			position: relative;
			inset: auto;
			right: auto;
			left: auto;
			top: auto;
			bottom: auto;
			width: 100%;
			animation: none;
			transform: none !important;
		}
		.hero-card-top { order: 1; border-radius: 20px; }
		.hero-alert { order: 2; width: 86%; margin-left: 6%; }
		.hero-card-bottom { order: 3; border-radius: 20px; }
		.hero-feature-bar { order: 4; justify-content: flex-start; }
		.steps-section { padding: 72px 16px; }
		.features-section,
		.cta-section { padding-left: 16px; padding-right: 16px; }
		.trust-marquee-section { padding: 0 16px; }
		.marquee-group { gap: 44px; padding-right: 44px; }
	}
</style>
