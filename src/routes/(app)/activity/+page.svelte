<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		getLastVisitedActivityId,
		setLastVisitedActivityId
	} from '$lib/client/lastActivityVisit';
	import ClassificationBadge from '$lib/components/ClassificationBadge.svelte';
	import type { ActivityItem } from './+page.server';

	type Classification = 'LIKELY_AI' | 'POSSIBLY_AI' | 'POSSIBLY_HUMAN' | 'LIKELY_HUMAN';
	type TypeFilter = 'all' | 'detect' | 'humanize';
	type SortOrder = 'newest' | 'oldest';

	interface Props {
		data: { activity: ActivityItem[] };
	}
	let { data }: Props = $props();

	let typeFilter = $state<TypeFilter>('all');
	let sortOrder = $state<SortOrder>('newest');

	const filteredActivity = $derived(
		data.activity
			.filter(item => typeFilter === 'all' || item.type === typeFilter)
			.slice()
			.sort((a, b) => {
				const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
				return sortOrder === 'newest' ? -diff : diff;
			})
	);

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

	function activityHref(item: ActivityItem) {
		return item.type === 'detect' ? `/detect?id=${item.id}` : `/humanize?id=${item.id}`;
	}

	function onRowActivate(item: ActivityItem) {
		setLastVisitedActivityId(item.id);
		goto(activityHref(item));
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

	<!-- Filter + sort controls -->
	<div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
		<!-- Type filter -->
		<div style="display: inline-flex; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 9px; padding: 3px; gap: 2px;">
			{#each ([['all', 'All'], ['detect', 'Detect'], ['humanize', 'Humanize']] as [TypeFilter, string][]) as [val, label]}
				<button
					onclick={() => (typeFilter = val)}
					style="
						padding: 5px 14px;
						border-radius: 6px;
						border: none;
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 12px;
						font-weight: 600;
						cursor: pointer;
						transition: all 130ms;
						background: {typeFilter === val ? 'var(--color-bg-elevated)' : 'transparent'};
						color: {typeFilter === val ? 'var(--color-text-primary)' : 'var(--color-text-muted)'};
						box-shadow: {typeFilter === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};
					"
				>{label}</button>
			{/each}
		</div>

		<!-- Sort -->
		<div style="display: inline-flex; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 9px; padding: 3px; gap: 2px;">
			{#each ([['newest', 'Newest first'], ['oldest', 'Oldest first']] as [SortOrder, string][]) as [val, label]}
				<button
					onclick={() => (sortOrder = val)}
					style="
						padding: 5px 14px;
						border-radius: 6px;
						border: none;
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 12px;
						font-weight: 600;
						cursor: pointer;
						transition: all 130ms;
						background: {sortOrder === val ? 'var(--color-bg-elevated)' : 'transparent'};
						color: {sortOrder === val ? 'var(--color-text-primary)' : 'var(--color-text-muted)'};
						box-shadow: {sortOrder === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};
					"
				>{label}</button>
			{/each}
		</div>

		<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; color: var(--color-text-muted); margin-left: auto;">
			{filteredActivity.length} {filteredActivity.length === 1 ? 'item' : 'items'}
		</span>
	</div>

	<div style="
		background: var(--color-bg-surface);
		border-radius: 14px;
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		overflow: hidden;
	">
		{#if filteredActivity.length === 0}
			<div style="padding: 48px 24px; text-align: center;">
				<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0 0 12px;">
					{data.activity.length === 0 ? 'No activity yet.' : 'No items match the current filter.'}
				</p>
				{#if data.activity.length === 0}
					<a href="/detect" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13.5px; font-weight: 600; color: var(--color-brand); text-decoration: none;">Go to Detect →</a>
				{:else}
					<button onclick={() => { typeFilter = 'all'; sortOrder = 'newest'; }} style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13.5px; font-weight: 600; color: var(--color-brand); background: none; border: none; cursor: pointer; text-decoration: none;">Clear filters</button>
				{/if}
			</div>
		{:else}
			<div style="overflow-x: auto;">
				<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px;">
					<thead>
						<tr style="border-bottom: 1px solid var(--color-divider); background: var(--color-bg-sunk);">
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap;">Date</th>
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Type</th>
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Words</th>
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;">Result</th>
							<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.08em; text-transform: uppercase;"></th>
						</tr>
					</thead>
					<tbody>
						{#each filteredActivity as item (item.id)}
							<tr
								class="activity-row"
								class:activity-row-last={item.id === lastVisitedActivityId}
								style="border-bottom: 1px solid var(--color-divider); cursor: pointer;"
								role="link"
								tabindex="0"
								aria-label="Open {item.type === 'detect' ? 'detection' : 'humanization'} from {formatDate(item.created_at)}"
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
										href={activityHref(item)}
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
