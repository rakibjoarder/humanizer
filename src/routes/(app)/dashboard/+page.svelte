<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';

	interface Profile {
		plan: 'free' | 'basic' | 'pro' | 'ultra';
		full_name: string | null;
		email: string;
	}

	interface WordPack {
		priceId: string;
		words: number;
		price: number;
		label: string;
	}

	interface Props {
		data: {
			profile: Profile;
			wordsBalance: number;
			planWordsLimit: number;
			wordPacks: WordPack[];
			totalDetections: number;
			totalHumanizations: number;
			wordsAnalyzed: number;
			avgAiProbability: number | null;
		};
	}

	let { data }: Props = $props();

	const isPaidPlan = $derived(
		data.profile.plan === 'basic' || data.profile.plan === 'pro' || data.profile.plan === 'ultra'
	);
	const planLabel = $derived(() => {
		switch (data.profile.plan) {
			case 'basic': return 'Basic';
			case 'pro': return 'Pro';
			case 'ultra': return 'Ultra';
			default: return 'Free';
		}
	});

	const showUpgradedBanner = $derived(page.url.searchParams.get('upgraded') === 'true');

	// ── Words bar ──────────────────────────────────────────────────────────────
	const wordsLimit = $derived(data.planWordsLimit);
	const wordsUsedPct = $derived(
		wordsLimit <= 0
			? 0
			: Math.min(100, ((wordsLimit - data.wordsBalance) / wordsLimit) * 100)
	);
	const wordsBarColor = $derived(
		data.wordsBalance === 0 ? 'var(--color-ai)' :
		data.wordsBalance <= wordsLimit * 0.2 ? '#f59e0b' :
		'var(--color-brand)'
	);

	// ── Stat boxes ─────────────────────────────────────────────────────────────
	let wordBuyLoading = $state<string | null>(null);

	async function buyWords(priceId: string) {
		wordBuyLoading = priceId;
		try {
			const res = await fetch('/api/stripe/tokens', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ priceId })
			});
			const json = await res.json();
			if (json.url) window.location.href = json.url;
			else alert(json.error ?? 'Could not start purchase.');
		} catch {
			alert('Network error.');
		} finally {
			wordBuyLoading = null;
		}
	}

	const wordsSub = $derived(
		data.wordsBalance <= 1000 ? 'low — top up in settings' : 'resets monthly'
	);

	const statBoxes = $derived([
		{ label: 'Total detections',    value: data.totalDetections.toLocaleString(),    sub: 'all time' },
		{ label: 'Humanizations',       value: data.totalHumanizations.toLocaleString(), sub: 'all time' },
		{ label: 'Words processed',     value: formatWords(data.wordsAnalyzed),          sub: 'all time' },
		{ label: 'Avg. AI probability', value: data.avgAiProbability !== null ? `${data.avgAiProbability}%` : '—', sub: 'across detections' },
		isPaidPlan
			? { label: 'Words remaining', value: data.wordsBalance.toLocaleString(), sub: wordsSub }
			: { label: 'Plan', value: 'Free', sub: 'upgrade to humanize' },
	]);

	function formatWords(n: number): string {
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
		if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
		return n.toLocaleString();
	}

</script>

