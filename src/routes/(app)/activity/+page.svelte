<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		getLastVisitedActivityId,
		setLastVisitedActivityId
	} from '$lib/client/lastActivityVisit';
	import type {
		ActivityItem,
		ActivitySortOrder,
		ActivityTypeFilter
	} from './+page.server';

	type Classification = 'LIKELY_AI' | 'POSSIBLY_AI' | 'POSSIBLY_HUMAN' | 'LIKELY_HUMAN';

	interface Props {
		data: {
			activity: ActivityItem[];
			page: number;
			pageSize: number;
			total: number;
			totalPages: number;
			typeFilter: ActivityTypeFilter;
			sortOrder: ActivitySortOrder;
			loadError: string | null;
		};
	}
	let { data }: Props = $props();

	function activityHref(over: Partial<{ page: number; type: ActivityTypeFilter; sort: ActivitySortOrder }>) {
		const sp = new URLSearchParams();
		sp.set('page', String(over.page ?? data.page));
		sp.set('type', over.type ?? data.typeFilter);
		sp.set('sort', over.sort ?? data.sortOrder);
		return `/activity?${sp.toString()}`;
	}

	const rangeStart = $derived(data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1);
	const rangeEnd = $derived(Math.min(data.page * data.pageSize, data.total));

	const lastVisitedActivityId = $derived.by(() => {
		if (!browser) return null;
		void page.url.pathname;
		return getLastVisitedActivityId();
	});

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function isValidClassification(c: string | null): c is Classification {
		return c === 'LIKELY_AI' || c === 'POSSIBLY_AI' || c === 'POSSIBLY_HUMAN' || c === 'LIKELY_HUMAN';
	}

	function activityHrefItem(item: ActivityItem) {
		return item.type === 'detect' ? `/detect?id=${item.id}` : `/humanize?id=${item.id}`;
	}

	function onRowActivate(item: ActivityItem) {
		setLastVisitedActivityId(item.id);
		goto(activityHrefItem(item));
	}
</script>

