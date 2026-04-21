<script lang="ts">
	import { page } from '$app/state';
	import SEO from '$lib/components/SEO.svelte';

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

	const isPaid = $derived(
		data.profile.plan === 'basic' || data.profile.plan === 'pro' || data.profile.plan === 'ultra'
	);

	const planLabel = $derived(
		data.profile.plan === 'ultra' ? 'Ultra' :
		data.profile.plan === 'pro'   ? 'Pro'   :
		data.profile.plan === 'basic' ? 'Basic' : 'Free'
	);

	const showUpgradedBanner = $derived(page.url.searchParams.get('upgraded') === 'true');

	const wordsLimit   = $derived(data.planWordsLimit);
	const wordsPct     = $derived(wordsLimit > 0 ? Math.max(0, Math.min(100, (data.wordsBalance / wordsLimit) * 100)) : 0);
	const wordsBarColor = $derived(
		wordsPct <= 15 ? '#ef4444' : wordsPct <= 30 ? '#f59e0b' : 'var(--color-brand)'
	);

	const greeting = $derived(() => {
		const name = data.profile.full_name?.split(' ')[0];
		return name ? `Hi, ${name}.` : 'Dashboard';
	});

	function formatWords(n: number): string {
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
		if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
		return n.toLocaleString();
	}

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
</script>

<SEO
	title="Dashboard | HumanizeAIWrite"
	description="Your HumanizeAIWrite dashboard — usage stats, word balance, and quick actions."
	canonical="https://humanizeaiwrite.com/dashboard"
/>

