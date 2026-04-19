<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { setLastVisitedActivityId } from '$lib/client/lastActivityVisit';
	import { detectText, type DetectResult } from '$lib/client/api';
	import ScoreGauge from '$lib/components/ScoreGauge.svelte';
	import ClassificationBadge from '$lib/components/ClassificationBadge.svelte';
	import TextEditor from '$lib/components/TextEditor.svelte';
	import CardHeader from '$lib/components/CardHeader.svelte';
	import DiffText from '$lib/components/DiffText.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	// ── Icon paths ──────────────────────────────────────────────────────────────
	const scanIcon  = 'M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M7 12h10';
	const gaugeIcon = 'm12 14 4-4 M3.34 19a10 10 0 1 1 17.32 0';
	const wandIcon  = 'm15 4-2 2-2-2 M18 7l-2 2-2-2 M21 3v3 M3 21l9-9 M14 7l7 7-4 4-7-7z';
	const copyIcon  = 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z';
	const checkIcon = 'M20 6 9 17l-5-5';
	const alertIcon = 'M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z';

	// ── AI signal words for diff highlighting ──────────────────────────────────
	const AI_TELLS = new Set([
		'rapidly','evolving','landscape,','fundamentally','Furthermore,','multifaceted',
		'comprehensive','Moreover,','seamless','integration','empowered','stakeholders',
		'leverage','data-driven','unprecedented','Additionally,','paradigm','revolutionized',
		'operational','efficiency.','transformative','crucial','synergy','ingenuity','innovation.'
	]);

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
	let isLoading = $state(false);
	let result    = $state<DetectResult | null>(null);
	let error     = $state<string | null>(null);
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

	// ── Derived ───────────────────────────────────────────────────────────────
	const wordCount = $derived(
		inputText.trim().length === 0 ? 0 : inputText.trim().split(/\s+/).filter(Boolean).length
	);
	const canSubmit = $derived(inputText.length >= 50 && !isLoading);

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
		result = null;
		const t0 = Date.now();
		try {
			result = await detectText(inputText);
			resultSource = 'live';
			detId = 'det_' + Math.random().toString(36).slice(2, 8).toUpperCase();
			detMs = Date.now() - t0;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong.';
		} finally {
			isLoading = false;
		}
	}

	function handleHumanize() {
		try { localStorage.setItem('humanize_prefill', inputText); } catch {}
		goto('/humanize');
	}

	function verdictLabel(v: DetectResult['verdict']) {
		return v === 'ai' ? 'AI-authored' : 'Human-authored';
	}

	async function handleCopyReport() {
		if (!result) return;
		const report = [
			`HumanizeAI Detection Report`,
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
		inputText = "In today's rapidly evolving digital landscape, the fundamentally transformative power of AI-driven technologies has revolutionized operational efficiency. Furthermore, comprehensive data-driven paradigms have empowered stakeholders to leverage unprecedented synergy, fostering seamless integration across multifaceted workflows. Moreover, this transformative approach ensures that organizations can maintain crucial competitive advantages.";
	}
</script>

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
	</div>

	<!-- Input + result: stack on small screens, two columns from --detect-bp -->
	<div class="detect-grid">

		<!-- Left: Input card -->
		<div style="
			background: var(--color-bg-surface);
			border-radius: 14px;
			box-shadow: inset 0 0 0 1px var(--color-bg-border);
			overflow: hidden;
		">
			<CardHeader icon={scanIcon} label="Input">
				{#snippet right()}
					<span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted);">{wordCount} words</span>
				{/snippet}
			</CardHeader>

			<div style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
				<TextEditor
					bind:value={inputText}
					placeholder="Paste your text here to analyze…"
					minChars={50}
					maxChars={10000}
				/>

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

				<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
					<Button variant="primary" size="md" icon={scanIcon} disabled={!canSubmit} loading={isLoading} onclick={handleAnalyze}>Analyze</Button>
					<Button
						variant="secondary"
						size="md"
						onclick={async () => {
							inputText = '';
							result = null;
							error = null;
							resultSource = 'none';
							savedHydratedId = null;
							await goto('/detect', { replaceState: true, noScroll: true });
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
					<div class="detect-result-panel animate-fade-up">
						<div class="detect-result-gauge-col">
							<div class="detect-gauge-scale">
								<!-- remount gauge each run so arc/number never show stale animation vs fresh bars -->
								{#key resultSource === 'history' && data.savedDetection ? data.savedDetection.id : detId}
									<ScoreGauge
										aiProbability={result.ai_probability}
										classification={result.classification}
										size={220}
										animate={true}
									/>
								{/key}
							</div>
							<div class="detect-result-badges">
								<ClassificationBadge classification={result.classification} />
								<span class="detect-verdict-pill" data-verdict={result.verdict}>
									Verdict: {verdictLabel(result.verdict)}
								</span>
							</div>
						</div>

						<div class="detect-result-meta-col">
							<p class="detect-meta-heading">Confidence</p>
							<div class="detect-prob-rows">
								{#each [
									{ label: 'AI score', value: result.ai_probability, color: 'var(--color-ai)' },
									{ label: 'Human score', value: result.human_probability, color: 'var(--color-human)' }
								] as row (row.label)}
									{@const pct = Math.min(100, Math.max(0, Math.round(row.value * 100)))}
									<div class="detect-prob-row">
										<div class="detect-prob-row-head">
											<span class="detect-prob-label">{row.label}</span>
											<span class="detect-prob-value" style="color: {row.color};">{pct}%</span>
										</div>
										<div class="detect-prob-track">
											<div
												class="detect-prob-fill"
												style="width: {pct}%; background: {row.color};"
											></div>
										</div>
									</div>
								{/each}
							</div>

							<div class="detect-result-actions">
								<Button variant="secondary" size="sm" icon={wandIcon} onclick={handleHumanize}>Humanize this text</Button>
								<Button variant="ghost" size="sm" icon={copied ? checkIcon : copyIcon} onclick={handleCopyReport}>{copied ? 'Copied!' : 'Copy report'}</Button>
							</div>
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
	{#if result}
		<div style="
			margin-top: 20px;
			background: var(--color-bg-surface);
			border-radius: 14px;
			box-shadow: inset 0 0 0 1px var(--color-bg-border);
			overflow: hidden;
		" class="animate-fade-up">
			<div style="padding: 14px 20px; background: var(--color-bg-sunk); border-bottom: 1px solid var(--color-bg-border);">
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
						<DiffText text={inputText.slice(0, 480)} flags={AI_TELLS} color="var(--color-ai)"/>
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
			align-items: start;
		}
	}

	.detect-result-card {
		background: var(--color-bg-surface);
		border-radius: 14px;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		overflow: hidden;
		min-width: 0;
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

	/* Result: gauge + meta — stack narrow, row when space allows */
	.detect-result-panel {
		display: grid;
		grid-template-columns: 1fr;
		gap: clamp(20px, 4vw, 28px);
		align-items: start;
		justify-items: center;
		width: 100%;
		min-width: 0;
	}

	@media (min-width: 560px) {
		.detect-result-panel {
			grid-template-columns: minmax(0, 260px) minmax(0, 1fr);
			justify-items: stretch;
			align-items: start;
			column-gap: clamp(16px, 3vw, 28px);
		}

		.detect-result-gauge-col {
			justify-self: stretch;
			max-width: 280px;
			width: 100%;
		}
	}

	.detect-result-gauge-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		width: 100%;
		min-width: 0;
	}

	.detect-gauge-scale {
		width: 100%;
		display: flex;
		justify-content: center;
		line-height: 0;
	}

	.detect-gauge-scale :global(svg) {
		width: min(100%, 260px);
		height: auto;
		max-width: 100%;
	}

	.detect-result-badges {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		width: 100%;
		max-width: 320px;
	}

	.detect-verdict-pill {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-secondary);
		background: var(--color-bg-elevated);
		padding: 6px 12px;
		border-radius: 8px;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		text-align: center;
		width: fit-content;
		max-width: 100%;
	}

	.detect-verdict-pill[data-verdict='ai'] {
		color: var(--color-ai);
		box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.35);
		background: var(--color-ai-muted);
	}

	.detect-verdict-pill[data-verdict='human'] {
		color: var(--color-human);
		box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.35);
		background: var(--color-human-muted);
	}

	.detect-result-meta-col {
		width: 100%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.detect-meta-heading {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-muted);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		margin: 0;
	}

	.detect-prob-rows {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 100%;
	}

	.detect-prob-row {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}

	.detect-prob-row-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		min-width: 0;
	}

	.detect-prob-label {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-muted);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.detect-prob-value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 14px;
		font-weight: 700;
		flex-shrink: 0;
	}

	.detect-prob-track {
		height: 8px;
		background: var(--color-bg-elevated);
		border-radius: 99px;
		overflow: hidden;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
	}

	.detect-prob-fill {
		height: 100%;
		border-radius: 99px;
		transition: width 700ms cubic-bezier(0.22, 1, 0.36, 1);
		min-width: 0;
	}

	.detect-result-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		width: 100%;
		margin-top: 4px;
	}

	@media (max-width: 559px) {
		.detect-result-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.detect-result-actions :global(button) {
			width: 100%;
			justify-content: center;
		}
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr;
	}

	.detail-grid-signals {
		padding: clamp(16px, 3vw, 20px);
		border-bottom: 1px solid var(--color-bg-border);
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
		max-height: min(220px, 40vh);
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
