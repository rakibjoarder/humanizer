<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { openLoginModal } from '$lib/stores/loginModal';
	import type { PageData } from './$types';
	import { setLastVisitedActivityId } from '$lib/client/lastActivityVisit';
	import { detectText, OutOfWordsError, type DetectResult } from '$lib/client/api';
	import { trackDetect } from '$lib/client/analytics';
	import { wordsBalanceStore } from '$lib/stores/wordsBalance';
	import ScoreGauge from '$lib/components/ScoreGauge.svelte';
	import ClassificationBadge from '$lib/components/ClassificationBadge.svelte';
	import TextEditor from '$lib/components/TextEditor.svelte';
	import CardHeader from '$lib/components/CardHeader.svelte';
	import DiffText from '$lib/components/DiffText.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { countWords, MAX_INPUT_WORDS } from '$lib/limits';

	const DETECT_INPUT_ID = 'detect-page-input';

	function syncDetectTextareaValue(text: string) {
		if (typeof document === 'undefined') return;
		const el = document.getElementById(DETECT_INPUT_ID);
		if (!(el instanceof HTMLTextAreaElement)) return;
		// Blur first so Svelte bind:value does not immediately re-apply the old value from a focused textarea.
		el.blur();
		el.value = text;
		el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
	}

	// ── Icon paths ──────────────────────────────────────────────────────────────
	const scanIcon  = 'M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M7 12h10';
	const gaugeIcon = 'm12 14 4-4 M3.34 19a10 10 0 1 1 17.32 0';
	const wandIcon  = 'm15 4-2 2-2-2 M18 7l-2 2-2-2 M21 3v3 M3 21l9-9 M14 7l7 7-4 4-7-7z';
	const copyIcon  = 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z';
	const checkIcon = 'M20 6 9 17l-5-5';
	const alertIcon = 'M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z';

	// ── AI signal phrases for diff highlighting ─────────────────────────────────
	const AI_TELLS = new Set<string>(); // kept for DiffText compat, unused when phrases passed

	const AI_PHRASES = [
		// Connective filler
		'it is important to note','it is worth noting','it should be noted',
		'it is crucial to','it is essential to','it is vital to',
		'in conclusion','to summarize','in summary','to conclude',
		'in other words','it goes without saying','needless to say',
		'as mentioned earlier','as previously stated','as noted above',
		'first and foremost','last but not least',
		'on the other hand','at the end of the day',
		'in today\'s world','in the modern world','in today\'s society',
		'in today\'s fast-paced','in the digital age','in recent years',
		'it\'s worth noting','it\'s important to','it\'s essential to',
		// Hedging
		'by and large','for the most part','to a certain extent',
		'in many ways','in some ways','in a sense',
		// Common AI adjectives / nouns
		'multifaceted','transformative','unprecedented','paradigm shift',
		'seamlessly','leverage','synergy','stakeholders','holistic',
		'proactive','actionable','streamline','optimize','empower',
		'cutting-edge','state-of-the-art','data-driven','game-changer',
		'innovative solution','robust framework','comprehensive approach',
		'key takeaways','moving forward','going forward',
		'delve into','dive into','tapestry','navigate','landscape',
		'rapidly evolving','ever-evolving','fast-paced world',
		// Padding openers
		'Certainly!','Absolutely!','Of course!','Great question',
		'I hope this helps','I hope this','Feel free to',
		'As an AI','As a language model',
	];

	// ── Signal breakdown labels ────────────────────────────────────────────────
	const signals = [
		'Sentence variance',
		'Lexical diversity',
		'Burstiness',
		'Perplexity score',
		'Phrase repetition',
		'Hedging language',
	];

	// ── Props ──────────────────────────────────────────────────────────────────
	interface Props {
		data: PageData;
	}
	let { data }: Props = $props();

	type ResultSource = 'none' | 'live' | 'history';
	let resultSource = $state<ResultSource>('none');
	/** Server row id we already hydrated from `?id=` — avoids re-applying when URL still has id after a live run */
	let savedHydratedId = $state<string | null>(null);

	// ── State ──────────────────────────────────────────────────────────────────
	let inputText = $state('');
	let isLoading   = $state(false);
	let result      = $state<DetectResult | null>(null);
	let error       = $state<string | null>(null);
	let outOfWords  = $state(false);
	let copied    = $state(false);
	let detId     = $state('');
	let detMs     = $state(0);

	function mapSavedRowToResult(s: NonNullable<PageData['savedDetection']>): DetectResult {
		const ap = Math.min(1, Math.max(0, Number(s.ai_probability ?? 0)));
		const hpRaw = Number(s.human_probability);
		const hp = Number.isFinite(hpRaw)
			? Math.min(1, Math.max(0, hpRaw))
			: Math.min(1, Math.max(0, 1 - ap));
		const verdict: DetectResult['verdict'] =
			s.verdict === 'ai' || s.verdict === 'human'
				? s.verdict
				: ap >= 0.5
					? 'ai'
					: 'human';
		const c = s.classification;
		const classification: DetectResult['classification'] =
			c === 'LIKELY_AI' || c === 'POSSIBLY_AI' || c === 'POSSIBLY_HUMAN' || c === 'LIKELY_HUMAN'
				? c
				: 'POSSIBLY_HUMAN';
		return { verdict, ai_probability: ap, human_probability: hp, classification };
	}

	$effect(() => {
		const s = data.savedDetection;
		if (!s) {
			if (savedHydratedId !== null) {
				savedHydratedId = null;
				if (resultSource === 'history') {
					resultSource = 'none';
					result = null;
					inputText = '';
				}
			}
			return;
		}
		if (savedHydratedId === s.id) {
			return;
		}
		inputText = s.input_text;
		result = mapSavedRowToResult(s);
		error = null;
		resultSource = 'history';
		savedHydratedId = s.id;
		detId = s.id.replace(/-/g, '').slice(0, 10).toUpperCase();
		detMs = 0;
		setLastVisitedActivityId(s.id);
	});

	function trimToWordCap(text: string, max: number): string {
		const w = text.trim().split(/\s+/).filter(Boolean);
		if (w.length <= max) return text;
		return w.slice(0, max).join(' ');
	}

	onMount(() => {
		void (async () => {
			try {
				if (page.url.searchParams.has('id')) return;
				const stored = localStorage.getItem('detect_prefill');
				if (!stored) return;
				const cap = data.maxWordsPerScan ?? 999999;
				const applied = trimToWordCap(stored, cap);
				localStorage.removeItem('detect_prefill');
				inputText = applied;
				const wc = countWords(applied);
				// Same rules as manual Analyze — auto-run when hub/stash sends enough text
				if (applied.length < 50 || wc === 0 || wc > cap) return;
				await tick();
				await handleAnalyze();
			} catch {
				/* ignore */
			}
		})();
	});

	// ── Derived ───────────────────────────────────────────────────────────────
	const wordCount = $derived(
		inputText.trim().length === 0 ? 0 : inputText.trim().split(/\s+/).filter(Boolean).length
	);
	const maxWordsCap = $derived(Math.min(data.maxWordsPerScan ?? MAX_INPUT_WORDS, MAX_INPUT_WORDS));
	const overLimit = $derived(wordCount > maxWordsCap);
	const canSubmit = $derived(
		inputText.length >= 50 && wordCount > 0 && !overLimit && !isLoading
	);

	// Mock signal values derived from ai_probability
	const signalValues = $derived(result ? [
		Math.round((1 - result.ai_probability) * 100),
		Math.round((1 - result.ai_probability * 0.9) * 100),
		Math.round(result.ai_probability * 95),
		Math.round(result.ai_probability * 88),
		Math.round(result.ai_probability * 78),
		Math.round(result.ai_probability * 62),
	] : []);

	// ── Actions ───────────────────────────────────────────────────────────────
	async function handleAnalyze() {
		if (!canSubmit) return;
		isLoading = true;
		error = null;
		outOfWords = false;
		result = null;
		const t0 = Date.now();
		try {
			result = await detectText(inputText);
			resultSource = 'live';
			detId = 'det_' + Math.random().toString(36).slice(2, 8).toUpperCase();
			detMs = Date.now() - t0;
			if (result.words_balance !== undefined) wordsBalanceStore.set(result.words_balance);
			trackDetect(wordCount);
		} catch (err) {
			if (err instanceof OutOfWordsError) {
				outOfWords = true;
			} else {
				error = err instanceof Error ? err.message : 'Something went wrong.';
			}
		} finally {
			isLoading = false;
		}
	}

	function handleHumanize() {
		try { localStorage.setItem('humanize_prefill', inputText); } catch {}
		if (!data.user) {
			openLoginModal('/humanize');
			return;
		}
		goto('/humanize');
	}

	function verdictLabel(v: DetectResult['verdict']) {
		return v === 'ai' ? 'AI-authored' : 'Human-authored';
	}

	async function handleCopyReport() {
		if (!result) return;
		const report = [
			`HumanizeAIWrite Detection Report`,
			`ID: ${detId}  |  Time: ${detMs}ms`,
			``,
			`Verdict: ${verdictLabel(result.verdict)}`,
			`Classification: ${result.classification}`,
			`AI probability: ${Math.round(result.ai_probability * 100)}%`,
			`Human probability: ${Math.round(result.human_probability * 100)}%`,
		].join('\n');
		try {
			await navigator.clipboard.writeText(report);
			copied = true;
			setTimeout(() => { copied = false; }, 2000);
		} catch {}
	}

	function pasteSample() {
		const sample =
			"In today's rapidly evolving digital landscape, the fundamentally transformative power of AI-driven technologies has revolutionized operational efficiency. Furthermore, comprehensive data-driven paradigms have empowered stakeholders to leverage unprecedented synergy, fostering seamless integration across multifaceted workflows. Moreover, this transformative approach ensures that organizations can maintain crucial competitive advantages.";
		syncDetectTextareaValue(sample);
	}
