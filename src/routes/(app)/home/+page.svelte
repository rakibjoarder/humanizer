<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		getLastVisitedActivityId,
		setLastVisitedActivityId
	} from '$lib/client/lastActivityVisit';
	import ClassificationBadge from '$lib/components/ClassificationBadge.svelte';

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
			totalDetections: number;
			totalHumanizations: number;
			wordsAnalyzed: number;
			avgAiProbability: number | null;
			recentActivity: ActivityItem[];
		};
	}

	let { data }: Props = $props();

	let inputText = $state('');
	let selectedAction = $state<'detect' | 'humanize'>('detect');

	const firstName = $derived(
		data.profile.full_name?.split(' ')[0] ?? data.profile.email.split('@')[0]
	);

	const showUpgradedBanner = $derived(page.url.searchParams.get('upgraded') === 'true');
	const limitReached = $derived(
		data.detectionsLimit !== -1 && data.totalDetections >= data.detectionsLimit
	);

	const lastVisitedActivityId = $derived.by(() => {
		if (!browser) return null;
		void page.url.pathname;
		return getLastVisitedActivityId();
	});

	const actions = [
		{
			id: 'detect' as const,
			label: 'AI Detector',
			icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
		},
		{
			id: 'humanize' as const,
			label: 'AI Humanizer',
			icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
		}
	];

	const suggestions = [
		{ label: 'Check an essay', sub: 'Detect AI content in academic writing', action: 'detect' as const },
		{ label: 'Humanize a paragraph', sub: 'Make AI-generated text sound natural', action: 'humanize' as const },
		{ label: 'Scan a cover letter', sub: 'Verify your letter reads as human', action: 'detect' as const },
		{ label: 'Rewrite an email', sub: 'Remove AI patterns from drafted emails', action: 'humanize' as const },
	];

	function handleSubmit() {
		const text = inputText.trim();
		if (!text) return;
		const params = new URLSearchParams({ prefill: text });
		goto(`/${selectedAction}?${params}`);
	}

	function handleSuggestion(s: typeof suggestions[0]) {
		selectedAction = s.action;
		goto(`/${s.action}`);
	}

	function isValidClassification(c: string | null): c is Classification {
		return c === 'LIKELY_AI' || c === 'POSSIBLY_AI' || c === 'POSSIBLY_HUMAN' || c === 'LIKELY_HUMAN';
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}

	function activityHref(item: ActivityItem) {
		return item.type === 'detect' ? `/detect?id=${item.id}` : `/humanize?id=${item.id}`;
	}

	function onActivityRowActivate(item: ActivityItem) {
		setLastVisitedActivityId(item.id);
		goto(activityHref(item));
	}

	function formatWords(n: number): string {
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
		if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
		return n.toLocaleString();
	}
</script>

