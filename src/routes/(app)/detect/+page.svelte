<script lang="ts">
	import { goto } from '$app/navigation';
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

	// ── State ──────────────────────────────────────────────────────────────────
	let inputText = $state('');
	let isLoading = $state(false);
	let result    = $state<DetectResult | null>(null);
	let error     = $state<string | null>(null);
	let copied    = $state(false);
	let detId     = $state('');
	let detMs     = $state(0);

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

	async function handleCopyReport() {
		if (!result) return;
		const report = [
			`HumanizeAI Detection Report`,
			`ID: ${detId}  |  Time: ${detMs}ms`,
			``,
			`AI Probability: ${Math.round(result.ai_probability * 100)}%`,
			`Human Probability: ${Math.round(result.human_probability * 100)}%`,
			`Classification: ${result.classification}`,
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

<div style="max-width: 1200px; margin: 0 auto; padding: 32px 24px 64px;">
	<!-- Page header -->
	<div style="margin-bottom: 28px;">
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

	<!-- Two-column grid -->
	<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start;" class="detect-grid">

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
					<Button variant="secondary" size="md" onclick={() => { inputText = ''; result = null; error = null; }}>Clear</Button>
					<Button variant="ghost" size="md" onclick={pasteSample}>Paste sample</Button>
				</div>
			</div>
		</div>

		<!-- Right: Result card -->
		<div style="
			background: var(--color-bg-surface);
			border-radius: 14px;
			box-shadow: inset 0 0 0 1px var(--color-bg-border);
			overflow: hidden;
			min-height: 420px;
		">
			<CardHeader icon={gaugeIcon} label="Result">
				{#snippet right()}
					{#if result}
						<span style="
							font-family: 'JetBrains Mono', monospace;
							font-size: 11px;
							color: var(--color-text-muted);
							background: var(--color-bg-elevated);
							padding: 3px 8px;
							border-radius: 4px;
							box-shadow: inset 0 0 0 1px var(--color-bg-border);
						">{detId} · {detMs}ms</span>
					{/if}
				{/snippet}
			</CardHeader>

			<div style="padding: 20px;">
				{#if isLoading}
					<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; min-height: 360px; text-align: center;">
						<div style="position: relative; width: 160px; height: 160px;">
							<svg width="160" height="160" viewBox="0 0 160 160" fill="none" style="position: absolute; inset: 0;" aria-hidden="true">
								<circle cx="80" cy="80" r="60" stroke="var(--color-bg-border)" stroke-width="8" fill="none"/>
								<circle cx="80" cy="80" r="60" stroke="var(--color-brand)" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="40 400" style="animation: hai-spin 1.4s linear infinite; transform-origin: 80px 80px;"/>
							</svg>
							<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
								<span style="font-family: 'JetBrains Mono', monospace; font-size: 22px; color: var(--color-brand); animation: hai-dots 1.4s ease-in-out infinite; letter-spacing: 0.12em;">···</span>
							</div>
						</div>
						<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-text-muted); margin: 0;">Scanning {wordCount} words…</p>
					</div>

				{:else if result}
					<div style="display: flex; flex-direction: column; align-items: center; gap: 16px;" class="animate-fade-up">
						<ScoreGauge aiProbability={result.ai_probability} classification={result.classification} size={260} animate={true}/>
						<ClassificationBadge classification={result.classification}/>

						<!-- Prob rows -->
						<div style="width: 100%; display: flex; flex-direction: column; gap: 10px; margin-top: 4px;">
							{#each [
								{ label: 'AI signal',    value: result.ai_probability,    color: 'var(--color-ai)' },
								{ label: 'Human signal', value: result.human_probability, color: 'var(--color-human)' }
							] as row}
								<div style="display: flex; flex-direction: column; gap: 5px;">
									<div style="display: flex; align-items: center; justify-content: space-between;">
										<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">{row.label}</span>
										<span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: {row.color};">{Math.round(row.value * 100)}%</span>
									</div>
									<div style="height: 6px; background: var(--color-bg-elevated); border-radius: 99px; overflow: hidden; box-shadow: inset 0 0 0 1px var(--color-bg-border);">
										<div style="height: 100%; width: {Math.round(row.value * 100)}%; background: {row.color}; border-radius: 99px; transition: width 700ms cubic-bezier(0.22,1,0.36,1);"></div>
									</div>
								</div>
							{/each}
						</div>

						<div style="display: flex; gap: 8px; width: 100%; flex-wrap: wrap;">
							<Button variant="secondary" size="sm" icon={wandIcon} onclick={handleHumanize}>Humanize this text</Button>
							<Button variant="ghost" size="sm" icon={copied ? checkIcon : copyIcon} onclick={handleCopyReport}>{copied ? 'Copied!' : 'Copy report'}</Button>
						</div>
					</div>

				{:else}
					<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; min-height: 360px; text-align: center;">
						<div style="width: 52px; height: 52px; border-radius: 12px; background: var(--color-bg-elevated); box-shadow: inset 0 0 0 1px var(--color-bg-border); display: flex; align-items: center; justify-content: center;">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={scanIcon}/></svg>
						</div>
						<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-muted); margin: 0; max-width: 200px; line-height: 1.6;">Paste text and click Analyze to see results</p>
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
			<div style="display: grid; grid-template-columns: 1fr 1fr;" class="detail-grid">
				<!-- Signal bars -->
				<div style="padding: 20px; border-right: 1px solid var(--color-bg-border);">
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
				<div style="padding: 20px;">
					<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 12px;">Flagged passages</p>
					<div style="background: var(--color-bg-elevated); border-radius: 10px; padding: 16px; box-shadow: inset 0 0 0 1px var(--color-bg-border); max-height: 200px; overflow-y: auto;">
						<DiffText text={inputText.slice(0, 480)} flags={AI_TELLS} color="var(--color-ai)"/>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	@media (max-width: 800px) {
		.detect-grid, .detail-grid { grid-template-columns: 1fr !important; }
		.detail-grid > div:first-child { border-right: none !important; border-bottom: 1px solid var(--color-bg-border); }
	}
</style>