<div style="max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; display: flex; flex-direction: column; gap: 28px;">

	<!-- ── Upgraded banner ── -->
	{#if showUpgradedBanner}
		<div style="
			display: flex; align-items: center; gap: 10px;
			padding: 12px 16px;
			background: var(--color-human-muted);
			border-radius: 10px;
			box-shadow: inset 0 0 0 1px var(--color-human);
			font-family: 'Space Grotesk', system-ui, sans-serif;
			font-size: 14px; color: var(--color-human);
		" class="animate-fade-up" role="alert">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
			You're now on the {planLabel} plan. Enjoy your upgraded words!
		</div>
	{/if}

	<!-- ── Page header ── -->
	<div>
		<h1 style="font-family: 'Newsreader', Georgia, serif; font-size: 34px; font-weight: 400; color: var(--color-text-primary); margin: 0 0 6px; letter-spacing: -0.02em;">{greeting()}</h1>
		<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0;">Here's an overview of your usage.</p>
	</div>

	<!-- ── 4 stat cards ── -->
	<div class="stat-row">
		{#each [
			{ label: 'Detections run',    value: data.totalDetections.toLocaleString(),                                        sub: 'all time',            icon: 'm12 14 4-4 M3.34 19a10 10 0 1 1 17.32 0' },
			{ label: 'Texts humanized',   value: data.totalHumanizations.toLocaleString(),                                     sub: 'all time',            icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
			{ label: 'Words processed',   value: formatWords(data.wordsAnalyzed),                                              sub: 'all time',            icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' },
			{ label: 'Avg. AI score',     value: data.avgAiProbability !== null ? `${data.avgAiProbability}%` : '—',          sub: 'across scans',        icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
		] as stat}
			<div class="stat-card">
				<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
					<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">{stat.label}</span>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-dim)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={stat.icon}/></svg>
				</div>
				<p style="font-family: 'Newsreader', Georgia, serif; font-size: 38px; font-weight: 400; color: var(--color-text-primary); margin: 0; line-height: 1;">{stat.value}</p>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-dim); margin: 6px 0 0;">{stat.sub}</p>
			</div>
		{/each}
	</div>

	<!-- ── Bottom row: words card + quick actions ── -->
	<div class="bottom-row">

		<!-- Words card -->
		<div style="
			background: var(--color-bg-surface);
			border-radius: 14px;
			box-shadow: inset 0 0 0 1px var(--color-bg-border);
			padding: 28px;
			display: flex;
			flex-direction: column;
			gap: 20px;
		">
			<!-- Plan badge + label -->
			<div style="display: flex; align-items: center; justify-content: space-between;">
				<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">Words Remaining</p>
				<span style="
					font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 700;
					letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 9px;
					border-radius: 5px;
					background: {isPaid ? 'var(--color-brand-muted)' : 'var(--color-bg-elevated)'};
					color: {isPaid ? 'var(--color-brand)' : 'var(--color-text-muted)'};
					box-shadow: inset 0 0 0 1px {isPaid ? 'var(--color-brand)' : 'var(--color-bg-border)'};
				">{planLabel}</span>
			</div>

			<!-- Big number -->
			<div>
				<p style="font-family: 'Newsreader', Georgia, serif; font-size: 56px; line-height: 1; color: var(--color-text-primary); margin: 0;">{data.wordsBalance.toLocaleString()}</p>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-text-muted); margin: 6px 0 0; letter-spacing: 0.04em;">
					of {wordsLimit.toLocaleString()} words{isPaid ? ' · resets monthly' : ' free trial'}
				</p>
			</div>

			<!-- Progress bar -->
			<div>
				<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px;">
					<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Balance</span>
					<span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: {wordsBarColor};">{Math.round(wordsPct)}% remaining</span>
				</div>
				<div style="width: 100%; height: 6px; border-radius: 99px; background: var(--color-bg-border); overflow: hidden;">
					<div style="height: 100%; border-radius: 99px; width: {wordsPct}%; background: {wordsBarColor}; transition: width 600ms ease;"></div>
				</div>
			</div>

			{#if isPaid}
				<!-- Top-up word packs -->
				<div style="display: flex; flex-direction: column; gap: 8px;">
					<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Top up words</span>
					<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
						{#each data.wordPacks as pack}
							<button
								onclick={() => buyWords(pack.priceId)}
								disabled={wordBuyLoading !== null}
								style="
									display: flex; flex-direction: column; align-items: center;
									padding: 10px 6px; border-radius: 10px; cursor: pointer;
									background: var(--color-bg-elevated);
									border: 1px solid var(--color-bg-border);
									transition: border-color 150ms, background 150ms;
									opacity: {wordBuyLoading !== null ? 0.6 : 1};
								"
							>
								<span style="font-family: 'Newsreader', Georgia, serif; font-size: 18px; color: var(--color-text-primary);">
									{wordBuyLoading === pack.priceId ? '…' : `+${(pack.words / 1000).toFixed(0)}K`}
								</span>
								<span style="font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--color-text-muted); margin-top: 2px;">words</span>
								<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 700; color: var(--color-brand); margin-top: 5px;">${pack.price}</span>
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<!-- Free plan upgrade prompt -->
				<div style="
					padding: 16px;
					background: var(--color-brand-muted);
					border-radius: 10px;
					box-shadow: inset 0 0 0 1px var(--color-brand);
					display: flex; flex-direction: column; gap: 10px;
				">
					<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-text-primary); margin: 0; line-height: 1.5;">
						You're on the free trial — 150 words to explore. Upgrade for thousands more each month.
					</p>
					<a href="/plans" style="
						display: inline-flex; align-items: center; gap: 6px;
						padding: 9px 14px; border-radius: 8px;
						background: var(--color-brand); color: white;
						font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; font-weight: 700;
						text-decoration: none; align-self: flex-start;
					">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
						See plans
					</a>
				</div>
			{/if}

			<a href="/settings" style="
				display: inline-flex; align-items: center; gap: 6px;
				font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; font-weight: 600;
				color: var(--color-text-secondary); text-decoration: none;
				padding: 8px 0; border-top: 1px solid var(--color-bg-border);
			">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>
				Manage plan & billing
			</a>
		</div>

		<!-- Quick actions -->
		<div style="
			background: var(--color-bg-surface);
			border-radius: 14px;
			box-shadow: inset 0 0 0 1px var(--color-bg-border);
			padding: 28px;
			display: flex;
			flex-direction: column;
			gap: 10px;
		">
			<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 6px;">Quick actions</p>

			{#each [
				{
					href: '/humanize',
					label: 'Humanize text',
					desc: 'Rewrite AI content to sound natural',
					icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
					accent: 'var(--color-brand)'
				},
				{
					href: '/detect',
					label: 'Detect AI writing',
					desc: 'Check if text was written by AI',
					icon: 'm12 14 4-4 M3.34 19a10 10 0 1 1 17.32 0',
					accent: 'var(--color-ai)'
				},
				{
					href: '/activity',
					label: 'View history',
					desc: 'Browse past detections and rewrites',
					icon: 'M12 8v4l3 3 M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5',
					accent: '#8b5cf6'
				},
				{
					href: '/settings',
					label: 'Account settings',
					desc: 'Plan, billing, and profile',
					icon: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
					accent: 'var(--color-text-muted)'
				},
			] as action}
				<a href={action.href} class="action-card">
					<div style="
						width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
						background: {action.accent}18;
						display: flex; align-items: center; justify-content: center;
					">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{action.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={action.icon}/></svg>
					</div>
					<div style="min-width: 0;">
						<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; font-weight: 600; color: var(--color-text-primary); margin: 0;">{action.label}</p>
						<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; color: var(--color-text-muted); margin: 2px 0 0;">{action.desc}</p>
					</div>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-dim)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-left: auto;" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
				</a>
			{/each}
		</div>
	</div>

</div>

<style>
.stat-row {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 14px;
}

.stat-card {
	background: var(--color-bg-surface);
	border-radius: 14px;
	box-shadow: inset 0 0 0 1px var(--color-bg-border);
	padding: 20px 18px;
}

.bottom-row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 20px;
	align-items: start;
}

.action-card {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 13px 14px;
	border-radius: 10px;
	text-decoration: none;
	transition: background 120ms;
	box-shadow: inset 0 0 0 1px var(--color-bg-border);
}
.action-card:hover {
	background: var(--color-bg-elevated);
}

@media (max-width: 900px) {
	.stat-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 700px) {
	.bottom-row { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
	.stat-row { grid-template-columns: 1fr 1fr; }
}
</style>