<div class="page-wrap">

	<!-- Upgrade banner -->
	{#if data.profile.plan === 'free' && !showUpgradedBanner}
		<div class="upgrade-banner">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
			{#if limitReached}
				You've used all 3 free detections. Upgrade to Pro for unlimited access.
			{:else}
				Enjoy unlimited detections and humanizations starting at $8/month.
			{/if}
			<a href="/settings#plan" class="upgrade-link">Explore Pro →</a>
		</div>
	{/if}

	{#if showUpgradedBanner}
		<div class="success-banner animate-fade-up" role="alert">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
			You're now on the Pro plan. Enjoy unlimited access!
		</div>
	{/if}

	<!-- Greeting -->
	<div class="greeting">
		<h1>Hi, {firstName}! What would you like to do today?</h1>
	</div>

	<!-- Input card -->
	<div class="input-card">
		<textarea
			class="main-input"
			placeholder="Write, paste, or enter text to analyze…"
			bind:value={inputText}
			onkeydown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
			rows="5"
		></textarea>

		<div class="input-footer">
			<!-- Action chips -->
			<div class="action-chips">
				{#each actions as action}
					<button
						type="button"
						class="chip"
						class:chip-active={selectedAction === action.id}
						onclick={() => { selectedAction = action.id; }}
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d={action.icon}/>
						</svg>
						{action.label}
					</button>
				{/each}
			</div>

			<!-- Submit -->
			<button
				type="button"
				class="submit-btn"
				class:submit-active={inputText.trim().length > 0}
				onclick={handleSubmit}
				disabled={!inputText.trim()}
				aria-label="Run {selectedAction}"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
			</button>
		</div>
	</div>

	<!-- Suggestions -->
	<div class="suggestions-section">
		<p class="suggestions-label">Need a starting point? Try one of these…</p>
		<div class="suggestions-grid">
			{#each suggestions as s}
				<button type="button" class="suggestion-card" onclick={() => handleSuggestion(s)}>
					<span class="suggestion-action-tag" class:tag-humanize={s.action === 'humanize'}>
						{s.action === 'detect' ? 'Detect' : 'Humanize'}
					</span>
					<span class="suggestion-title">{s.label}</span>
					<span class="suggestion-sub">{s.sub}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Stats row -->
	<div class="stats-row">
		{#each [
			{ label: 'Detections', value: data.totalDetections.toLocaleString() },
			{ label: 'Humanizations', value: data.totalHumanizations.toLocaleString() },
			{ label: 'Words processed', value: formatWords(data.wordsAnalyzed) },
			{ label: 'Avg. AI score', value: data.avgAiProbability !== null ? `${data.avgAiProbability}%` : '—' },
		] as stat}
			<div class="stat-box">
				<span class="stat-value">{stat.value}</span>
				<span class="stat-label">{stat.label}</span>
			</div>
		{/each}
	</div>

	<!-- Recent activity -->
	<div class="activity-card" id="recent-activity">
		<div class="activity-header">
			<span class="section-label">Recent activity</span>
			<button type="button" class="view-all-btn" onclick={() => goto('/activity')}>View all</button>
		</div>

		{#if data.recentActivity.length === 0}
			<div class="empty-state">
				<div class="empty-icon">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 10h8M8 14h5"/>
					</svg>
				</div>
				<p>No activity yet. Start by analyzing some text!</p>
				<a href="/detect" class="empty-cta">Go to Detect →</a>
			</div>
		{:else}
			<div style="overflow-x: auto;">
				<table class="activity-table">
					<thead>
						<tr>
							<th>Date</th>
							<th>Type</th>
							<th>Words</th>
							<th>Result</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentActivity as item (item.id)}
							<tr
								class="activity-row"
								class:activity-row-last={item.id === lastVisitedActivityId}
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
								<td><span class="date-cell">{formatDate(item.created_at)}</span></td>
								<td>
									<span class="type-badge" class:type-humanize={item.type === 'humanize'}>
										{item.type === 'detect' ? 'Detect' : 'Humanize'}
									</span>
								</td>
								<td><span class="mono-cell">{item.word_count.toLocaleString()}</span></td>
								<td>
									{#if item.type === 'detect' && isValidClassification(item.classification)}
										<ClassificationBadge classification={item.classification} size="sm"/>
									{:else if item.type === 'humanize'}
										<span class="humanized-badge">Humanized</span>
									{:else}
										<span style="color: var(--color-text-dim);">—</span>
									{/if}
								</td>
								<td>
									<a
										href={activityHref(item)}
										class="row-arrow"
										aria-label="Open {item.type}"
										onclick={(e) => { e.stopPropagation(); setLastVisitedActivityId(item.id); }}
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
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
	.page-wrap {
		max-width: 820px;
		margin: 0 auto;
		padding: 32px 24px 80px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	/* ── Banners ── */
	.upgrade-banner {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		border-radius: 10px;
		background: var(--color-brand-muted);
		border: 1px solid rgba(16,185,129,0.25);
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13.5px;
		color: var(--color-text-secondary);
	}
	.upgrade-link {
		margin-left: auto;
		font-weight: 600;
		color: var(--color-brand);
		text-decoration: none;
		white-space: nowrap;
	}
	.upgrade-link:hover { text-decoration: underline; }

	.success-banner {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		border-radius: 10px;
		background: var(--color-human-muted);
		border: 1px solid var(--color-human);
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13.5px;
		color: var(--color-human);
	}

	/* ── Greeting ── */
	.greeting h1 {
		font-family: 'Newsreader', Georgia, serif;
		font-size: clamp(24px, 4vw, 36px);
		font-weight: 400;
		color: var(--color-text-primary);
		margin: 8px 0 0;
		letter-spacing: -0.02em;
	}

	/* ── Input card ── */
	.input-card {
		background: var(--color-bg-surface);
		border-radius: 16px;
		box-shadow: var(--shadow-modal);
		overflow: hidden;
	}

	.main-input {
		width: 100%;
		min-height: 140px;
		padding: 20px 20px 12px;
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 15px;
		line-height: 1.6;
		color: var(--color-text-primary);
	}
	.main-input::placeholder { color: var(--color-text-muted); }

	.input-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 16px 14px;
		border-top: 1px solid var(--color-divider);
	}

	.action-chips {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		border-radius: 9999px;
		border: 1px solid var(--color-bg-border);
		background: var(--color-bg-elevated);
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
	}
	.chip:hover {
		border-color: var(--color-brand);
		color: var(--color-brand);
	}
	.chip-active {
		border-color: var(--color-brand);
		background: var(--color-brand-muted);
		color: var(--color-brand);
	}

	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: 1px solid var(--color-bg-border);
		background: var(--color-bg-elevated);
		color: var(--color-text-muted);
		cursor: pointer;
		flex-shrink: 0;
		transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
	}
	.submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
	.submit-active {
		background: var(--color-brand);
		border-color: var(--color-brand);
		color: #fff;
	}
	.submit-active:hover {
		background: var(--color-brand-hover);
		border-color: var(--color-brand-hover);
	}

	/* ── Suggestions ── */
	.suggestions-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.suggestions-label {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12.5px;
		color: var(--color-text-muted);
		margin: 0;
		padding-left: 2px;
	}
	.suggestions-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}
	.suggestion-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
		padding: 14px 14px 16px;
		border-radius: 12px;
		border: 1px solid var(--color-bg-border);
		background: var(--color-bg-surface);
		cursor: pointer;
		text-align: left;
		transition: border-color 150ms ease, box-shadow 150ms ease;
	}
	.suggestion-card:hover {
		border-color: var(--color-brand);
		box-shadow: 0 4px 16px -4px var(--color-brand-muted);
	}
	.suggestion-action-tag {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-brand);
		padding: 2px 7px;
		border-radius: 9999px;
		background: var(--color-brand-muted);
	}
	.tag-humanize {
		color: var(--color-human);
		background: var(--color-human-muted);
	}
	.suggestion-title {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13.5px;
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.suggestion-sub {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12px;
		color: var(--color-text-muted);
		line-height: 1.4;
	}

	/* ── Stats row ── */
	.stats-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}
	.stat-box {
		background: var(--color-bg-surface);
		border-radius: 12px;
		box-shadow: var(--shadow-card);
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.stat-value {
		font-family: 'Newsreader', Georgia, serif;
		font-size: 28px;
		font-weight: 400;
		color: var(--color-text-primary);
		line-height: 1;
	}
	.stat-label {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 11.5px;
		color: var(--color-text-muted);
		margin-top: 4px;
	}

	/* ── Activity ── */
	.activity-card {
		background: var(--color-bg-surface);
		border-radius: 14px;
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}
	.activity-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 13px 20px;
		background: var(--color-bg-elevated);
		border-bottom: 1px solid var(--color-divider);
	}
	.section-label {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-secondary);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.view-all-btn {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-brand);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 48px 24px;
		text-align: center;
	}
	.empty-icon {
		width: 44px;
		height: 44px;
		border-radius: 11px;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-bg-border);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.empty-state p {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 14px;
		color: var(--color-text-secondary);
		margin: 0;
	}
	.empty-cta {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-brand);
		text-decoration: none;
	}

	.activity-table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
	}
	.activity-table thead tr {
		border-bottom: 1px solid var(--color-divider);
	}
	.activity-table th {
		padding: 10px 16px;
		text-align: left;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-muted);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.activity-row {
		border-bottom: 1px solid var(--color-divider);
		cursor: pointer;
		transition: background 100ms ease;
	}
	.activity-row:hover { background: var(--color-bg-elevated); }
	.activity-row-last {
		background: var(--color-brand-muted);
		box-shadow: inset 3px 0 0 var(--color-brand);
	}
	.activity-row-last:hover { background: var(--color-bg-elevated); }
	.activity-table td { padding: 11px 16px; }

	.date-cell {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: var(--color-text-muted);
	}
	.mono-cell {
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		color: var(--color-text-secondary);
	}
	.type-badge {
		display: inline-flex;
		align-items: center;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 3px 10px;
		border-radius: 99px;
		background: var(--color-brand-muted);
		color: var(--color-brand);
		box-shadow: inset 0 0 0 1px var(--color-brand);
	}
	.type-humanize {
		background: var(--color-human-muted);
		color: var(--color-human);
		box-shadow: inset 0 0 0 1px var(--color-human);
	}
	.humanized-badge {
		display: inline-flex;
		align-items: center;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 3px 10px;
		border-radius: 99px;
		background: var(--color-human-muted);
		color: var(--color-human);
		box-shadow: inset 0 0 0 1px var(--color-human);
	}
	.row-arrow {
		color: var(--color-text-muted);
		text-decoration: none;
		display: inline-flex;
	}
	.row-arrow:hover { color: var(--color-brand); }

	/* ── Responsive ── */
	@media (max-width: 680px) {
		.suggestions-grid { grid-template-columns: repeat(2, 1fr); }
		.stats-row { grid-template-columns: repeat(2, 1fr); }
	}
	@media (max-width: 420px) {
		.suggestions-grid { grid-template-columns: 1fr 1fr; }
		.action-chips { gap: 6px; }
		.chip { padding: 6px 10px; font-size: 12px; }
	}
</style>
