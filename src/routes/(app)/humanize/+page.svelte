<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { setLastVisitedActivityId } from '$lib/client/lastActivityVisit';
	import { humanizeText, type HumanizeResult } from '$lib/client/api';
	import ClassificationBadge from '$lib/components/ClassificationBadge.svelte';
	import DiffText from '$lib/components/DiffText.svelte';
	import TextEditor from '$lib/components/TextEditor.svelte';
	import CardHeader from '$lib/components/CardHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	const wandIcon    = 'm15 4-2 2-2-2 M18 7l-2 2-2-2 M21 3v3 M3 21l9-9 M14 7l7 7-4 4-7-7z';
	const sparkleIcon = 'M12 3 13.5 9 19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1L12 3z';
	const copyIcon    = 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z';
	const checkIcon   = 'M20 6 9 17l-5-5';
	const scanIcon    = 'M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M7 12h10';
	const refreshIcon = 'M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5';

	// Human-natural words highlighted in output
	const HUMAN_FIXES = new Set([
		'crept','wild','fast','things','baked','strings','attached','messier',
		'headlines','weirder','Either','way,','pair','Nobody\'s','figured',
		'kind','interesting','part.'
	]);

	// Props
	interface Props {
		data: PageData;
	}
	let { data }: Props = $props();

	type ResultSource = 'none' | 'live' | 'history';
	let resultSource = $state<ResultSource>('none');
	/** Avoid re-hydrating saved row when `?id=` stays on URL after a new humanize */
	let savedHydratedId = $state<string | null>(null);

	// State
	let inputText = $state('');
	let isLoading       = $state(false);
	let result          = $state<HumanizeResult | null>(null);
	let error           = $state<string | null>(null);
	let copied          = $state(false);
	let elapsedSeconds  = $state(0);
	let progress        = $state(0);
	let elapsedInterval: ReturnType<typeof setInterval> | null = null;
	let progressInterval: ReturnType<typeof setInterval> | null = null;

	const isFree = $derived(data.plan === 'free');

	const inputWordCount = $derived(
		inputText.trim().length === 0 ? 0 : inputText.trim().split(/\s+/).filter(Boolean).length
	);
	const outputWordCount = $derived(
		result ? result.humanized_text.trim().split(/\s+/).filter(Boolean).length : 0
	);
	const estRemaining = $derived(Math.max(0, Math.round(130 * (1 - progress / 100) )));

	$effect(() => {
		const h = data.savedHumanization;
		if (!h) {
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
		if (savedHydratedId === h.id) {
			return;
		}
		inputText = h.input_text;
		result = {
			humanized_text: h.output_text,
			word_count: h.word_count ?? h.output_text.trim().split(/\s+/).filter(Boolean).length
		};
		error = null;
		resultSource = 'history';
		savedHydratedId = h.id;
		setLastVisitedActivityId(h.id);
	});

	onMount(() => {
		try {
			if (page.url.searchParams.has('id')) return;
			const stored = localStorage.getItem('humanize_prefill');
			if (stored) {
				inputText = stored;
				localStorage.removeItem('humanize_prefill');
			}
		} catch {}
	});

	async function handleHumanize() {
		if (isLoading || isFree) return;
		isLoading = true;
		error = null;
		result = null;
		resultSource = 'none';
		elapsedSeconds = 0;
		progress = 0;

		elapsedInterval = setInterval(() => { elapsedSeconds += 1; }, 1000);
		progressInterval = setInterval(() => {
			progress = Math.min(progress + Math.random() * 2, 95);
		}, 1500);

		try {
			result = await humanizeText(inputText);
			resultSource = 'live';
			progress = 100;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
		} finally {
			isLoading = false;
			if (elapsedInterval) { clearInterval(elapsedInterval); elapsedInterval = null; }
			if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
		}
	}

	async function handleCopy() {
		if (!result) return;
		try {
			await navigator.clipboard.writeText(result.humanized_text);
			copied = true;
			setTimeout(() => { copied = false; }, 2000);
		} catch {}
	}

	function handleRecheck() {
		const text = result ? result.humanized_text : inputText;
		try { localStorage.setItem('humanize_prefill', text); } catch {}
		goto('/detect');
	}

	function handleRegenerate() {
		result = null;
		handleHumanize();
	}
</script>

<div style="max-width: 1200px; margin: 0 auto; padding: 32px 24px 64px;">
	<!-- Page header -->
	<div style="margin-bottom: 8px;">
		{#if page.url.searchParams.get('id')}
			<p style="margin: 0 0 10px;">
				<a
					href="/activity"
					style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; font-weight: 600; color: var(--color-brand); text-decoration: none;"
				>← Activity log</a>
			</p>
		{/if}
		<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
			<span style="
				font-family: 'JetBrains Mono', monospace;
				font-size: 10px;
				font-weight: 700;
				letter-spacing: 0.14em;
				text-transform: uppercase;
				color: var(--color-text-dim);
				background: var(--color-bg-elevated);
				padding: 3px 8px;
				border-radius: 4px;
				box-shadow: inset 0 0 0 1px var(--color-bg-border);
			">STACKED DIFF VIEW</span>
		</div>
		<h1 style="font-family: 'Newsreader', Georgia, serif; font-size: 34px; font-weight: 400; color: var(--color-text-primary); margin: 0 0 6px; letter-spacing: -0.02em;">Humanize</h1>
		<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0;">Rewrite AI-generated text to read naturally.</p>
	</div>

	{#if isFree}
		<div style="
			margin: 20px 0;
			padding: 14px 18px;
			background: var(--color-brand-muted);
			border-radius: 10px;
			box-shadow: inset 0 0 0 1px var(--color-brand);
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
		">
			<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13.5px; color: var(--color-text-primary);">Humanizing requires a Pro or Agency plan.</span>
			<a href="/pricing" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; font-weight: 700; color: var(--color-brand); text-decoration: none; white-space: nowrap;">Upgrade to Pro →</a>
		</div>
	{/if}

	<!-- ── Input card ── -->
	<div style="
		background: var(--color-bg-surface);
		border-radius: 14px;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		overflow: hidden;
		margin-bottom: 20px;
		margin-top: 24px;
	">
		<CardHeader icon={wandIcon} label="Input">
			{#snippet right()}
				<span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted);">{inputWordCount} words</span>
			{/snippet}
		</CardHeader>

		<div style="padding: 20px;">
			<div style="margin-bottom: 16px;">
				<TextEditor
					bind:value={inputText}
					placeholder="Paste or type the text you want to sound more natural…"
					minChars={10}
				/>
			</div>

			<div style="display: flex; gap: 8px; flex-wrap: wrap;">
				<Button
					variant="primary"
					size="md"
					icon={wandIcon}
					disabled={isFree || isLoading || inputText.trim().length < 10}
					loading={isLoading}
					onclick={handleHumanize}
				>Humanize</Button>
				<Button variant="secondary" size="md" icon={scanIcon} onclick={handleRecheck}>Re-check detection</Button>
			</div>
		</div>
	</div>

	<!-- ── Output card ── -->
	<div style="
		background: var(--color-bg-surface);
		border-radius: 14px;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		overflow: hidden;
	">
		<CardHeader icon={sparkleIcon} label="Output · Humanized rewrite">
			{#snippet right()}
				{#if result}
					{#if resultSource === 'history' && data.savedHumanization}
						<span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); margin-right: 8px;">
							Saved · {new Date(data.savedHumanization.created_at).toLocaleString()}
						</span>
					{/if}
					<ClassificationBadge classification="LIKELY_HUMAN" size="sm"/>
					<span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted);">{outputWordCount} words</span>
				{/if}
			{/snippet}
		</CardHeader>

		<div style="padding: 20px;">
			{#if isLoading}
				<!-- Processing state -->
				<div style="display: flex; flex-direction: column; gap: 16px;">
					<!-- Shimmer lines -->
					<div style="
						background: var(--color-bg-elevated);
						border-radius: 10px;
						padding: 18px 20px;
						box-shadow: inset 0 0 0 1px var(--color-bg-border);
						display: flex;
						flex-direction: column;
						gap: 10px;
					">
						{#each [100, 92, 87, 78, 55] as w}
							<div style="
								height: 14px;
								width: {w}%;
								border-radius: 7px;
								background: linear-gradient(90deg, var(--color-bg-elevated) 25%, var(--color-bg-border) 50%, var(--color-bg-elevated) 75%);
								background-size: 200% 100%;
								animation: shimmer 1.5s infinite;
							"></div>
						{/each}
					</div>

					<!-- Progress info -->
					<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
						<span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-brand);">{Math.round(progress)}% · est. {estRemaining}s remaining</span>
						<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; color: var(--color-text-muted);">elapsed: {elapsedSeconds}s</span>
					</div>

					<!-- Progress bar -->
					<div style="height: 3px; background: var(--color-bg-elevated); border-radius: 99px; overflow: hidden; box-shadow: inset 0 0 0 1px var(--color-bg-border);">
						<div style="height: 100%; width: {progress}%; background: var(--color-brand); border-radius: 99px; transition: width 1.5s ease;"></div>
					</div>

					<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; color: var(--color-text-muted); margin: 0; text-align: center;">
						Our humanizer takes up to 130 seconds for thorough rewriting. Please wait.
					</p>
				</div>

			{:else if result}
				<!-- Result state -->
				<div class="animate-fade-up" style="display: flex; flex-direction: column; gap: 16px;">
					<div style="
						background: var(--color-bg-elevated);
						border-radius: 10px;
						padding: 18px 20px;
						box-shadow: inset 0 0 0 1px var(--color-bg-border);
					">
						<DiffText text={result.humanized_text} flags={HUMAN_FIXES} color="var(--color-human)"/>
					</div>

					<div style="display: flex; gap: 8px; flex-wrap: wrap;">
						<Button variant="primary" size="sm" icon={copied ? checkIcon : copyIcon} onclick={handleCopy}>
							{copied ? 'Copied!' : 'Copy output'}
						</Button>
						<Button variant="secondary" size="sm" icon={scanIcon} onclick={handleRecheck}>Re-check detection</Button>
						<Button variant="ghost" size="sm" icon={refreshIcon} onclick={handleRegenerate}>Regenerate</Button>
					</div>
				</div>

			{:else}
				<!-- Ready state -->
				<div style="
					display: flex;
					align-items: center;
					justify-content: center;
					min-height: 180px;
					text-align: center;
				">
					<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-muted); margin: 0;">
						Press Humanize to rewrite the input.
					</p>
				</div>
			{/if}

			{#if error}
				<div style="
					display: flex; align-items: flex-start; gap: 10px;
					padding: 12px 14px; margin-top: 12px;
					background: var(--color-ai-muted);
					border-radius: 9px;
					box-shadow: inset 0 0 0 1px rgba(239,68,68,0.35);
				" role="alert">
					<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-ai); line-height: 1.5;">{error}</span>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	@keyframes shimmer {
		0%   { background-position: -200% 0; }
		100% { background-position:  200% 0; }
	}
</style>
