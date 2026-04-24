<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	let search = $state(data.search);
	let planFilter = $state(data.plan);

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
		if (plan === 'pro') return { bg: 'var(--color-brand-muted)', color: 'var(--color-brand)' };
		if (plan === 'basic') return { bg: '#3b82f620', color: '#3b82f6' };
		return { bg: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' };
	}
</script>

<div style="display: flex; flex-direction: column; gap: 24px; max-width: 1100px;">
	<div style="display: flex; justify-content: space-between; align-items: flex-end;">
		<div>
			<h1 style="font-family: 'Instrument Serif', Georgia, serif; font-size: 28px; font-weight: 400; color: var(--color-text-primary); margin: 0 0 4px;">Users</h1>
			<p style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-muted); margin: 0;">{data.total.toLocaleString()} total</p>
		</div>
	</div>

	<!-- Filters -->
	<div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
		<input
			type="text"
			placeholder="Search by email…"
			bind:value={search}
			onkeydown={(e) => e.key === 'Enter' && applyFilters()}
			style="flex: 1; min-width: 200px; max-width: 320px; padding: 8px 12px; border-radius: 8px; font-size: 13px; outline: none; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'Space Grotesk', system-ui;"
		/>
		<select
			bind:value={planFilter}
			onchange={applyFilters}
			style="padding: 8px 12px; border-radius: 8px; font-size: 13px; outline: none; cursor: pointer; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'Space Grotesk', system-ui;"
		>
			<option value="">All plans</option>
			<option value="free">Free (no plan)</option>
			<option value="basic">Basic</option>
			<option value="pro">Pro</option>
			<option value="ultra">Ultra</option>
		</select>
		<button
			onclick={applyFilters}
			style="padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; background: var(--color-brand); color: white; border: none; font-family: 'Space Grotesk', system-ui;"
		>Search</button>
	</div>

	<!-- Table -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden; overflow-x: auto;">
		<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 13px;">
			<thead>
				<tr style="border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated);">
					{#each ['Email', 'Name', 'Plan', 'Words', 'LS Customer', 'Joined'] as h}
						<th style="padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap;">{h}</th>
					{/each}
					<th style="padding: 10px 14px;"></th>
				</tr>
			</thead>
			<tbody>
				{#each data.users as u}
					<tr style="border-bottom: 1px solid var(--color-bg-border);">
						<td style="padding: 10px 14px; color: var(--color-text-primary); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{u.email}</td>
						<td style="padding: 10px 14px; color: var(--color-text-secondary);">{u.full_name ?? '—'}</td>
						<td style="padding: 10px 14px;">
							<span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; background: {planColor(u.plan).bg}; color: {planColor(u.plan).color};">{u.plan}</span>
						</td>
						<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: {(u.words_balance ?? 0) <= 500 && u.plan !== 'ultra' ? '#f59e0b' : 'var(--color-text-secondary)'};">
							{u.words_balance === -1 ? '∞' : (u.words_balance ?? 0).toLocaleString()}
						</td>
						<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted);">{u.ls_customer_id ? u.ls_customer_id.slice(0, 14) + '…' : '—'}</td>
						<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{fmtDate(u.created_at)}</td>
						<td style="padding: 10px 14px;">
							<a href={`/admin/users/${u.id}`} style="font-size: 12px; font-weight: 600; color: var(--color-brand); text-decoration: none;">View →</a>
						</td>
					</tr>
				{:else}
					<tr><td colspan="7" style="padding: 32px; text-align: center; color: var(--color-text-muted);">No users found.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div style="display: flex; gap: 8px; justify-content: center;">
			{#if data.page > 1}
				<a href={pageUrl(data.page - 1)} style="padding: 6px 14px; border-radius: 8px; font-size: 13px; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); text-decoration: none;">← Prev</a>
			{/if}
			<span style="padding: 6px 14px; font-size: 13px; color: var(--color-text-muted); font-family: 'Space Grotesk', system-ui;">Page {data.page} of {totalPages}</span>
			{#if data.page < totalPages}
				<a href={pageUrl(data.page + 1)} style="padding: 6px 14px; border-radius: 8px; font-size: 13px; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); text-decoration: none;">Next →</a>
			{/if}
		</div>
	{/if}
</div>
