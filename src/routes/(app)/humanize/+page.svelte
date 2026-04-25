<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { setLastVisitedActivityId } from '$lib/client/lastActivityVisit';
	import { humanizeText, OutOfWordsError, type HumanizeResult } from '$lib/client/api';
	import { MAX_INPUT_WORDS } from '$lib/limits';
	import { trackHumanize } from '$lib/client/analytics';
	import { wordsBalanceStore } from '$lib/stores/wordsBalance';
	import ClassificationBadge from '$lib/components/ClassificationBadge.svelte';
	import DiffText from '$lib/components/DiffText.svelte';
	import TextEditor from '$lib/components/TextEditor.svelte';
	import CardHeader from '$lib/components/CardHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import SEO from '$lib/components/SEO.svelte';

	const wandIcon    = 'm15 4-2 2-2-2 M18 7l-2 2-2-2 M21 3v3 M3 21l9-9 M14 7l7 7-4 4-7-7z';
	const sparkleIcon = 'M12 3 13.5 9 19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1L12 3z';
	const copyIcon    = 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z';
	const checkIcon   = 'M20 6 9 17l-5-5';
	const scanIcon    = 'M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M7 12h10';
	const refreshIcon = 'M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5';
	const trashIcon   = 'M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6';
	const uploadIcon  = 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12';
	const playIcon    = 'M8 5v14l11-7z';

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
	let outOfWords      = $state(false);
	let copied          = $state(false);
	let elapsedSeconds  = $state(0);
	let progress        = $state(0);
	let elapsedInterval: ReturnType<typeof setInterval> | null = null;
	let progressInterval: ReturnType<typeof setInterval> | null = null;
	let fileInputEl: HTMLInputElement | null = null;
	let showHowItWorks = $state(false);


	const inputWordCount = $derived(
		inputText.trim().length === 0 ? 0 : inputText.trim().split(/\s+/).filter(Boolean).length
	);
	const overLimit = $derived(inputWordCount > MAX_INPUT_WORDS);
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
		void (async () => {
			try {
				if (page.url.searchParams.has('id')) return;
				const stored = localStorage.getItem('humanize_prefill');
				if (!stored) return;
				localStorage.removeItem('humanize_prefill');
				inputText = stored;
				if (stored.trim().length < 10) return;
				await tick();
				await handleHumanize();
			} catch {
				/* ignore */
			}
		})();
	});

	async function handleHumanize() {
		if (isLoading) return;
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
			if (result.words_balance !== undefined) wordsBalanceStore.set(result.words_balance);
			trackHumanize(inputWordCount);
		} catch (err) {
			if (err instanceof OutOfWordsError) {
				outOfWords = true;
			} else {
				error = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
			}
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

	async function handleRecheck() {
		const text = result ? result.humanized_text : inputText;
		try {
			localStorage.setItem('detect_prefill', text);
		} catch {}
		await goto('/detect');
	}

	function handleRegenerate() {
		result = null;
		handleHumanize();
	}

	function handleClear() {
		inputText = '';
		result = null;
		error = null;
		outOfWords = false;
		resultSource = 'none';
	}

	function triggerUpload() {
		fileInputEl?.click();
	}

	async function handleUploadFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			inputText = text;
			error = null;
			outOfWords = false;
			result = null;
			resultSource = 'none';
		} catch {
			error = 'Could not read that file.';
		} finally {
			// allow re-uploading same file
			input.value = '';
		}
	}
</script>

<SEO
	title="AI Text Humanizer — Make AI Writing Undetectable | HumanizeAIWrite"
	description="Instantly humanize AI-generated text. Bypass GPTZero, Turnitin, and AI detectors. Paste ChatGPT or Claude output — get natural human-sounding writing back."
	canonical="https://humanizeaiwrite.com/humanize"
/>

