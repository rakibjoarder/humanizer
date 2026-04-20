<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		getLastVisitedActivityId,
		setLastVisitedActivityId
	} from '$lib/client/lastActivityVisit';
	import ClassificationBadge from '$lib/components/ClassificationBadge.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	type Classification = 'LIKELY_AI' | 'POSSIBLY_AI' | 'POSSIBLY_HUMAN' | 'LIKELY_HUMAN';

	interface ActivityItem {
		id: string;
		type: 'detect' | 'humanize';
		word_count: number;
		classification: string | null;
		ai_probability: number | null;
		created_at: string;
	}

	interface Profile {
		plan: 'free' | 'pro';
		full_name: string | null;
		email: string;
	}

	interface Props {
		data: {
			profile: Profile;
			detectionsLimit: number;
			credits: number;
			totalDetections: number;
			totalHumanizations: number;
			wordsAnalyzed: number;
			avgAiProbability: number | null;
			recentActivity: ActivityItem[];
		};
	}

	let { data }: Props = $props();

	const lastVisitedActivityId = $derived.by(() => {
		if (!browser) return null;
		void page.url.pathname;
		return getLastVisitedActivityId();
	});

	// ── Ring gauge math ────────────────────────────────────────────────────────
	const RING_R = 54;
	const RING_C = 2 * Math.PI * RING_R;

	const usageRatio = $derived(
		data.detectionsLimit === -1 ? 0 : Math.min(data.totalDetections / data.detectionsLimit, 1)
	);
	const ringOffset = $derived(RING_C - usageRatio * RING_C);
	const ringColor = $derived(
		data.detectionsLimit === -1 ? 'var(--color-brand)' :
		usageRatio >= 1             ? 'var(--color-ai)' :
		usageRatio >= 0.67          ? 'var(--color-possibly-ai)' :
		'var(--color-brand)'
	);

	const planLabel = $derived(
		data.profile.plan === 'pro' ? 'Pro · Monthly' : 'Free'
	);

	const showUpgradedBanner = $derived(page.url.searchParams.get('upgraded') === 'true');

	// ── Stat boxes ─────────────────────────────────────────────────────────────
	const creditsSub = $derived(
		data.credits <= 10 ? 'low — top up in settings' : 'resets monthly'
	);

	const statBoxes = $derived([
		{ label: 'Total detections',    value: data.totalDetections.toLocaleString(),    sub: 'all time' },
		{ label: 'Humanizations',       value: data.totalHumanizations.toLocaleString(), sub: 'all time' },
		{ label: 'Words processed',     value: formatWords(data.wordsAnalyzed),          sub: 'all time' },
		{ label: 'Avg. AI probability', value: data.avgAiProbability !== null ? `${data.avgAiProbability}%` : '—', sub: 'across detections' },
		data.profile.plan === 'pro'
			? { label: 'Credits remaining', value: String(data.credits), sub: creditsSub }
			: { label: 'Free detections used', value: `${data.totalDetections} / ${data.detectionsLimit}`, sub: planLabel },
	]);

	function formatWords(n: number): string {
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
		if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
		return n.toLocaleString();
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}

	function isValidClassification(c: string | null): c is Classification {
		return c === 'LIKELY_AI' || c === 'POSSIBLY_AI' || c === 'POSSIBLY_HUMAN' || c === 'LIKELY_HUMAN';
	}

	function activityHref(item: ActivityItem) {
		return item.type === 'detect' ? `/detect?id=${item.id}` : `/humanize?id=${item.id}`;
	}

	function onActivityRowActivate(item: ActivityItem) {
		setLastVisitedActivityId(item.id);
		goto(activityHref(item));
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
			You're now on the {planLabel}. Enjoy your upgraded features!
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
			<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.12em; text-transform: uppercase; margin: 0; align-self: flex-start;">Detections used</p>

			<!-- Ring SVG -->
			<svg width="150" height="150" viewBox="0 0 150 150" fill="none" aria-label="Detections used: {data.totalDetections} of {data.detectionsLimit === -1 ? 'unlimited' : data.detectionsLimit}">
				<!-- Track -->
				<circle cx="75" cy="75" r={RING_R} stroke="var(--color-bg-border)" stroke-width="10" fill="none"/>
				<!-- Fill -->
				<circle
					cx="75" cy="75" r={RING_R}
					stroke={ringColor}
					stroke-width="10"
					fill="none"
					stroke-linecap="round"
					stroke-dasharray={RING_C}
					stroke-dashoffset={ringOffset}
					transform="rotate(-90 75 75)"
					style="transition: stroke-dashoffset 600ms ease-out, stroke 300ms ease;"
				/>
				<!-- Center: detections used -->
				<text x="75" y="68" text-anchor="middle" dominant-baseline="middle"
					font-family="'Newsreader', Georgia, serif" font-size="20" fill="var(--color-text-primary)">
					{data.detectionsLimit === -1 ? '∞' : data.totalDetections.toLocaleString()}
				</text>
				<text x="75" y="88" text-anchor="middle" dominant-baseline="middle"
					font-family="'JetBrains Mono', monospace" font-size="9" fill="var(--color-text-muted)" letter-spacing="0.06em">
					{data.detectionsLimit === -1 ? 'UNLIMITED' : `/ ${data.detectionsLimit.toLocaleString()}`}
				</text>
			</svg>

			<!-- Plan label -->
			<p style="font-family: 'Newsreader', Georgia, serif; font-size: 24px; font-weight: 400; color: var(--color-text-primary); margin: 0;">{planLabel}</p>

			{#if data.detectionsLimit !== -1 && data.totalDetections >= data.detectionsLimit}
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-ai); margin: 0;">Free limit reached · Upgrade to Pro</p>
			{/if}

			<Button variant="secondary" size="sm" onclick={() => {}}>Manage plan →</Button>
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

	<!-- ── Recent activity ── -->
	<div
		id="recent-activity"
		style="
		background: var(--color-bg-surface);
		border-radius: 14px;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		overflow: hidden;
	"
	>
		<!-- Header -->
		<div style="
			padding: 14px 20px;
			background: var(--color-bg-sunk);
			border-bottom: 1px solid var(--color-divider);
			display: flex;
			align-items: center;
			justify-content: space-between;
		">
			<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.1em; text-transform: uppercase;">Recent activity</span>
			<button
				type="button"
				style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; color: var(--color-brand); background: none; border: none; cursor: pointer; font-weight: 600;"
				onclick={() => goto('/activity')}
			>View all</button>
		</div>

		{#if data.recentActivity.length === 0}
			<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 56px 24px; text-align: center;">
				<div style="width: 48px; height: 48px; border-radius: 12px; background: var(--color-bg-elevated); box-shadow: inset 0 0 0 1px var(--color-bg-border); display: flex; align-items: center; justify-content: center;">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 10h8M8 14h5"/>
					</svg>
				</div>
				<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0;">No activity yet. Start by analyzing some text!</p>
				<a href="/detect" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13.5px; font-weight: 600; color: var(--color-brand); text-decoration: none;">Go to Detect →</a>
			</div>
		{:else}
			<div style="overflow-x: auto;">
				<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px;">
					<thead>
						<tr style="border-bottom: 1px solid var(--color-divider);">
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap;">Date</th>
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Type</th>
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Words</th>
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Result</th>
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;"></th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentActivity as item (item.id)}
							<tr
								class="activity-row"
								class:activity-row-last={item.id === lastVisitedActivityId}
								style="border-bottom: 1px solid var(--color-divider); cursor: pointer;"
								role="link"
								tabindex="0"
								aria-label="Open {item.type === 'detect' ? 'detection' : 'humanization'} from {formatDate(item.created_at)}"
								onclick={() => onActivityRowActivate(item)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										onActivityRowActivate(item);
									}
								}}
							>
								<!-- Date -->
								<td style="padding: 12px 16px; white-space: nowrap;">
									<span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted);">{formatDate(item.created_at)}</span>
								</td>
								<!-- Type -->
								<td style="padding: 12px 16px;">
									<span style="
										display: inline-flex; align-items: center; gap: 6px;
										font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
										padding: 3px 10px; border-radius: 99px;
										background: {item.type === 'detect' ? 'var(--color-brand-muted)' : 'var(--color-human-muted)'};
										color: {item.type === 'detect' ? 'var(--color-brand)' : 'var(--color-human)'};
										box-shadow: inset 0 0 0 1px {item.type === 'detect' ? 'var(--color-brand)' : 'var(--color-human)'};
									">
										{item.type === 'detect' ? 'Detect' : 'Humanize'}
									</span>
								</td>
								<!-- Words -->
								<td style="padding: 12px 16px;">
									<span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-text-secondary);">{item.word_count.toLocaleString()}</span>
								</td>
								<!-- Result -->
								<td style="padding: 12px 16px;">
									{#if item.type === 'detect' && isValidClassification(item.classification)}
										<ClassificationBadge classification={item.classification} size="sm"/>
									{:else if item.type === 'humanize'}
										<span style="
											display: inline-flex; align-items: center;
											font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
											padding: 3px 10px; border-radius: 99px;
											background: var(--color-human-muted); color: var(--color-human);
											box-shadow: inset 0 0 0 1px var(--color-human);
										">Humanized</span>
									{:else}
										<span style="color: var(--color-text-dim);">—</span>
									{/if}
								</td>
								<!-- Arrow -->
								<td style="padding: 12px 16px;">
									<a
										href={activityHref(item)}
										style="color: var(--color-text-muted); text-decoration: none; display: inline-flex;"
										aria-label="Open {item.type} in new tab"
										onclick={(e) => {
											e.stopPropagation();
											setLastVisitedActivityId(item.id);
										}}
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14 M13 6l6 6-6 6"/></svg>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<style>
	.activity-row:hover {
		background: var(--color-bg-elevated);
	}
	.activity-row-last {
		background: var(--color-brand-muted);
		box-shadow: inset 3px 0 0 var(--color-brand);
	}
	.activity-row-last:hover {
		background: var(--color-bg-elevated);
	}
	@media (max-width: 960px) {
		.dash-top { grid-template-columns: 1fr !important; }
	}
	@media (max-width: 600px) {
		.stat-grid { grid-template-columns: 1fr 1fr !important; }
	}
</style>
