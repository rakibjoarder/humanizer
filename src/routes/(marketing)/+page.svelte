<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { openLoginModal } from '$lib/stores/loginModal';
	import { browser } from '$app/environment';
	import {
		countWords,
		FREE_DETECTION_MAX_WORDS_PER_SCAN,
		trimToMaxWords
	} from '$lib/limits';
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
				description: 'AI text humanizer — bypass AI detection for essays, assignments, and content.',
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
				description: 'Humanize AI-generated text to bypass GPTZero, Turnitin, and other AI detectors instantly.',
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
						acceptedAnswer: { '@type': 'Answer', text: 'Yes. Our humanizer rewrites AI-generated text to closely mimic natural human writing patterns, making it significantly harder for Turnitin\'s AI detector to flag.' }
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
	type ToolPath = '/humanize' | '/detect';

	let billingCycle = $state<BillingCycle>('monthly');

	let homeInput = $state('');
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let moreOpen = $state(false);
	let moreWrapEl = $state<HTMLDivElement | null>(null);

	const displayName = $derived(
		data.profile?.full_name?.trim() ||
			(data.user?.email ? data.user.email.split('@')[0] : '') ||
			'there'
	);

	const isPro = $derived(data.profile?.plan === 'pro');

	const homeWordCount = $derived(countWords(homeInput));

	function stashAndGoto(path: ToolPath, textOverride?: string) {
		const t = (textOverride ?? homeInput).trim();
		if (browser && t) {
			try {
				if (path === '/humanize') {
					localStorage.setItem('humanize_prefill', t);
				} else {
					localStorage.setItem('detect_prefill', t);
				}
			} catch {
				/* ignore quota */
			}
		}
		// Humanizer requires sign-in. Client-side `goto` does not reliably run the server auth redirect,
		// so open the login modal here instead of navigating to `/humanize` as a guest.
		if (path === '/humanize' && !data.user) {
			openLoginModal('/humanize');
			return;
		}
		goto(path);
	}

	function onComposerSubmit() {
		stashAndGoto('/humanize');
	}

	function onComposerKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter') return;
		if (e.shiftKey) return;
		e.preventDefault();
		onComposerSubmit();
	}

	function onFilePick(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			const text = typeof reader.result === 'string' ? reader.result : '';
			if (!data.user) {
				homeInput = trimToMaxWords(text, FREE_DETECTION_MAX_WORDS_PER_SCAN);
			} else {
				homeInput = text.slice(0, 50000);
			}
		};
		reader.readAsText(file);
		input.value = '';
	}

	function onComposerInput(e: Event) {
		const el = e.currentTarget as HTMLTextAreaElement;
		let v = el.value;
		if (!data.user) {
			v = trimToMaxWords(v, FREE_DETECTION_MAX_WORDS_PER_SCAN);
		}
		homeInput = v;
	}

	onMount(() => {
		const onDocClick = (e: MouseEvent) => {
			if (!moreOpen || !moreWrapEl) return;
			if (!moreWrapEl.contains(e.target as Node)) moreOpen = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') moreOpen = false;
		};
		document.addEventListener('click', onDocClick);
		window.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDocClick);
			window.removeEventListener('keydown', onKey);
		};
	});

	// ── Hub toolbar icons (detection + humanizer only) ───────────────────────────
	const shieldIcon = 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z';
	const scanIcon = 'M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M7 12h10';
	const moreIcon = 'M12 5v.01 M12 12v.01 M12 19v.01';

	const suggestions: Array<{
		kind: 'detect' | 'humanize';
		title: string;
		sub: string;
		seed: string;
		route: ToolPath;
	}> = [
		{
			kind: 'detect',
			title: 'Sample: scan for AI style',
			sub: 'Try the detector on obviously synthetic copy (50+ words on the detector page).',
			seed:
				"In today's rapidly evolving digital landscape, the fundamentally transformative power of AI-driven technologies has revolutionized operational efficiency. Furthermore, comprehensive data-driven paradigms have empowered stakeholders to leverage unprecedented synergy across multifaceted workflows.",
			route: '/detect'
		},
		{
			kind: 'humanize',
			title: 'Sample: humanize stiff copy',
			sub: 'Open the humanizer with corporate-sounding text and compare the rewrite.',
			seed:
				'The aforementioned initiative will facilitate seamless stakeholder alignment across all verticals while ensuring optimal outcomes.',
			route: '/humanize'
		},
		{
			kind: 'humanize',
			title: 'Sample: soften marketing lines',
			sub: 'Another humanizer example — tighten buzzwords into clearer sentences (Pro).',
			seed:
				'We are excited to leverage best-in-class solutions to drive synergistic outcomes across our ecosystem and empower stakeholders through innovative paradigms.',
			route: '/humanize'
		}
	];

	// ── Features (below fold) ───────────────────────────────────────────────────
	const features = [
		{
			num: '01',
			icon: scanIcon,
			title: 'AI detection you can act on',
			body: 'Probability score plus a clear classification — so you know whether a draft reads like AI before you ship it. Trained across major model families, not a generic “score out of 100” widget.'
		},
		{
			num: '02',
			icon: 'm15 4-2 2-2-2 M18 7l-2 2-2-2 M21 3v3 M3 21l9-9 M14 7l7 7-4 4-7-7z',
			title: 'Humanizer for stiff copy',
			body: 'Sentence- and word-level rewrites that keep your meaning while dialing down machine-like rhythm and diction. Built for the humanizer step after detection — not a random paraphraser.'
		},
		{
			num: '03',
			icon: shieldIcon,
			title: 'Privacy by design',
			body: 'We don’t use your text to train public models. Submissions are processed to return a result, with retention described in our Privacy Policy. SOC 2 Type II in progress.'
		}
	];

	/** Generic use cases only — avoid implying real schools or brands use the product without proof */
	const draftUseCases = [
		'Course papers',
		'Client emails',
		'Blog posts',
		'Proposals',
		'Documentation',
		'Marketing copy'
	];

	let openFaq = $state<number | null>(null);

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
			a: 'No. We don’t use your submissions to train public models. Text is processed to deliver the result; we’re clear about retention in our Privacy Policy.'
		}
	];

	function toggleFaq(i: number) {
		openFaq = openFaq === i ? null : i;
	}