<div style="max-width: 1200px; margin: 0 auto; padding: 18px 24px 64px;">
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
		<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">
			<div>
				<h1 style="font-family: 'Newsreader', Georgia, serif; font-size: 34px; font-weight: 400; color: var(--color-text-primary); margin: 0 0 6px; letter-spacing: -0.02em;">Humanize</h1>
				<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0;">Rewrite AI-generated text to read naturally.</p>
			</div>
		</div>

	</div>

	<!-- ── Input card ── -->
	<div style="
		background: var(--color-bg-surface);
		border-radius: 14px;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		overflow: hidden;
		margin-bottom: 20px;
		margin-top: 14px;
	">
		<CardHeader icon={wandIcon} label="Input">
			{#snippet right()}
				<div style="display:flex;align-items:center;gap:10px;">
					<span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: {overLimit ? '#ef4444' : 'var(--color-text-muted)'}; font-weight: {overLimit ? 700 : 400};">
						{inputWordCount.toLocaleString()} / {MAX_INPUT_WORDS.toLocaleString()} words
					</span>
					<button
						type="button"
						onclick={handleClear}
						disabled={isLoading || (inputText.trim().length === 0 && !result && !error)}
						style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:9px;border:1px solid var(--color-bg-border);background:transparent;color:var(--color-text-secondary);cursor:pointer;font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;font-weight:600;opacity:{isLoading ? 0.6 : 1};"
						title="Clear"
					>
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d={trashIcon}/>
						</svg>
						Clear
					</button>
				</div>
			{/snippet}
		</CardHeader>

		<div style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
			<input
				bind:this={fileInputEl}
				type="file"
				accept=".txt,.md,.rtf,.csv,.json"
				style="display:none"
				onchange={handleUploadFile}
			/>
			<TextEditor
				bind:value={inputText}
				placeholder="Paste or type the text you want to sound more natural…"
				minChars={10}
			/>

			{#if overLimit}
				<div style="
					display: flex; align-items: flex-start; gap: 10px;
					padding: 12px 14px;
					background: #ef444418;
					border-radius: 9px;
					box-shadow: inset 0 0 0 1px rgba(239,68,68,0.35);
				" role="alert">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:1px;" aria-hidden="true">
						<path d="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
					</svg>
					<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: #ef4444; line-height: 1.5;">
						Input exceeds {MAX_INPUT_WORDS.toLocaleString()}-word limit. Please shorten your text.
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
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:1px;" aria-hidden="true">
						<path d="M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
					</svg>
					<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: #7c3aed; line-height: 1.5;">
						You've run out of words. <a href="/plans" style="font-weight: 600; color: #7c3aed; text-decoration: underline;">Top up your balance</a> to continue.
					</span>
				</div>
			{/if}

			<div style="display: flex; gap: 8px; flex-wrap: wrap;">
				<Button
					variant="primary"
					size="md"
					icon={wandIcon}
					ariaLabel="Humanize"
					disabled={isLoading || inputText.trim().length < 10 || overLimit}
					loading={isLoading}
					onclick={handleHumanize}
				>Humanize</Button>
				<Button
					variant="ghost"
					size="md"
					icon={playIcon}
					onclick={() => {
						showHowItWorks = true;
						queueMicrotask(() => {
							const el = document.getElementById('how-it-works');
							el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
						});
					}}
				>How it works</Button>
				<Button variant="secondary" size="md" icon={scanIcon} onclick={handleRecheck}>Re-check detection</Button>
				<Button variant="ghost" size="md" icon={uploadIcon} onclick={triggerUpload}>Upload file</Button>
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
						position: relative;
					">
						<button
							type="button"
							onclick={handleCopy}
							title="Copy output"
							style="position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:10px;background:var(--color-bg-surface);border:1px solid var(--color-bg-border);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--color-text-secondary);"
						>
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d={copyIcon}/>
							</svg>
						</button>
						{#if result.humanized_text.trim().length === 0}
							<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-muted); margin: 0; text-align: center;">
								The humanizer returned an empty response. Please try again with different text.
							</p>
						{:else}
							<DiffText text={result.humanized_text} flags={HUMAN_FIXES} color="var(--color-human)"/>
						{/if}
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

	<!-- Benefits row (matches marketing-style strip) -->
	<div style="margin-top: 14px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
		{#each [
			{ title: 'AI detector bypass', desc: 'Humanized to avoid AI detection', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
			{ title: 'Keep your meaning', desc: 'Preserves original intent & context', icon: 'M21 7-9 13-5-5 5-5 4 4L7 14' },
			{ title: 'Improved readability', desc: 'Natural, clear, and engaging', icon: 'M4 19h16 M4 5h16 M4 12h10' },
			{ title: 'Your data is private', desc: 'Secure & confidential', icon: 'M12 17a2 2 0 0 0 2-2v-3a2 2 0 0 0-4 0v3a2 2 0 0 0 2 2z M17 11V9a5 5 0 0 0-10 0v2 M5 11h14v10H5z' }
		] as b}
			<div style="display:flex;gap:10px;align-items:flex-start;padding:12px 12px;border-radius:12px;background:var(--color-bg-surface);box-shadow:inset 0 0 0 1px var(--color-bg-border);">
				<div style="width:28px;height:28px;border-radius:10px;background:var(--color-brand-muted);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d={b.icon}/>
					</svg>
				</div>
				<div style="min-width:0;">
					<div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;font-weight:700;color:var(--color-text-primary);line-height:1.2;margin-bottom:2px;">
						{b.title}
					</div>
					<div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:11px;color:var(--color-text-muted);line-height:1.35;">
						{b.desc}
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if showHowItWorks}
		<section id="how-it-works" style="margin-top: 18px; padding-top: 6px;">
			<div style="background:var(--color-bg-surface);border-radius:14px;box-shadow:inset 0 0 0 1px var(--color-bg-border);padding:18px 20px;">
				<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
					<div style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--color-text-muted);">How it works</div>
					<button
						type="button"
						onclick={() => (showHowItWorks = false)}
						style="padding:6px 10px;border-radius:10px;background:transparent;border:1px solid var(--color-bg-border);cursor:pointer;font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;font-weight:600;color:var(--color-text-secondary);"
					>Close</button>
				</div>
				<p style="margin:0;font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;line-height:1.7;color:var(--color-text-secondary);">
					Paste (or upload) text, click <b>Humanize</b>, and we rewrite it for clarity and natural flow while preserving meaning. Use <b>Re-check detection</b> to analyze the output.
				</p>
			</div>
		</section>
	{/if}
