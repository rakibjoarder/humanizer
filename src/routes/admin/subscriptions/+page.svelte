<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	// ── Filter (server-driven) ────────────────────────────
	let statusFilter = $state<string>('active');
	$effect(() => { statusFilter = data.status; });
	function applyStatusFilter() {
		goto(`/admin/subscriptions?status=${statusFilter}`, { replaceState: true });
	}

	// ── Search / Sort / Pagination (client-side) ──────────
	let search    = $state('');
	let sortCol   = $state<'email' | 'plan' | 'status' | 'interval' | 'current_period_end' | 'created'>('created');
	let sortDir   = $state<'asc' | 'desc'>('desc');
	const PAGE_SIZE = 20;
	let currentPage = $state(1);

	function toggleSort(col: typeof sortCol) {
		if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else { sortCol = col; sortDir = 'asc'; }
		currentPage = 1;
	}

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		let rows = q
			? data.subscriptions.filter((s: any) =>
				s.email.toLowerCase().includes(q) ||
				s.plan.toLowerCase().includes(q) ||
				s.status.toLowerCase().includes(q)
			)
			: [...data.subscriptions];

		rows.sort((a: any, b: any) => {
			let av = a[sortCol] ?? '';
			let bv = b[sortCol] ?? '';
			if (sortCol === 'current_period_end' || sortCol === 'created') {
				av = new Date(av).getTime();
				bv = new Date(bv).getTime();
			} else {
				av = String(av).toLowerCase();
				bv = String(bv).toLowerCase();
			}
			if (av < bv) return sortDir === 'asc' ? -1 : 1;
			if (av > bv) return sortDir === 'asc' ? 1 : -1;
			return 0;
		});
		return rows;
	});

	const pageCount  = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
	const pageRows   = $derived(filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));
	const showing    = $derived(`${Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`);

	$effect(() => { search; currentPage = 1; });

	// ── Helpers ──────────────────────────────────────────
	function fmtDate(s: string) {
		return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
	function statusColor(s: string) {
		if (s === 'active')    return 'var(--color-brand)';
		if (s === 'cancelled') return '#ef4444';
		if (s === 'past_due')  return '#f59e0b';
		if (s === 'on_trial')  return '#3b82f6';
		return 'var(--color-text-muted)';
	}
	function statusBg(s: string) {
		if (s === 'active')    return 'var(--color-brand-muted)';
		if (s === 'cancelled') return '#ef444415';
		if (s === 'past_due')  return '#f59e0b20';
		if (s === 'on_trial')  return '#3b82f618';
		return 'var(--color-bg-elevated)';
	}
	function sortIcon(col: typeof sortCol) {
		if (sortCol !== col) return '↕';
		return sortDir === 'asc' ? '↑' : '↓';
	}
</script>

<div class="subs-page">
	<!-- Header -->
	<div class="subs-header">
		<div>
			<h1 class="subs-title">Subscriptions</h1>
			<p class="subs-subtitle">
				{data.total} from LemonSqueezy
				{#if search}· <span style="color: var(--color-brand);">{filtered.length} matching</span>{/if}
			</p>
		</div>
		<div class="subs-header-actions">
			<a href="https://app.lemonsqueezy.com/" target="_blank" rel="noopener noreferrer" class="btn-ghost">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
				LS Dashboard
			</a>
			<a href="https://app.lemonsqueezy.com/subscriptions" target="_blank" rel="noopener noreferrer" class="btn-brand">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
				LS Subscriptions
			</a>
		</div>
	</div>

	<!-- Filter bar -->
	<div class="subs-filters">
		<input
			type="search"
			bind:value={search}
			placeholder="Search email, plan, status…"
			class="subs-search"
		/>
		<select bind:value={statusFilter} onchange={applyStatusFilter} class="subs-select">
			<option value="active">Active</option>
			<option value="on_trial">Trialing</option>
			<option value="cancelled">Cancelled</option>
			<option value="past_due">Past due</option>
			<option value="paused">Paused</option>
			<option value="expired">Expired</option>
			<option value="all">All statuses</option>
		</select>
	</div>

	<!-- Table -->
	<div class="subs-table-wrap">
		<table class="subs-table">
			<thead>
				<tr>
					{#each [
						{ col: 'email',             label: 'Email' },
						{ col: 'plan',              label: 'Plan' },
						{ col: 'status',            label: 'Status' },
						{ col: 'interval',          label: 'Billing' },
						{ col: null,                label: 'Cancels?' },
						{ col: 'current_period_end',label: 'Period end' },
						{ col: 'created',           label: 'Created' },
						{ col: null,                label: '' },
					] as h}
						<th class:sortable={!!h.col} onclick={h.col ? () => toggleSort(h.col as typeof sortCol) : undefined}>
							{h.label}{#if h.col}&nbsp;<span class="sort-icon">{sortIcon(h.col as typeof sortCol)}</span>{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each pageRows as s (s.id)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_interactive_supports_focus -->
					<tr role="link" onclick={() => goto(`/admin/subscriptions/${s.id}`)}>
						<td class="td-email">{s.email}</td>
						<td class="td-secondary">{s.plan}</td>
						<td>
							<span class="status-badge" style="background:{statusBg(s.status)};color:{statusColor(s.status)};">{s.status}</span>
						</td>
						<td class="td-secondary">{s.interval}</td>
						<td style="color:{s.cancel_at_period_end ? '#f59e0b' : 'var(--color-text-muted)'};">{s.cancel_at_period_end ? 'Yes' : '—'}</td>
						<td class="td-mono">{fmtDate(s.current_period_end)}</td>
						<td class="td-mono">{fmtDate(s.created)}</td>
						<td class="td-arrow">→</td>
					</tr>
				{:else}
					<tr><td colspan="8" class="td-empty">No subscriptions found.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if pageCount > 1}
		<div class="subs-pagination">
			<span class="page-info">{showing}</span>
			<div class="page-btns">
				<button class="page-btn" onclick={() => (currentPage = 1)} disabled={currentPage === 1}>«</button>
				<button class="page-btn" onclick={() => currentPage--} disabled={currentPage === 1}>‹ Prev</button>
				{#each Array.from({ length: pageCount }, (_, i) => i + 1).filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === pageCount) as p, i}
					{@const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === pageCount)}
					{#if i > 0 && p - pages[i - 1] > 1}
						<span class="page-ellipsis">…</span>
					{/if}
					<button class="page-btn" class:page-active={p === currentPage} onclick={() => (currentPage = p)}>{p}</button>
				{/each}
				<button class="page-btn" onclick={() => currentPage++} disabled={currentPage === pageCount}>Next ›</button>
				<button class="page-btn" onclick={() => (currentPage = pageCount)} disabled={currentPage === pageCount}>»</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.subs-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 1100px;
	}

	/* Header */
	.subs-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: 12px;
	}
	.subs-title {
		font-family: 'Instrument Serif', Georgia, serif;
		font-size: 28px;
		font-weight: 400;
		color: var(--color-text-primary);
		margin: 0 0 4px;
	}
	.subs-subtitle {
		font-family: 'Space Grotesk', system-ui;
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0;
	}
	.subs-header-actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.btn-ghost {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-bg-border);
		border-radius: 9px;
		font-family: 'Space Grotesk', system-ui;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-decoration: none;
		transition: border-color 150ms, color 150ms;
	}
	.btn-ghost:hover { border-color: var(--color-brand); color: var(--color-brand); }

	.btn-brand {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: var(--color-brand-muted);
		border: 1px solid var(--color-brand);
		border-radius: 9px;
		font-family: 'Space Grotesk', system-ui;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-brand);
		text-decoration: none;
	}

	/* Filter bar */
	.subs-filters {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.subs-search {
		flex: 1;
		min-width: 180px;
		padding: 8px 12px;
		border-radius: 8px;
		font-size: 13px;
		outline: none;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-bg-border);
		color: var(--color-text-primary);
		font-family: 'Space Grotesk', system-ui;
		transition: border-color 150ms;
	}
	.subs-search:focus { border-color: var(--color-brand); }
	.subs-select {
		padding: 8px 12px;
		border-radius: 8px;
		font-size: 13px;
		outline: none;
		cursor: pointer;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-bg-border);
		color: var(--color-text-primary);
		font-family: 'Space Grotesk', system-ui;
	}

	/* Table */
	.subs-table-wrap {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-bg-border);
		border-radius: 12px;
		overflow: hidden;
		overflow-x: auto;
	}
	.subs-table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'Space Grotesk', system-ui;
		font-size: 13px;
	}

	.subs-table thead tr {
		border-bottom: 1px solid var(--color-bg-border);
		background: var(--color-bg-elevated);
	}
	.subs-table th {
		padding: 10px 14px;
		text-align: left;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		white-space: nowrap;
		user-select: none;
	}
	.subs-table th.sortable { cursor: pointer; }
	.subs-table th.sortable:hover { color: var(--color-text-primary); }
	.sort-icon { font-size: 10px; opacity: 0.6; }

	.subs-table tbody tr {
		border-bottom: 1px solid var(--color-bg-border);
		cursor: pointer;
		transition: background 100ms;
	}
	.subs-table tbody tr:hover { background: var(--color-bg-elevated); }
	.subs-table tbody tr:last-child { border-bottom: none; }

	.subs-table td { padding: 10px 14px; }
	.td-email { color: var(--color-text-primary); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.td-secondary { color: var(--color-text-secondary); }
	.td-mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap; }
	.td-arrow { font-size: 12px; color: var(--color-text-muted); }
	.td-empty { padding: 36px; text-align: center; color: var(--color-text-muted); }

	.status-badge {
		display: inline-block;
		font-size: 11px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 99px;
		text-transform: capitalize;
	}

	/* Pagination */
	.subs-pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 10px;
	}
	.page-info {
		font-family: 'Space Grotesk', system-ui;
		font-size: 13px;
		color: var(--color-text-muted);
	}
	.page-btns {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.page-btn {
		padding: 5px 10px;
		min-width: 32px;
		border-radius: 7px;
		font-size: 12px;
		font-weight: 600;
		font-family: 'Space Grotesk', system-ui;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-bg-border);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: border-color 120ms, color 120ms;
	}
	.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
	.page-btn:not(:disabled):hover { border-color: var(--color-brand); color: var(--color-brand); }
	.page-btn.page-active {
		background: var(--color-brand-muted);
		border-color: var(--color-brand);
		color: var(--color-brand);
	}
	.page-ellipsis {
		font-family: 'Space Grotesk', system-ui;
		font-size: 13px;
		color: var(--color-text-muted);
		padding: 0 4px;
	}

	/* Mobile responsiveness */
	@media (max-width: 640px) {
		.subs-header { flex-direction: column; }
		.subs-header-actions { width: 100%; }
		.btn-ghost, .btn-brand { flex: 1; justify-content: center; font-size: 12px; padding: 8px 10px; }
		.subs-filters { flex-direction: column; }
		.subs-search, .subs-select { width: 100%; }
		.subs-pagination { flex-direction: column; align-items: flex-start; }
		/* Hide less critical columns on small screens */
		.subs-table th:nth-child(4),
		.subs-table td:nth-child(4),
		.subs-table th:nth-child(5),
		.subs-table td:nth-child(5),
		.subs-table th:nth-child(7),
		.subs-table td:nth-child(7) {
			display: none;
		}
	}
</style>