<div style="max-width: 1200px; margin: 0 auto; padding: 32px 24px 64px; display: flex; flex-direction: column; gap: 20px;">
	<div>
		<h1 style="font-family: 'Newsreader', Georgia, serif; font-size: 34px; font-weight: 400; color: var(--color-text-primary); margin: 0 0 6px; letter-spacing: -0.02em;">
			History
		</h1>
		<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0;">
			All saved detections and humanizations. Open a row to view details.
		</p>
	</div>

	{#if data.loadError}
		<p
			role="alert"
			style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: #b45309; margin: 0; padding: 10px 14px; background: #fef3c7; border-radius: 9px; box-shadow: inset 0 0 0 1px rgba(180,83,9,0.25);"
		>
			Activity could not load ({data.loadError}).
		</p>
	{/if}

	<!-- Filter + sort controls -->
	<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
		<!-- Type filter: separate bordered buttons with icons -->
		{#each ([
			['all',      'All',       'M8 2v4M16 2v4M3 10h18M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
			['detect',   'Detect',    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
			['humanize', 'Humanize',  'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z']
		] as [ActivityTypeFilter, string, string][]) as [val, label, iconPath]}
			{@const active = data.typeFilter === val}
			<a
				href={activityHref({ page: 1, type: val })}
				style="
					display: inline-flex; align-items: center; gap: 6px;
					padding: 7px 14px; border-radius: 9px;
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 13px; font-weight: 600;
					text-decoration: none;
					border: 1px solid {active ? 'var(--color-brand)' : 'var(--color-bg-border)'};
					background: {active ? 'var(--color-brand-muted)' : 'var(--color-bg-surface)'};
					color: {active ? 'var(--color-brand)' : 'var(--color-text-secondary)'};
					transition: all 130ms;
				"
			>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={iconPath}/></svg>
				{label}
			</a>
		{/each}

		<!-- Divider -->
		<div style="width: 1px; height: 22px; background: var(--color-bg-border); margin: 0 2px; flex-shrink: 0;"></div>

		<!-- Sort: separate outlined buttons -->
		{#each ([['newest', 'Newest first', '↓'], ['oldest', 'Oldest first', '↑']] as [ActivitySortOrder, string, string][]) as [val, label, arrow]}
			{@const active = data.sortOrder === val}
			<a
				href={activityHref({ page: 1, sort: val })}
				style="
					display: inline-flex; align-items: center; gap: 5px;
					padding: 7px 13px; border-radius: 9px;
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 13px; font-weight: 600;
					text-decoration: none;
					border: 1px solid {active ? 'var(--color-brand)' : 'var(--color-bg-border)'};
					background: {active ? 'var(--color-brand-muted)' : 'var(--color-bg-surface)'};
					color: {active ? 'var(--color-brand)' : 'var(--color-text-secondary)'};
					transition: all 130ms;
				"
			>{label} {arrow}</a>
		{/each}

		<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; color: var(--color-text-muted); margin-left: auto;">
			{#if data.total === 0}
				0 items
			{:else}
				Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of {data.total.toLocaleString()}
			{/if}
		</span>
	</div>

	<div style="
		background: var(--color-bg-surface);
		border-radius: 14px;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		overflow: hidden;
	">
		{#if data.activity.length === 0}
			<div style="padding: 48px 24px; text-align: center;">
				<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0 0 12px;">
					{data.total === 0 && data.typeFilter === 'all'
						? 'No activity yet.'
						: 'No items match the current filter.'}
				</p>
				{#if data.total === 0 && data.typeFilter === 'all'}
					<a href="/detect" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13.5px; font-weight: 600; color: var(--color-brand); text-decoration: none;">Go to Detect →</a>
				{:else}
					<a
						href={activityHref({ page: 1, type: 'all', sort: 'newest' })}
						style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13.5px; font-weight: 600; color: var(--color-brand); text-decoration: none;"
					>Clear filters</a>
				{/if}
			</div>
		{:else}
			<div style="overflow-x: auto;">
				<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px;">
					<thead>
						<tr style="border-bottom: 1px solid rgba(16, 185, 129, 0.25); background: var(--color-brand-muted);">
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap;">Date</th>
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Type</th>
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Preview</th>
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Words</th>
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Result</th>
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;"></th>
						</tr>
					</thead>
					<tbody>
						{#each data.activity as item (item.id)}
							<tr
								class="activity-row"
								class:activity-row-last={item.id === lastVisitedActivityId}
								style="border-bottom: 1px solid var(--color-divider); cursor: pointer;"
								role="link"
								tabindex="0"
								aria-label="Open {item.type === 'detect' ? 'detection' : 'humanization'} from {formatDate(item.created_at)}: {item.preview}"
								onclick={() => onRowActivate(item)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										onRowActivate(item);
									}
								}}
							>
								<td style="padding: 12px 16px; white-space: nowrap;">
									<div style="display: flex; align-items: center; gap: 6px;">
										<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
										<span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted);">{formatDate(item.created_at)}</span>
									</div>
								</td>
								<td style="padding: 12px 16px;">
									<span style="
										display: inline-flex; align-items: center; gap: 6px;
										font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
										padding: 3px 10px; border-radius: 6px;
										background: transparent;
										color: {item.type === 'detect' ? 'var(--color-brand)' : 'var(--color-human)'};
										border: 1px solid {item.type === 'detect' ? 'var(--color-brand)' : 'var(--color-human)'};
									">
										{item.type === 'detect' ? 'Detect' : 'Humanize'}
									</span>
								</td>
								<td style="padding: 12px 16px; max-width: 360px;">
									<span
										style="display: block; font-size: 13px; line-height: 1.45; color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
										title={item.preview}
									>{item.preview}</span>
								</td>
								<td style="padding: 12px 16px;">
									<span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-text-secondary);">{item.word_count.toLocaleString()}</span>
								</td>
								<td style="padding: 12px 16px;">
									{#if item.type === 'detect' && isValidClassification(item.classification)}
										{@const rc = item.classification === 'LIKELY_AI' ? { label: 'AI Generated', color: '#ef4444' } :
										             item.classification === 'POSSIBLY_AI' ? { label: 'Possibly AI', color: '#f59e0b' } :
										             item.classification === 'POSSIBLY_HUMAN' ? { label: 'Possibly Human', color: '#84cc16' } :
										             { label: 'Human', color: 'var(--color-brand)' }}
										<span style="
											display: inline-flex; align-items: center; gap: 5px;
											font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
											padding: 3px 9px; border-radius: 99px;
											background: color-mix(in srgb, {rc.color} 14%, transparent);
											color: {rc.color};
										">
											<span style="width: 5px; height: 5px; border-radius: 50%; background: {rc.color}; flex-shrink: 0;"></span>
											{rc.label}
										</span>
									{:else if item.type === 'humanize'}
										<span style="
											display: inline-flex; align-items: center; gap: 5px;
											font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
											padding: 3px 9px; border-radius: 99px;
											background: var(--color-human-muted); color: var(--color-human);
										">
											<span style="width: 5px; height: 5px; border-radius: 50%; background: var(--color-human); flex-shrink: 0;"></span>
											Humanized
										</span>
									{:else}
										<span style="color: var(--color-text-dim);">—</span>
									{/if}
								</td>
								<td style="padding: 12px 16px;">
									<a
										href={activityHrefItem(item)}
										style="color: var(--color-text-muted); text-decoration: none; display: inline-flex;"
										aria-label="Open in new tab"
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

			{#if data.totalPages > 1}
				<div
					style="
						display: flex;
						align-items: center;
						justify-content: space-between;
						gap: 12px;
						flex-wrap: wrap;
						padding: 14px 16px;
						border-top: 1px solid var(--color-divider);
						background: var(--color-brand-muted);
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 13px;
						color: var(--color-text-secondary);
					"
				>
					<div style="display: flex; align-items: center; gap: 10px;">
						{#if data.page > 1}
							<a
								href={activityHref({ page: data.page - 1 })}
								style="font-weight: 600; color: var(--color-brand); text-decoration: none;"
							>Previous</a>
						{:else}
							<span style="font-weight: 600; color: var(--color-text-dim);">Previous</span>
						{/if}
						{#if data.page < data.totalPages}
							<a
								href={activityHref({ page: data.page + 1 })}
								style="font-weight: 600; color: var(--color-brand); text-decoration: none;"
							>Next</a>
						{:else}
							<span style="font-weight: 600; color: var(--color-text-dim);">Next</span>
						{/if}
					</div>
					<span style="color: var(--color-text-muted);">
						Page {data.page} of {data.totalPages}
					</span>
				</div>
			{/if}
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
</style>
