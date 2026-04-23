<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		getLastVisitedActivityId,
		setLastVisitedActivityId
	} from '$lib/client/lastActivityVisit';
	import ClassificationBadge from '$lib/components/ClassificationBadge.svelte';
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
			Activity log
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
	<div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
		<!-- Type filter -->
		<div style="display: inline-flex; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 9px; padding: 3px; gap: 2px;">
			{#each ([['all', 'All'], ['detect', 'Detect'], ['humanize', 'Humanize']] as [ActivityTypeFilter, string][]) as [val, label]}
				<a
					href={activityHref({ page: 1, type: val })}
					style="
						padding: 5px 14px;
						border-radius: 6px;
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 12px;
						font-weight: 600;
						text-decoration: none;
						transition: all 130ms;
						background: {data.typeFilter === val ? 'var(--color-bg-elevated)' : 'transparent'};
						color: {data.typeFilter === val ? 'var(--color-text-primary)' : 'var(--color-text-muted)'};
						box-shadow: {data.typeFilter === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};
					"
				>{label}</a>
			{/each}
		</div>

		<!-- Sort -->
		<div style="display: inline-flex; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 9px; padding: 3px; gap: 2px;">
			{#each ([['newest', 'Newest first'], ['oldest', 'Oldest first']] as [ActivitySortOrder, string][]) as [val, label]}
				<a
					href={activityHref({ page: 1, sort: val })}
					style="
						padding: 5px 14px;
						border-radius: 6px;
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 12px;
						font-weight: 600;
						text-decoration: none;
						transition: all 130ms;
						background: {data.sortOrder === val ? 'var(--color-bg-elevated)' : 'transparent'};
						color: {data.sortOrder === val ? 'var(--color-text-primary)' : 'var(--color-text-muted)'};
						box-shadow: {data.sortOrder === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};
					"
				>{label}</a>
			{/each}
		</div>

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
						<tr style="border-bottom: 1px solid var(--color-divider); background: var(--color-bg-sunk);">
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
									<span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted);">{formatDate(item.created_at)}</span>
								</td>
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
										<ClassificationBadge classification={item.classification} size="sm" />
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
						background: var(--color-bg-sunk);
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