</script>

<SEO
	title="AI Humanizer — Bypass AI Detection | HumanizeAIWrite"
	description="Make AI text undetectable. Bypass GPTZero, Turnitin, and other AI detectors in seconds. Free AI detector + humanizer for students, writers, and professionals."
	canonical="https://humanizeaiwrite.com"
	jsonLd={homeJsonLd}
/>

<!-- ═══════════════════════════════════════════════════════════════════════════
     HUB — greeting + composer + suggestions
     (Premium promo banner lives in +layout.svelte under the nav)
════════════════════════════════════════════════════════════════════════════ -->
<section
	style="
		background: var(--color-bg-base);
		padding: 40px 24px 56px;
	"
>
	<div style="max-width: 920px; margin: 0 auto;">
		<Reveal delay={0}>
			<h1
				style="
					font-family: 'Newsreader', Georgia, serif;
					font-size: clamp(28px, 4.2vw, 40px);
					line-height: 1.15;
					font-weight: 600;
					color: var(--color-text-primary);
					margin: 0 0 28px;
					letter-spacing: -0.02em;
				"
			>
				Hi, {displayName}! AI detection &amp; humanizing — your two tools here.
			</h1>
		</Reveal>

		{#if !data.user}
			<p
				style="
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 13px;
					color: var(--color-text-muted);
					margin: -12px 0 20px;
				"
			>
				<button
					type="button"
					onclick={() => openLoginModal()}
					style="font-weight: 600; color: var(--color-brand); text-decoration: none; background: none; border: none; padding: 0; cursor: pointer; font: inherit;"
				>Sign in</button>
				to save detection and humanization history across devices.
			</p>
		{/if}

		<Reveal delay={60}>
			<div
				data-card
				style="
					background: var(--color-bg-surface);
					border-radius: 18px;
					box-shadow: var(--shadow-card);
					border: 1px solid var(--color-bg-border);
					overflow: hidden;
					margin-bottom: 28px;
				"
			>
				<div style="padding: 20px 20px 8px; min-height: 140px;">
					<label class="sr-only" for="home-composer">Your text</label>
					<textarea
						id="home-composer"
						class="home-composer-textarea"
						value={homeInput}
						placeholder="Paste text, upload a .txt file, then choose AI Detector or Humanizer below"
						rows="5"
						aria-describedby={!data.user
							? 'home-composer-hint home-composer-guest-footer'
							: 'home-composer-hint'}
						oninput={onComposerInput}
						onkeydown={onComposerKeydown}
						style="
							width: 100%;
							min-height: 120px;
							resize: vertical;
							border: none;
							background: transparent;
							font-family: 'Space Grotesk', system-ui, sans-serif;
							font-size: 16px;
							line-height: 1.55;
							color: var(--color-text-primary);
							outline: none;
						"
					></textarea>
					<p
						id="home-composer-hint"
						style="
							margin: 10px 0 0;
							font-family: 'Space Grotesk', system-ui, sans-serif;
							font-size: 11px;
							color: var(--color-text-dim);
							line-height: 1.4;
						"
					>
						<strong style="color: var(--color-text-muted);">Enter</strong> continues to Humanize ·
						<strong style="color: var(--color-text-muted);">Shift+Enter</strong> new line ·
						<strong style="color: var(--color-text-muted);">Detector</strong> needs 50+ words
					</p>
				</div>

				<div
					style="
						padding: 10px 12px 16px;
						display: flex;
						flex-direction: column;
						gap: 10px;
						border-top: 1px solid rgba(16, 185, 129, 0.3);
						background: var(--color-brand-muted);
					"
				>
					{#if !data.user}
						<div
							id="home-composer-guest-footer"
							style="
								display: flex;
								align-items: flex-start;
								justify-content: space-between;
								gap: 12px;
								flex-wrap: wrap;
							"
						>
							<p
								style="
									margin: 0;
									font-family: 'Space Grotesk', system-ui, sans-serif;
									font-size: 12px;
									line-height: 1.45;
									color: var(--color-text-secondary);
									flex: 1 1 200px;
								"
							>
								<strong style="color: var(--color-text-muted); font-weight: 600;">Guest preview:</strong>
								up to {FREE_DETECTION_MAX_WORDS_PER_SCAN} words per AI detection scan (same as the detector).
							</p>
							<span
								style="
									font-family: 'JetBrains Mono', monospace;
									font-size: 12px;
									font-weight: 500;
									color: {homeWordCount > FREE_DETECTION_MAX_WORDS_PER_SCAN * 0.9
										? 'var(--color-uncertain)'
										: 'var(--color-text-muted)'};
									flex-shrink: 0;
									padding-top: 1px;
								"
							>
								{homeWordCount.toLocaleString('en-US')} / {FREE_DETECTION_MAX_WORDS_PER_SCAN.toLocaleString(
									'en-US'
								)} words
							</span>
						</div>
					{/if}
					<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
						<input
							type="file"
							accept=".txt,text/plain"
							class="home-file-input"
							bind:this={fileInputEl}
							onchange={onFilePick}
						/>
						<button
							type="button"
							class="hub-pill"
							title="Load text from a .txt file"
							aria-label="Load text from a .txt file"
							onclick={() => fileInputEl?.click()}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path d="M12 5v14 M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
							</svg>
							Upload .txt
						</button>
						<button type="button" class="hub-pill" onclick={() => stashAndGoto('/detect')}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path d={scanIcon} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
							AI Detector
						</button>
						<button type="button" class="hub-pill" onclick={() => stashAndGoto('/humanize')}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path d={shieldIcon} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
							AI Humanizer
						</button>
					<div class="hub-more-wrap" bind:this={moreWrapEl}>
						<button
							type="button"
							class="hub-pill"
							aria-haspopup="menu"
							aria-expanded={moreOpen}
							onclick={(e) => {
								e.stopPropagation();
								moreOpen = !moreOpen;
							}}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path d={moreIcon} stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
							</svg>
							More
						</button>
						{#if moreOpen}
							<div
								class="hub-more-menu"
								role="menu"
								style="
									position: absolute;
									z-index: 30;
									right: 0;
									bottom: calc(100% + 8px);
									min-width: 200px;
									padding: 6px;
									border-radius: 12px;
									background: var(--color-bg-surface);
									box-shadow: var(--shadow-dropdown);
									border: 1px solid var(--color-bg-border);
								"
							>
								<a
									role="menuitem"
									href="/dashboard"
									class="hub-more-link"
									onclick={() => (moreOpen = false)}>Dashboard</a
								>
								<a role="menuitem" href="/activity" class="hub-more-link" onclick={() => (moreOpen = false)}
									>Activity</a
								>
								<a role="menuitem" href="/settings" class="hub-more-link" onclick={() => (moreOpen = false)}
									>Settings</a
								>
								<a role="menuitem" href="/pricing" class="hub-more-link" onclick={() => (moreOpen = false)}
									>Pricing</a
								>
							</div>
						{/if}
					</div>
					</div>
				</div>
			</div>
		</Reveal>

		<Reveal delay={120}>
			<p
				style="
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 13px;
					color: var(--color-text-muted);
					margin: 0 0 14px;
				"
			>
				Quick samples — detection or humanizing:
			</p>
			<div class="home-suggestions">
				{#each suggestions as s}
					<button
						type="button"
						class="suggestion-card hai-hover-lift"
						onclick={() => stashAndGoto(s.route, s.seed)}
					>
						<div style="display: flex; align-items: flex-start; gap: 12px; text-align: left;">
							<div
								class="suggestion-icon {s.kind === 'detect'
									? 'suggestion-icon-detect'
									: 'suggestion-icon-humanize'}"
							>
								{#if s.kind === 'detect'}
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
										<path d={scanIcon} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
									</svg>
								{:else}
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
										<path
											d="m15 4-2 2-2-2 M18 7l-2 2-2-2 M21 3v3 M3 21l9-9 M14 7l7 7-4 4-7-7z"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								{/if}
							</div>
							<div style="min-width: 0;">
								<div
									style="
										font-family: 'Space Grotesk', system-ui, sans-serif;
										font-size: 14px;
										font-weight: 600;
										color: var(--color-text-primary);
										margin-bottom: 6px;
									"
								>
									{s.title}
								</div>
								<div
									style="
										font-family: 'Space Grotesk', system-ui, sans-serif;
										font-size: 13px;
										line-height: 1.45;
										color: var(--color-text-muted);
										display: -webkit-box;
										-webkit-line-clamp: 2;
										-webkit-box-orient: vertical;
										overflow: hidden;
									"
								>
									{s.sub}
								</div>
							</div>
						</div>
					</button>
				{/each}
			</div>
		</Reveal>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     HOW IT WORKS + FREE TIER
════════════════════════════════════════════════════════════════════════════ -->
<section
	style="
		background: var(--color-bg-base);
		padding: 0 24px 48px;
	"
>
	<div style="max-width: 920px; margin: 0 auto;">
		<div class="home-how-grid">
			<div
				style="
					background: var(--color-bg-surface);
					border-radius: 14px;
					padding: 18px 20px;
					box-shadow: inset 0 0 0 1px var(--color-bg-border);
				"
			>
				<span
					style="
						font-family: 'JetBrains Mono', monospace;
						font-size: 11px;
						font-weight: 700;
						color: var(--color-brand);
					">1</span
				>
				<h3
					style="
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 15px;
						font-weight: 700;
						color: var(--color-text-primary);
						margin: 8px 0 6px;
					"
				>
					Paste
				</h3>
				<p
					style="
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 13px;
						line-height: 1.5;
						color: var(--color-text-secondary);
						margin: 0;
					"
				>
					Add text or upload a .txt file, then pick AI Detector or Humanizer.
				</p>
			</div>
			<div
				style="
					background: var(--color-bg-surface);
					border-radius: 14px;
					padding: 18px 20px;
					box-shadow: inset 0 0 0 1px var(--color-bg-border);
				"
			>
				<span
					style="
						font-family: 'JetBrains Mono', monospace;
						font-size: 11px;
						font-weight: 700;
						color: var(--color-brand);
					">2</span
				>
				<h3
					style="
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 15px;
						font-weight: 700;
						color: var(--color-text-primary);
						margin: 8px 0 6px;
					"
				>
					Detect or humanize
				</h3>
				<p
					style="
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 13px;
						line-height: 1.5;
						color: var(--color-text-secondary);
						margin: 0;
					"
				>
					Run the <strong style="color: var(--color-text-primary); font-weight: 600;">detector</strong> for a score, or
					<strong style="color: var(--color-text-primary); font-weight: 600;">humanize</strong> to rewrite in a natural voice.
				</p>
			</div>
			<div
				style="
					background: var(--color-bg-surface);
					border-radius: 14px;
					padding: 18px 20px;
					box-shadow: inset 0 0 0 1px var(--color-bg-border);
				"
			>
				<span
					style="
						font-family: 'JetBrains Mono', monospace;
						font-size: 11px;
						font-weight: 700;
						color: var(--color-brand);
					">3</span
				>
				<h3
					style="
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 15px;
						font-weight: 700;
						color: var(--color-text-primary);
						margin: 8px 0 6px;
					"
				>
					Copy &amp; use
				</h3>
				<p
					style="
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 13px;
						line-height: 1.5;
						color: var(--color-text-secondary);
						margin: 0;
					"
				>
					Copy results, open your activity log, or jump back here anytime.
				</p>
			</div>
		</div>
		{#if !isPro}
			<p
				style="
					margin: 20px 0 0;
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 12px;
					line-height: 1.5;
					color: var(--color-text-muted);
					text-align: center;
				"
			>
				<strong style="color: var(--color-text-secondary); font-weight: 600;">Free plan:</strong>
				3 lifetime AI scans (500 words each). Humanizer and history are Pro — see pricing below.
			</p>
		{/if}
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     USE-CASE MARQUEE (no implied customer logos)
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
			">Drafts people run through us —</p>
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
				{#each [draftUseCases, draftUseCases] as group}
					{#each group as label}
						<span style="
							font-family: 'Newsreader', Georgia, serif;
							font-size: 22px;
							font-style: italic;
							color: var(--color-text-muted);
							white-space: nowrap;
							flex-shrink: 0;
						">{label}</span>
					{/each}
				{/each}
			</div>
		</div>
	</section>
</Reveal>

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
				font-size: clamp(28px, 4vw, 40px);
				font-weight: 400;
				color: var(--color-text-primary);
				margin: 0 0 14px;
				letter-spacing: -0.02em;
				line-height: 1.15;
			">Detect AI patterns. Humanize what still sounds synthetic.</h2>
			<p style="
				font-family: 'Space Grotesk', system-ui, sans-serif;
				font-size: 16px;
				line-height: 1.55;
				color: var(--color-text-secondary);
				margin: 0 0 40px;
				max-width: 640px;
			">
				Two focused tools for the draft in front of you — papers, emails, briefs, and notes. No extra “writing suite” clutter:
				<strong style="font-weight: 600; color: var(--color-text-primary);">check</strong>, then
				<strong style="font-weight: 600; color: var(--color-text-primary);">rewrite</strong>, when you need it.
			</p>
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

{#if !isPro}
	<!-- ═══════════════════════════════════════════════════════════════════════════
	     PRICING
	════════════════════════════════════════════════════════════════════════════ -->
	<section style="
		background: var(--color-bg-base);
		padding: 0 48px 96px;
	">
		<div style="max-width: 1200px; margin: 0 auto;">
			<Reveal delay={0}>
				<div style="margin-bottom: 40px; text-align: center;">
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
						margin: 0 0 24px;
					">7-day free trial · cancel anytime</p>

					<div style="
						display: inline-flex;
						padding: 4px;
						background: var(--color-bg-surface);
						border: 1px solid var(--color-bg-border);
						border-radius: 12px;
						gap: 4px;
					" role="group" aria-label="Billing cycle">
						<button
							style="
								padding: 8px 18px;
								border-radius: 9px;
								border: none;
								font-family: 'Space Grotesk', system-ui, sans-serif;
								font-size: 13px;
								font-weight: 500;
								cursor: pointer;
								transition: background 200ms, color 200ms;
								background: {billingCycle === 'monthly' ? 'var(--color-bg-elevated)' : 'transparent'};
								color: {billingCycle === 'monthly' ? 'var(--color-text-primary)' : 'var(--color-text-muted)'};
							"
							onclick={() => (billingCycle = 'monthly')}
							aria-pressed={billingCycle === 'monthly'}
						>Monthly</button>
						<button
							style="
								display: inline-flex;
								align-items: center;
								gap: 7px;
								padding: 8px 18px;
								border-radius: 9px;
								border: none;
								font-family: 'Space Grotesk', system-ui, sans-serif;
								font-size: 13px;
								font-weight: 500;
								cursor: pointer;
								transition: background 200ms, color 200ms;
								background: {billingCycle === 'yearly' ? 'var(--color-bg-elevated)' : 'transparent'};
								color: {billingCycle === 'yearly' ? 'var(--color-text-primary)' : 'var(--color-text-muted)'};
							"
							onclick={() => (billingCycle = 'yearly')}
							aria-pressed={billingCycle === 'yearly'}
						>
							Yearly
							<span style="
								font-size: 10px;
								font-weight: 700;
								padding: 2px 7px;
								border-radius: 99px;
								background: var(--color-human-muted);
								color: var(--color-human);
								border: 1px solid var(--color-human);
							">Save 33%</span>
						</button>
					</div>
				</div>
			</Reveal>

			<div style="
				display: grid;
				grid-template-columns: repeat(2, 1fr);
				gap: 20px;
				max-width: 680px;
				margin: 0 auto;
				align-items: start;
			" class="pricing-grid">
				<Reveal delay={0}>
					<a href="/register" style="display: block; text-decoration: none;">
						<PricingCard plan="free" {billingCycle} highlighted={false} />
					</a>
				</Reveal>
				<Reveal delay={80}>
					<a href="/pricing" style="display: block; text-decoration: none; padding-top: 16px;">
						<PricingCard plan="pro" {billingCycle} highlighted={true} />
					</a>
				</Reveal>
			</div>
		</div>
	</section>
{/if}

<!-- ═══════════════════════════════════════════════════════════════════════════
     TRUST — short reassurance (distinct from feature cards above)
════════════════════════════════════════════════════════════════════════════ -->
<section
	style="
		background: var(--color-brand-muted);
		border-top: 1px solid rgba(16, 185, 129, 0.3);
		padding: 56px 24px 64px;
	"
>
	<div style="max-width: 1100px; margin: 0 auto;">
		<Reveal delay={0}>
			<h2
				style="
					font-family: 'Newsreader', Georgia, serif;
					font-size: clamp(26px, 3.5vw, 34px);
					font-weight: 400;
					color: var(--color-text-primary);
					margin: 0 0 10px;
					letter-spacing: -0.02em;
					text-align: center;
				"
			>
				Built for trust, not tricks
			</h2>
			<p
				style="
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 14px;
					color: var(--color-text-muted);
					margin: 0 auto 36px;
					max-width: 520px;
					text-align: center;
					line-height: 1.55;
				"
			>
				Two focused tools — detection and humanizing — with clear limits on Free and no mystery features.
			</p>
		</Reveal>
		<div class="home-trust-grid">
			<Reveal delay={60}>
				<div class="home-trust-card">
					<h3 class="home-trust-title">No model training on your text</h3>
					<p class="home-trust-body">
						Your submissions aren’t used to train third-party models. We process requests to return a result, not to build a dataset from your work.
					</p>
				</div>
			</Reveal>
			<Reveal delay={120}>
				<div class="home-trust-card">
					<h3 class="home-trust-title">Straightforward limits</h3>
					<p class="home-trust-body">
						{#if isPro}
							Guests and Free accounts stay capped so expectations stay clear. Your Pro plan includes unlimited
							detection and humanizing while you’re subscribed.
						{:else}
							Free and guest usage are capped so expectations stay clear. Upgrade to Pro when you need the humanizer
							and unlimited detection.
						{/if}
					</p>
				</div>
			</Reveal>
			<Reveal delay={180}>
				<div class="home-trust-card">
					<h3 class="home-trust-title">Activity when you’re signed in</h3>
					<p class="home-trust-body">
						Signed-in users get history and activity to revisit past runs. Guests can still try a preview detection before creating an account.
					</p>
				</div>
			</Reveal>
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════════════════════════
     FAQ
════════════════════════════════════════════════════════════════════════════ -->
<section style="background: var(--color-bg-base); padding: 56px 24px 80px;">
	<div style="max-width: 640px; margin: 0 auto;">
		<Reveal delay={0}>
			<h2
				style="
					font-family: 'Newsreader', Georgia, serif;
					font-size: clamp(26px, 3.5vw, 34px);
					font-weight: 400;
					color: var(--color-text-primary);
					margin: 0 0 28px;
					letter-spacing: -0.02em;
					text-align: center;
				"
			>
				Common questions
			</h2>
		</Reveal>
		<div style="display: flex; flex-direction: column; gap: 10px;">
			{#each homeFaqs as item, i}
				<div class="home-faq-item">
					<button
						type="button"
						class="home-faq-trigger"
						aria-expanded={openFaq === i}
						aria-controls="faq-panel-{i}"
						id="faq-trigger-{i}"
						onclick={() => toggleFaq(i)}
					>
						<span class="home-faq-q">{item.q}</span>
						<span class="home-faq-chevron" aria-hidden="true">{openFaq === i ? '−' : '+'}</span>
					</button>
					{#if openFaq === i}
						<div
							class="home-faq-panel"
							id="faq-panel-{i}"
							role="region"
							aria-labelledby="faq-trigger-{i}"
						>
							<p>{item.a}</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
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

	.home-file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.hub-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		border-radius: 999px;
		border: 1px solid var(--color-bg-border);
		background: var(--color-bg-surface);
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12.5px;
		font-weight: 500;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: background 150ms, border-color 150ms, color 150ms;
	}

	.hub-pill:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
		border-color: var(--color-bg-border-hi);
	}

	.hub-pill:focus-visible,
	.home-composer-textarea:focus-visible,
	.suggestion-card:focus-visible {
		outline: 2px solid var(--color-brand);
		outline-offset: 2px;
	}

	.hub-more-wrap {
		position: relative;
		z-index: 2;
	}

	.hub-more-link {
		display: block;
		padding: 9px 12px;
		border-radius: 8px;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-primary);
		text-decoration: none;
		transition: background 120ms;
	}

	.hub-more-link:hover {
		background: var(--color-bg-elevated);
	}

	.home-how-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	.suggestion-icon-detect {
		background: var(--color-ai-muted) !important;
		color: var(--color-ai) !important;
	}

	.suggestion-icon-humanize {
		background: var(--color-brand-muted) !important;
		color: var(--color-brand) !important;
	}

	.home-suggestions {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 14px;
	}

	.suggestion-card {
		width: 100%;
		padding: 16px 18px;
		border-radius: 14px;
		border: 1px solid var(--color-bg-border);
		background: var(--color-bg-surface);
		box-shadow: var(--shadow-card);
		cursor: pointer;
		transition: transform 180ms ease, box-shadow 180ms ease;
	}

	.suggestion-icon {
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--color-brand-muted);
		color: var(--color-brand);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.home-trust-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 18px;
	}

	.home-trust-card {
		background: var(--color-bg-surface);
		border-radius: 14px;
		padding: 22px 20px;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		height: 100%;
	}

	.home-trust-title {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 15px;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 10px;
		letter-spacing: -0.01em;
	}

	.home-trust-body {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		line-height: 1.6;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.home-faq-item {
		border-radius: 12px;
		background: var(--color-bg-surface);
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		overflow: hidden;
	}

	.home-faq-trigger {
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

	.home-faq-trigger:hover {
		background: var(--color-bg-elevated);
	}

	.home-faq-trigger:focus-visible {
		outline: 2px solid var(--color-brand);
		outline-offset: -2px;
	}

	.home-faq-q {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 14px;
		font-weight: 600;
		line-height: 1.4;
	}

	.home-faq-chevron {
		flex-shrink: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-muted);
		line-height: 1;
	}

	.home-faq-panel {
		padding: 0 18px 16px;
		border-top: 1px solid var(--color-divider);
	}

	.home-faq-panel p {
		margin: 0;
		padding-top: 12px;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		line-height: 1.65;
		color: var(--color-text-secondary);
	}

	@media (max-width: 900px) {
		.features-grid,
		.pricing-grid {
			grid-template-columns: 1fr !important;
		}
		.home-suggestions {
			grid-template-columns: 1fr;
		}
		.home-how-grid {
			grid-template-columns: 1fr !important;
		}
		.home-trust-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