</div>

{#if outOfWords}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style="background: rgba(0,0,0,0.7)"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="w-full max-w-sm rounded-2xl border p-6 text-center"
			style="background: var(--color-bg-surface); border-color: var(--color-bg-border)"
		>
			<div class="text-3xl mb-3">📝</div>
			<h3 class="text-lg font-semibold mb-2" style="color: var(--color-text-primary)">
				Out of words
			</h3>
			<p class="text-sm mb-5" style="color: var(--color-text-secondary)">
				You've used all your words for this month. Buy a word pack to keep humanizing, or wait until your plan renews.
			</p>
			<div class="flex gap-3">
				<button
					onclick={() => (outOfWords = false)}
					class="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all"
					style="background: transparent; border-color: var(--color-bg-border); color: var(--color-text-secondary)"
				>
					Not now
				</button>
				<a
					href="/plans"
					class="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center transition-all"
					style="background: var(--color-brand); color: white"
				>
					Top up words
				</a>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes shimmer {
		0%   { background-position: -200% 0; }
		100% { background-position:  200% 0; }
	}

	@media (max-width: 920px) {
		div[style*="grid-template-columns: repeat(4, 1fr)"] {
			grid-template-columns: repeat(2, 1fr) !important;
		}
	}
	@media (max-width: 520px) {
		div[style*="grid-template-columns: repeat(2, 1fr)"] {
			grid-template-columns: 1fr !important;
		}
	}
</style>
