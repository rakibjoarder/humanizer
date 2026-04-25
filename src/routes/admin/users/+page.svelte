<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	let search = $state<string>('');
	let planFilter = $state<string>('');
	$effect(() => { search = data.search; planFilter = data.plan; });

	// Track in-flight toggle requests to show spinner per user
	let toggling = $state<Set<string>>(new Set());
	// Optimistic disabled state overrides keyed by user id
	let disabledOverrides = $state<Record<string, boolean>>({});

	function applyFilters() {
		const params = new URLSearchParams();
		if (search) params.set('q', search);
		if (planFilter) params.set('plan', planFilter);
		params.set('page', '1');
		goto(`/admin/users?${params}`);
	}

	function fmtDate(s: string) {
		return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const totalPages = $derived(Math.ceil(data.total / data.perPage));

	function pageUrl(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		return `/admin/users?${params}`;
	}

	function planColor(plan: string) {
		if (plan === 'ultra') return { bg: '#7c3aed20', color: '#7c3aed' };
		if (plan === 'pro')   return { bg: 'var(--color-brand-muted)', color: 'var(--color-brand)' };
		if (plan === 'basic') return { bg: '#3b82f620', color: '#3b82f6' };
		return { bg: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' };
	}

	function isDisabled(u: any) {
		return u.id in disabledOverrides ? disabledOverrides[u.id] : Boolean(u.disabled);
	}

	async function toggleDisabled(u: any, e: MouseEvent) {
		e.stopPropagation();
		if (toggling.has(u.id)) return;

		const newDisabled = !isDisabled(u);
		// Optimistic update
		disabledOverrides = { ...disabledOverrides, [u.id]: newDisabled };
		toggling = new Set([...toggling, u.id]);

		try {
			const res = await fetch(`/api/admin/users/${u.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ disabled: newDisabled })
			});
			if (!res.ok) {
				// Revert optimistic update
				const { [u.id]: _, ...rest } = disabledOverrides;
				disabledOverrides = rest;
			}
		} catch {
			const { [u.id]: _, ...rest } = disabledOverrides;
			disabledOverrides = rest;
		} finally {
			const next = new Set(toggling);
			next.delete(u.id);
			toggling = next;
		}
	}
</script>

<div class="users-page">
	<div class="users-header">
		<div>
			<h1 class="users-title">Users</h1>
			<p class="users-subtitle">{data.total.toLocaleString()} total</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="users-filters">
		<input
			type="text"
			placeholder="Search by email…"
			bind:value={search}
			onkeydown={(e) => e.key === 'Enter' && applyFilters()}
			class="users-search"
		/>
		<select bind:value={planFilter} onchange={applyFilters} class="users-select">
			<option value="">All plans</option>
			<option value="free">Free</option>
			<option value="basic">Basic</option>
			<option value="pro">Pro</option>
			<option value="ultra">Ultra</option>
		</select>
		<button onclick={applyFilters} class="users-search-btn">Search</button>
	</div>

	<!-- Table -->
	<div class="users-table-wrap">
		<table class="users-table">
			<thead>
				<tr>
					<th>Email</th>
					<th>Name</th>
					<th>Plan</th>
					<th>Words</th>
					<th class="col-hide-sm">LS Customer</th>
					<th class="col-hide-sm">Joined</th>
					<th>Status</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.users as u (u.id)}
					{@const disabled = isDisabled(u)}
					{@const busy = toggling.has(u.id)}
					<tr onclick={() => goto(`/admin/users/${u.id}`)} class:row-disabled={disabled}>
						<td class="td-email">{u.email}</td>
						<td class="td-secondary">{u.full_name ?? '—'}</td>
						<td>
							<span class="plan-badge" style="background:{planColor(u.plan).bg};color:{planColor(u.plan).color};">{u.plan}</span>
						</td>
						<td class="td-words" style="color:{(u.words_balance ?? 0) <= 500 && u.plan !== 'ultra' ? '#f59e0b' : 'var(--color-text-secondary)'};">
							{u.words_balance === -1 ? '∞' : (u.words_balance ?? 0).toLocaleString()}
						</td>
						<td class="td-mono col-hide-sm">{u.ls_customer_id ? u.ls_customer_id.slice(0, 14) + '…' : '—'}</td>
						<td class="td-mono col-hide-sm">{fmtDate(u.created_at)}</td>

						<!-- Disable toggle -->
						<td onclick={(e) => toggleDisabled(u, e)} class="td-toggle">
							<button
								type="button"
								class="toggle-btn"
								class:toggle-active={!disabled}
								class:toggle-disabled={disabled}
								disabled={busy}
								aria-label={disabled ? 'Enable user' : 'Disable user'}
								title={disabled ? 'Click to enable' : 'Click to disable'}
							>
								{#if busy}
									<span class="toggle-spinner"></span>
								{:else}
									<span class="toggle-knob"></span>
								{/if}
							</button>
							<span class="toggle-label" class:label-active={!disabled} class:label-disabled={disabled}>
								{disabled ? 'Disabled' : 'Active'}
							</span>
						</td>

						<td class="td-view">
							<a href="/admin/users/{u.id}" onclick={(e) => e.stopPropagation()} class="view-link">View →</a>
						</td>
					</tr>
				{:else}
					<tr><td colspan="8" class="td-empty">No users found.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="users-pagination">
			{#if data.page > 1}
				<a href={pageUrl(data.page - 1)} class="page-link">← Prev</a>
			{/if}
			<span class="page-info">Page {data.page} of {totalPages}</span>
			{#if data.page < totalPages}
				<a href={pageUrl(data.page + 1)} class="page-link">Next →</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.users-page {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 1100px;
	}

	.users-title {
		font-family: 'Instrument Serif', Georgia, serif;
		font-size: 28px;
		font-weight: 400;
		color: var(--color-text-primary);
		margin: 0 0 4px;
	}
	.users-subtitle {
		font-family: 'Space Grotesk', system-ui;
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0;
	}

	.users-filters {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.users-search {
		flex: 1;
		min-width: 180px;
		max-width: 320px;
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
	.users-search:focus { border-color: var(--color-brand); }
	.users-select {
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
	.users-search-btn {
		padding: 8px 18px;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		background: var(--color-brand);
		color: white;
		border: none;
		font-family: 'Space Grotesk', system-ui;
	}

	/* Table */
	.users-table-wrap {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-bg-border);
		border-radius: 12px;
		overflow: hidden;
		overflow-x: auto;
	}
	.users-table {
		width: 100%;
		border-collapse: collapse;
		font-family: 'Space Grotesk', system-ui;
		font-size: 13px;
	}
	.users-table thead tr {
		border-bottom: 1px solid var(--color-bg-border);
		background: var(--color-bg-elevated);
	}
	.users-table th {
		padding: 10px 14px;
		text-align: left;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		white-space: nowrap;
	}
	.users-table tbody tr {
		border-bottom: 1px solid var(--color-bg-border);
		cursor: pointer;
		transition: background 100ms;
	}
	.users-table tbody tr:hover { background: var(--color-bg-elevated); }
	.users-table tbody tr:last-child { border-bottom: none; }
	.row-disabled { opacity: 0.6; }

	.users-table td { padding: 10px 14px; }
	.td-email {
		color: var(--color-text-primary);
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.td-secondary { color: var(--color-text-secondary); }
	.td-words { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
	.td-mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap; }
	.td-view { white-space: nowrap; }
	.td-toggle { white-space: nowrap; }
	.td-empty { padding: 36px; text-align: center; color: var(--color-text-muted); }

	.plan-badge {
		display: inline-block;
		font-size: 11px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 99px;
	}

	/* Toggle */
	.td-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
	}
	.toggle-btn {
		position: relative;
		width: 36px;
		height: 20px;
		border-radius: 999px;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		padding: 0 3px;
		transition: background 200ms;
	}
	.toggle-btn:disabled { cursor: wait; }
	.toggle-active  { background: var(--color-brand); }
	.toggle-disabled { background: #dc2626; }

	.toggle-knob {
		position: absolute;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: white;
		box-shadow: 0 1px 3px rgba(0,0,0,0.25);
		transition: left 200ms;
	}
	.toggle-active  .toggle-knob { left: calc(100% - 17px); }
	.toggle-disabled .toggle-knob { left: 3px; }

	@keyframes spin { to { transform: rotate(360deg); } }
	.toggle-spinner {
		width: 12px;
		height: 12px;
		border: 2px solid rgba(255,255,255,0.4);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 600ms linear infinite;
		margin: auto;
	}

	.toggle-label {
		font-family: 'Space Grotesk', system-ui;
		font-size: 12px;
		font-weight: 600;
	}
	.label-active  { color: var(--color-brand); }
	.label-disabled { color: #dc2626; }

	.view-link {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-brand);
		text-decoration: none;
	}

	/* Pagination */
	.users-pagination {
		display: flex;
		gap: 8px;
		justify-content: center;
		align-items: center;
	}
	.page-link {
		padding: 6px 14px;
		border-radius: 8px;
		font-size: 13px;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-bg-border);
		color: var(--color-text-secondary);
		text-decoration: none;
		font-family: 'Space Grotesk', system-ui;
	}
	.page-link:hover { border-color: var(--color-brand); color: var(--color-brand); }
	.page-info {
		font-size: 13px;
		color: var(--color-text-muted);
		font-family: 'Space Grotesk', system-ui;
	}

	/* Mobile */
	@media (max-width: 640px) {
		.col-hide-sm { display: none; }
		.users-search { max-width: 100%; }
		.toggle-label { display: none; }
	}
</style>