<div style="max-width: 1200px; margin: 0 auto; padding: 32px 24px 64px; display: flex; flex-direction: column; gap: 24px;">

	<!-- Upgraded banner -->
	{#if showUpgradedBanner}
		<div style="
			display: flex; align-items: center; gap: 10px;
			padding: 12px 16px;
			background: var(--color-human-muted);
			border-radius: 10px;
			box-shadow: inset 0 0 0 1px var(--color-human);
			font-family: 'Space Grotesk', system-ui, sans-serif;
			font-size: 14px;
			color: var(--color-human);
		" class="animate-fade-up" role="alert">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
			You're now on the {planLabel()} plan. Enjoy your upgraded features!
		</div>
	{/if}

	<!-- Page header -->
	<div>
		<h1 style="font-family: 'Newsreader', Georgia, serif; font-size: 34px; font-weight: 400; color: var(--color-text-primary); margin: 0 0 6px; letter-spacing: -0.02em;">Dashboard</h1>
		<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0;">Usage, history, and account at a glance.</p>
	</div>

	<!-- ── Top row: usage card + stat grid ── -->
	<div style="display: grid; grid-template-columns: 360px 1fr; gap: 20px; align-items: start;" class="dash-top">

		<!-- Usage card -->
		<div style="
			background: var(--color-bg-surface);
			border-radius: 14px;
			box-shadow: inset 0 0 0 1px var(--color-bg-border);
			padding: 28px;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 16px;
		">
			<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.12em; text-transform: uppercase; margin: 0; align-self: flex-start;">Words remaining</p>

			<!-- Plan label -->
			<p style="font-family: 'Newsreader', Georgia, serif; font-size: 24px; font-weight: 400; color: var(--color-text-primary); margin: 0;">{planLabel()} Plan</p>

			{#if isPaidPlan}
				<!-- Words balance display -->
				<div style="text-align: center;">
					<p style="font-family: 'Newsreader', Georgia, serif; font-size: 48px; line-height: 1; color: var(--color-text-primary); margin: 0;">
						{data.wordsBalance.toLocaleString()}
					</p>
					<p style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); margin: 4px 0 0; letter-spacing: 0.06em;">
						of {wordsLimit.toLocaleString()} words
					</p>
				</div>

				<!-- Words bar -->
				<div style="width: 100%; display: flex; flex-direction: column; gap: 6px;">
					<div style="display: flex; justify-content: space-between; align-items: center;">
						<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Balance</span>
						<span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: {wordsBarColor};">
							{Math.round(100 - wordsUsedPct)}% left
						</span>
					</div>
					<div style="width: 100%; height: 6px; border-radius: 99px; background: var(--color-bg-border); overflow: hidden;">
						<div style="height: 100%; border-radius: 99px; width: {100 - wordsUsedPct}%; background: {wordsBarColor}; transition: width 600ms ease;"></div>
					</div>
				</div>

				<!-- Top-up packs -->
				{#if true}
					<div style="width: 100%; display: flex; flex-direction: column; gap: 8px;">
						<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Top up words</span>
						<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%;">
							{#each data.wordPacks as pack}
								<button
									onclick={() => buyWords(pack.priceId)}
									disabled={wordBuyLoading !== null}
									style="
										display: flex; flex-direction: column; align-items: center;
										padding: 10px 6px; border-radius: 10px; cursor: pointer;
										background: var(--color-bg-elevated);
										border: 1px solid var(--color-bg-border);
										transition: border-color 150ms ease, background 150ms ease;
										opacity: {wordBuyLoading !== null ? '0.6' : '1'};
									"
								>
									<span style="font-family: 'Newsreader', Georgia, serif; font-size: 16px; color: var(--color-text-primary);">
										{wordBuyLoading === pack.priceId ? '…' : `+${(pack.words / 1000).toFixed(0)}K`}
									</span>
									<span style="font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--color-text-muted); margin-top: 2px;">words</span>
									<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-brand); margin-top: 4px;">${pack.price}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			{:else}
				<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-text-muted); text-align: center; margin: 0;">
					Upgrade to start humanizing AI text.
				</p>
				<a href="/pricing" style="
					display: inline-block; padding: 10px 20px;
					background: var(--color-brand); color: white;
					border-radius: 10px; font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 14px; font-weight: 600; text-decoration: none;
				">View plans →</a>
			{/if}

			<Button variant="secondary" size="sm" onclick={() => goto('/settings')}>Manage plan →</Button>
		</div>

		<!-- Stat boxes -->
		<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;" class="stat-grid">
			{#each statBoxes as box}
				<div style="
					background: var(--color-bg-surface);
					border-radius: 14px;
					box-shadow: inset 0 0 0 1px var(--color-bg-border);
					padding: 20px 18px;
					display: flex;
					flex-direction: column;
					gap: 4px;
				">
					<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase; margin: 0;">{box.label}</p>
					<p style="font-family: 'Newsreader', Georgia, serif; font-size: 34px; font-weight: 400; color: var(--color-text-primary); margin: 0; line-height: 1.1;">{box.value}</p>
					<p style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); margin: 0;">{box.sub}</p>
				</div>
			{/each}
		</div>
	</div>

</div>

<style>
	@media (max-width: 960px) {
		.dash-top { grid-template-columns: 1fr !important; }
	}
	@media (max-width: 600px) {
		.stat-grid { grid-template-columns: 1fr 1fr !important; }
	}
</style>
