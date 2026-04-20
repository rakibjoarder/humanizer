<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();
	let statusFilter = $state(data.status);

	function applyFilter() {
		const params = new URLSearchParams();
		if (statusFilter) params.set('status', statusFilter);
		params.set('page', '1');
		goto(`/admin/subscriptions?${params}`);
	}

	function fmtDate(s: string | null) {
		if (!s) return '—';
		return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const totalPages = $derived(Math.ceil(data.total / data.perPage));
	function pageUrl(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		return `/admin/subscriptions?${params}`;
	}

	function statusColor(s: string) {
		if (s === 'active') return 'var(--color-brand)';
		if (s === 'canceled') return '#ef4444';
		if (s === 'past_due') return '#f59e0b';
		return 'var(--color-text-muted)';
	}
	function statusBg(s: string) {
		if (s === 'active') return 'var(--color-brand-muted)';
		if (s === 'canceled') return '#ef444415';
		if (s === 'past_due') return '#f59e0b20';
		return 'var(--color-bg-elevated)';
	}
</script>

<div style="display: flex; flex-direction: column; gap: 24px; max-width: 1100px;">
	<div style="display: flex; justify-content: space-between; align-items: flex-end;">
		<div>
			<h1 style="font-family: 'Instrument Serif', Georgia, serif; font-size: 28px; font-weight: 400; color: var(--color-text-primary); margin: 0 0 4px;">Subscriptions</h1>
			<p style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-muted); margin: 0;">{data.total.toLocaleString()} total</p>
		</div>
	</div>

	<!-- Filter -->
	<div style="display: flex; gap: 10px;">
		<select
			bind:value={statusFilter}
			onchange={applyFilter}
			style="padding: 8px 12px; border-radius: 8px; font-size: 13px; outline: none; cursor: pointer; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'Space Grotesk', system-ui;"
		>
			<option value="">All statuses</option>
			<option value="active">Active</option>
			<option value="canceled">Canceled</option>
			<option value="past_due">Past due</option>
		</select>
	</div>

	<!-- Table -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
		<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 13px;">
			<thead>
				<tr style="border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated);">
					{#each ['Email', 'Status', 'Plan', 'Credits', 'Cancels?', 'Period end'] as h}
						<th style="padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">{h}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each data.subs as s}
					<tr style="border-bottom: 1px solid var(--color-bg-border);">
						<td style="padding: 10px 14px; color: var(--color-text-primary);">{(s.profiles as {email:string}).email}</td>
						<td style="padding: 10px 14px;">
							<span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; background: {statusBg(s.status ?? '')}; color: {statusColor(s.status ?? '')};">{s.status}</span>
						</td>
						<td style="padding: 10px 14px; color: var(--color-text-secondary);">{s.plan}</td>
						<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-text-secondary);">{(s.profiles as {tokens:number}).tokens}</td>
						<td style="padding: 10px 14px; color: {s.cancel_at_period_end ? '#f59e0b' : 'var(--color-text-muted)'};">{s.cancel_at_period_end ? 'Yes' : 'No'}</td>
						<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted);">{fmtDate(s.current_period_end)}</td>
					</tr>
				{:else}
					<tr><td colspan="6" style="padding: 32px; text-align: center; color: var(--color-text-muted);">No subscriptions found.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

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
