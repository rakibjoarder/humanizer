<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();
	let search = $state(data.search);
	let dateFilter = $state(data.dateRange);

	function applyFilter() {
		const p = new URLSearchParams();
		if (dateFilter !== 'all') p.set('date', dateFilter);
		if (search) p.set('q', search);
		goto(`/admin/humanizations?${p.toString()}`);
	}

	function clearFilters() {
		search = '';
		dateFilter = 'all';
		goto('/admin/humanizations');
	}

	let hasFilters = $derived(dateFilter !== 'all' || search !== '');

	function pageUrl(p: number) {
		const params = new URLSearchParams();
		if (dateFilter !== 'all') params.set('date', dateFilter);
		if (search) params.set('q', search);
		params.set('page', String(p));
		return `/admin/humanizations?${params.toString()}`;
	}

	function fmtDate(s: string) {
		return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const inputStyle = "padding: 8px 12px; border-radius: 8px; font-size: 13px; outline: none; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'Space Grotesk', system-ui;";
</script>

<div style="display: flex; flex-direction: column; gap: 24px; max-width: 1100px;">
	<div>
		<h1 style="font-family: 'Instrument Serif', Georgia, serif; font-size: 28px; font-weight: 400; color: var(--color-text-primary); margin: 0 0 4px;">Humanizations</h1>
		<p style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-muted); margin: 0;">{data.total.toLocaleString()} results</p>
	</div>

	<!-- Filters -->
	<form onsubmit={(e) => { e.preventDefault(); applyFilter(); }} style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
		<input
			type="text"
			placeholder="Search by email…"
			bind:value={search}
			style="{inputStyle} width: 220px;"
		/>
		<select bind:value={dateFilter} onchange={applyFilter} style="{inputStyle} cursor: pointer;">
			<option value="all">All time</option>
			<option value="7d">Last 7 days</option>
			<option value="30d">Last 30 days</option>
			<option value="90d">Last 90 days</option>
		</select>
		<button type="submit" style="padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; background: var(--color-brand); color: white; border: none; cursor: pointer; font-family: 'Space Grotesk', system-ui;">Search</button>
		{#if hasFilters}
			<button type="button" onclick={clearFilters} style="padding: 8px 14px; border-radius: 8px; font-size: 13px; color: var(--color-text-muted); background: transparent; border: 1px solid var(--color-bg-border); cursor: pointer; font-family: 'Space Grotesk', system-ui;">Clear</button>
		{/if}
	</form>

	<!-- Table -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
		<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 13px;">
			<thead>
				<tr style="border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated);">
					{#each ['Date', 'User', 'Words', ''] as h}
						<th style="padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap;">{h}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each data.humanizations as h}
					{@const profile = h.profiles as unknown as { email: string } | null}
					<tr style="border-bottom: 1px solid var(--color-bg-border);">
						<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{fmtDate(h.created_at)}</td>
						<td style="padding: 10px 14px; color: var(--color-text-secondary); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
							<a href="/admin/users/{h.user_id}" style="color: var(--color-brand); text-decoration: none;">{profile?.email ?? h.user_id}</a>
						</td>
						<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-text-secondary);">{h.word_count ?? '—'}</td>
						<td style="padding: 10px 14px;">
							<a href="/admin/humanizations/{h.id}" style="font-size: 12px; color: var(--color-brand); text-decoration: none; font-weight: 600; white-space: nowrap;">View →</a>
						</td>
					</tr>
				{:else}
					<tr><td colspan="4" style="padding: 32px; text-align: center; color: var(--color-text-muted);">No humanizations found.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if data.pages > 1}
		<div style="display: flex; gap: 8px; align-items: center; font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-muted);">
			{#if data.page > 1}
				<a href={pageUrl(data.page - 1)} style="padding: 6px 12px; border-radius: 8px; border: 1px solid var(--color-bg-border); color: var(--color-text-primary); text-decoration: none;">← Prev</a>
			{/if}
			<span>Page {data.page} of {data.pages}</span>
			{#if data.page < data.pages}
				<a href={pageUrl(data.page + 1)} style="padding: 6px 12px; border-radius: 8px; border: 1px solid var(--color-bg-border); color: var(--color-text-primary); text-decoration: none;">Next →</a>
			{/if}
		</div>
	{/if}
</div>