</script>

<SEO
	title="AI Detector — Check If Text Is AI-Generated | HumanizeAIWrite"
	description="Free AI content detector. Instantly check if text was written by ChatGPT, Claude, or other AI. Get AI probability score and verdict."
	canonical="https://humanizeaiwrite.com/detect"
/>

<div class="detect-page">
	<!-- Page header -->
	<div style="margin-bottom: 28px;">
		{#if page.url.searchParams.get('id')}
			<p style="margin: 0 0 12px;">
				<a
					href="/activity"
					style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; font-weight: 600; color: var(--color-brand); text-decoration: none;"
				>← Activity log</a>
			</p>
		{/if}
		<h1 style="
			font-family: 'Newsreader', Georgia, serif;
			font-size: 34px;
			font-weight: 400;
			color: var(--color-text-primary);
			margin: 0 0 6px;
			letter-spacing: -0.02em;
		">Detect</h1>
		<p style="
			font-family: 'Space Grotesk', system-ui, sans-serif;
			font-size: 14px;
			color: var(--color-text-secondary);
			margin: 0;
		">Analyze text for AI authorship.</p>
		{#if data.previewBlurb}
			<p
				style="
					margin: 14px 0 0;
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 13px;
					line-height: 1.5;
					color: var(--color-text-muted);
					max-width: 52ch;
				"
			>
				{data.previewBlurb}
			</p>
		{/if}
	</div>

	<!-- Input + result: stack on small screens, two columns from --detect-bp -->
	<div class="detect-grid">

		<!-- Left: Input card -->
		<div class="detect-input-card">
			<CardHeader icon={scanIcon} label="Input">
				{#snippet right()}
					<span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: {overLimit ? '#ef4444' : 'var(--color-text-muted)'}; font-weight: {overLimit ? 700 : 400};">
						{wordCount.toLocaleString()} / {maxWordsCap.toLocaleString()} words
					</span>
				{/snippet}
			</CardHeader>

			<div class="detect-input-body">
				<TextEditor
					elementId={DETECT_INPUT_ID}
					bind:value={inputText}
					placeholder="Paste your text here to analyze…"
					minChars={50}
					maxWords={maxWordsCap}
					maxChars={(data.plan === 'basic' || data.plan === 'pro' || data.plan === 'ultra') ? 50000 : 20000}
					fill={true}
				/>

				{#if overLimit}
					<div style="
						display: flex; align-items: flex-start; gap: 10px;
						padding: 12px 14px;
						background: #ef444418;
						border-radius: 9px;
						box-shadow: inset 0 0 0 1px rgba(239,68,68,0.35);
					" role="alert">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:1px;" aria-hidden="true"><path d={alertIcon}/></svg>
						<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: #ef4444; line-height: 1.5;">
							Input exceeds {maxWordsCap.toLocaleString()}-word limit. Please shorten your text.
						</span>
					</div>
				{/if}

				{#if outOfWords}
					<div style="
						display: flex; align-items: flex-start; gap: 10px;
						padding: 12px 14px;
						background: #7c3aed18;
						border-radius: 9px;
						box-shadow: inset 0 0 0 1px rgba(124,58,237,0.35);
					" role="alert">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:1px;" aria-hidden="true"><path d={alertIcon}/></svg>
						<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: #7c3aed; line-height: 1.5;">
							You've run out of words. <a href="/settings" style="font-weight: 600; color: #7c3aed; text-decoration: underline;">Top up your balance</a> to continue.
						</span>
					</div>
				{/if}

				{#if error}
					<div style="
						display: flex; align-items: flex-start; gap: 10px;
						padding: 12px 14px;
						background: var(--color-ai-muted);
						border-radius: 9px;
						box-shadow: inset 0 0 0 1px rgba(239,68,68,0.35);
					" role="alert">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-ai)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:1px;" aria-hidden="true"><path d={alertIcon}/></svg>
						<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-ai); line-height: 1.5;">{error}</span>
					</div>
				{/if}

				<div class="detect-input-actions" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
					<Button variant="primary" size="md" icon={scanIcon} disabled={!canSubmit} loading={isLoading} onclick={handleAnalyze}>Analyze</Button>
					<Button
						variant="secondary"
						size="md"
						onclick={() => {
							syncDetectTextareaValue('');
							result = null;
							error = null;
							outOfWords = false;
							resultSource = 'none';
							savedHydratedId = null;
							// Strip ?id= etc. without blocking on navigation (e2e + UX stay in sync)
							if (page.url.searchParams.size > 0) {
								void goto('/detect', { replaceState: true, noScroll: true });
							}
						}}
					>Clear</Button>
					<Button variant="ghost" size="md" onclick={pasteSample}>Paste sample</Button>
				</div>
			</div>
		</div>

		<!-- Right: Result card -->
		<div class="detect-result-card">
			<CardHeader icon={gaugeIcon} label="Result">
				{#snippet right()}
					{#if result}
						{#if resultSource === 'history' && data.savedDetection}
							<span class="detect-run-meta" title="Opened from your activity">
								Saved · {new Date(data.savedDetection.created_at).toLocaleString()}
							</span>
						{:else}
							<span
								class="detect-run-meta"
								title="{detId} · {detMs}ms"
							>{detId} · {detMs}ms</span>
						{/if}
					{/if}
				{/snippet}
			</CardHeader>

			<div class="detect-result-body">
				{#if isLoading}
					<div class="detect-result-placeholder detect-result-loading">
						<div class="detect-loading-ring" aria-hidden="true">
							<svg width="160" height="160" viewBox="0 0 160 160" fill="none">
								<circle cx="80" cy="80" r="60" stroke="var(--color-bg-border)" stroke-width="8" fill="none"/>
								<circle cx="80" cy="80" r="60" stroke="var(--color-brand)" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="40 400" style="animation: hai-spin 1.4s linear infinite; transform-origin: 80px 80px;"/>
							</svg>
							<span class="detect-loading-dots">···</span>
						</div>
						<p class="detect-loading-caption">Scanning {wordCount} words…</p>
					</div>

				{:else if result}
					{@const aiPct  = Math.min(100, Math.max(0, Math.round(result.ai_probability    * 100)))}
					{@const humPct = Math.min(100, Math.max(0, Math.round(result.human_probability * 100)))}
					<div class="dr-panel animate-fade-up">

						<!-- ── Verdict hero ── -->
						<div class="dr-verdict" data-verdict={result.verdict}>
							<div class="dr-verdict-icon" data-verdict={result.verdict}>
								{#if result.verdict === 'ai'}
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d={alertIcon}/></svg>
								{:else}
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
								{/if}
							</div>
							<div>
								<p class="dr-verdict-label">Verdict</p>
								<p class="dr-verdict-text" data-verdict={result.verdict}>{verdictLabel(result.verdict)}</p>
							</div>
							<div style="margin-left: auto;">
								<ClassificationBadge classification={result.classification} />
							</div>
						</div>

						<!-- ── Gauge + scores ── -->
						<div class="dr-body">
							<div class="dr-gauge-wrap">
								{#key resultSource === 'history' && data.savedDetection ? data.savedDetection.id : detId}
									<ScoreGauge
										aiProbability={result.ai_probability}
										classification={result.classification}
										size={180}
										animate={true}
									/>
								{/key}
							</div>

							<div class="dr-scores">
								<!-- AI score card -->
								<div class="dr-score-card" data-type="ai">
									<div class="dr-score-top">
										<span class="dr-score-dot" style="background: var(--color-ai);"></span>
										<span class="dr-score-name">AI-generated</span>
									</div>
									<p class="dr-score-num" style="color: var(--color-ai);">{aiPct}<span class="dr-score-unit">%</span></p>
									<div class="dr-score-bar-track">
										<div class="dr-score-bar-fill" style="width:{aiPct}%; background: var(--color-ai);"></div>
									</div>
								</div>

								<!-- Human score card -->
								<div class="dr-score-card" data-type="human">
									<div class="dr-score-top">
										<span class="dr-score-dot" style="background: var(--color-human);"></span>
										<span class="dr-score-name">Human-written</span>
									</div>
									<p class="dr-score-num" style="color: var(--color-human);">{humPct}<span class="dr-score-unit">%</span></p>
									<div class="dr-score-bar-track">
										<div class="dr-score-bar-fill" style="width:{humPct}%; background: var(--color-human);"></div>
									</div>
								</div>
							</div>
						</div>

						<!-- ── Actions ── -->
						<div class="dr-actions">
							<Button variant="primary" size="sm" icon={wandIcon} onclick={handleHumanize}>Humanize this text</Button>
							<Button variant="ghost" size="sm" icon={copied ? checkIcon : copyIcon} onclick={handleCopyReport}>{copied ? 'Copied!' : 'Copy report'}</Button>
						</div>
					</div>

				{:else}
					<div class="detect-result-placeholder">
						<div class="detect-empty-icon" aria-hidden="true">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d={scanIcon}/></svg>
						</div>
						<p class="detect-empty-copy">Paste at least 50 characters in the input, then click <strong>Analyze</strong> to see AI probability and classification.</p>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Detail card (shown when result exists) -->
	{#if false && result}
		<div style="
			margin-top: 20px;
			background: var(--color-bg-surface);
			border-radius: 14px;
			box-shadow: inset 0 0 0 1px var(--color-bg-border);
			overflow: hidden;
		" class="animate-fade-up">
			<div style="padding: 14px 20px; background: var(--color-brand-muted); border-bottom: 1px solid rgba(16, 185, 129, 0.3);">
				<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.1em; text-transform: uppercase;">Signal breakdown</span>
			</div>
			<div class="detail-grid">
				<!-- Signal bars -->
				<div class="detail-grid-signals">
					<div style="display: flex; flex-direction: column; gap: 12px;">
						{#each signals as label, i}
							<div style="display: flex; flex-direction: column; gap: 5px;">
								<div style="display: flex; justify-content: space-between;">
									<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12.5px; color: var(--color-text-secondary);">{label}</span>
									<span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted);">{signalValues[i]}%</span>
								</div>
								<div style="height: 4px; background: var(--color-bg-elevated); border-radius: 99px; overflow: hidden;">
									<div style="height: 100%; width: {signalValues[i]}%; background: {i < 2 ? 'var(--color-human)' : 'var(--color-ai)'}; border-radius: 99px; opacity: 0.75;"></div>
								</div>
							</div>
						{/each}
					</div>
				</div>
				<!-- Flagged passages -->
				<div class="detail-grid-passages">
					<p class="detail-passages-title">Flagged phrases</p>
					<div class="detail-passages-scroll">
						<DiffText text={inputText} flags={AI_TELLS} phrases={AI_PHRASES} color="var(--color-ai)"/>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.detect-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: clamp(16px, 3vw, 32px) clamp(12px, 3vw, 24px) clamp(40px, 6vw, 64px);
	}

	.detect-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: clamp(16px, 2.5vw, 24px);
		align-items: stretch;
	}

	@media (min-width: 900px) {
		.detect-grid {
			grid-template-columns: 1fr 1fr;
			align-items: stretch;
		}
	}

	.detect-input-card {
		background: var(--color-bg-surface);
		border-radius: 14px;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		overflow: hidden;
		min-width: 0;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.detect-input-body {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-width: 0;
		flex: 1;
	}

	.detect-input-actions {
		margin-top: auto;
	}

	.detect-result-card {
		background: var(--color-bg-surface);
		border-radius: 14px;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		overflow: hidden;
		min-width: 0;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.detect-run-meta {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		color: var(--color-text-muted);
		background: var(--color-bg-elevated);
		padding: 4px 8px;
		border-radius: 4px;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		max-width: min(100%, 220px);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: inline-block;
		vertical-align: middle;
	}

	.detect-result-body {
		padding: clamp(16px, 3vw, 22px);
		min-width: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: stretch;
	}

	.detect-result-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		min-height: clamp(260px, 42vh, 360px);
		text-align: center;
		padding: 12px 8px;
		width: 100%;
		flex: 1;
	}

	.detect-result-loading {
		gap: 20px;
	}

	.detect-loading-ring {
		position: relative;
		width: min(160px, 50vw);
		height: min(160px, 50vw);
		flex-shrink: 0;
	}

	.detect-loading-ring svg {
		width: 100%;
		height: 100%;
	}

	.detect-loading-dots {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'JetBrains Mono', monospace;
		font-size: clamp(18px, 5vw, 22px);
		color: var(--color-brand);
		animation: hai-dots 1.4s ease-in-out infinite;
		letter-spacing: 0.12em;
	}

	.detect-loading-caption {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0;
		max-width: 28ch;
	}

	.detect-empty-icon {
		width: 52px;
		height: 52px;
		border-radius: 12px;
		background: var(--color-bg-elevated);
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.detect-empty-copy {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 14px;
		color: var(--color-text-muted);
		margin: 0;
		max-width: 36ch;
		line-height: 1.6;
	}

	.detect-empty-copy strong {
		color: var(--color-text-secondary);
		font-weight: 600;
	}

	/* ── Redesigned result panel ─────────────────────────────────── */
	.dr-panel {
		display: flex;
		flex-direction: column;
		gap: 20px;
		width: 100%;
	}

	/* Verdict hero */
	.dr-verdict {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 16px;
		border-radius: 12px;
		background: var(--color-bg-elevated);
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
	}
	.dr-verdict[data-verdict='ai'] {
		background: var(--color-ai-muted);
		box-shadow: inset 0 0 0 1px rgba(239,68,68,0.3);
	}
	.dr-verdict[data-verdict='human'] {
		background: var(--color-human-muted);
		box-shadow: inset 0 0 0 1px rgba(34,197,94,0.3);
	}
	.dr-verdict-icon {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background: var(--color-bg-surface);
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		color: var(--color-text-muted);
	}
	.dr-verdict-icon[data-verdict='ai']    { color: var(--color-ai);    background: rgba(239,68,68,0.12);  box-shadow: none; }
	.dr-verdict-icon[data-verdict='human'] { color: var(--color-human); background: rgba(34,197,94,0.12);  box-shadow: none; }
	.dr-verdict-label {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		margin: 0 0 2px;
	}
	.dr-verdict-text {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 15px;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}
	.dr-verdict-text[data-verdict='ai']    { color: var(--color-ai); }
	.dr-verdict-text[data-verdict='human'] { color: var(--color-human); }

	/* Gauge + score cards row */
	.dr-body {
		display: grid;
		grid-template-columns: 1fr;
		gap: 14px;
		align-items: start;
	}
	@media (min-width: 480px) {
		.dr-body {
			grid-template-columns: 220px 1fr;
			gap: 16px;
		}
	}
	.dr-gauge-wrap {
		flex-shrink: 0;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.dr-gauge-wrap :global(svg) {
		width: min(170px, 42vw);
		height: auto;
	}
	.dr-scores {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 100%;
		min-width: 0;
	}
	.dr-score-card {
		padding: 14px 16px;
		border-radius: 12px;
		background: linear-gradient(180deg, color-mix(in srgb, var(--color-bg-surface) 92%, white) 0%, var(--color-bg-elevated) 100%);
		border: 1px solid var(--color-bg-border);
		box-shadow: 0 1px 0 rgba(0,0,0,0.03), 0 10px 24px rgba(0,0,0,0.04);
	}
	.dr-score-top {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
	}
	.dr-score-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.dr-score-name {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}
	.dr-score-num {
		font-family: 'JetBrains Mono', monospace;
		font-size: 28px;
		font-weight: 700;
		line-height: 1;
		margin: 0 0 10px;
	}
	.dr-score-unit {
		font-size: 16px;
		opacity: 0.7;
	}
	.dr-score-bar-track {
		height: 7px;
		border-radius: 99px;
		background: color-mix(in srgb, var(--color-bg-surface) 55%, var(--color-bg-border));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-bg-border) 80%, transparent);
		overflow: hidden;
	}
	.dr-score-bar-fill {
		height: 100%;
		border-radius: 99px;
		transition: width 700ms cubic-bezier(0.22, 1, 0.36, 1);
		opacity: 0.9;
	}

	/* Actions */
	.dr-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding-top: 12px;
		margin-top: 2px;
		border-top: 1px solid var(--color-bg-border);
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr;
	}

	.detail-grid-signals {
		padding: clamp(16px, 3vw, 20px);
		border-bottom: 1px solid var(--color-divider);
		min-width: 0;
	}

	.detail-grid-passages {
		padding: clamp(16px, 3vw, 20px);
		min-width: 0;
	}

	.detail-passages-title {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-muted);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		margin: 0 0 12px;
	}

	.detail-passages-scroll {
		background: var(--color-bg-elevated);
		border-radius: 10px;
		padding: 14px 16px;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		max-height: min(480px, 60vh);
		overflow-y: auto;
		overflow-x: hidden;
		-webkit-overflow-scrolling: touch;
	}

	@media (min-width: 900px) {
		.detail-grid {
			grid-template-columns: 1fr 1fr;
		}

		.detail-grid-signals {
			border-bottom: none;
			border-right: 1px solid var(--color-bg-border);
		}
	}
</style>
