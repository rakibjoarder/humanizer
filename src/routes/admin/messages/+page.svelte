<script lang="ts">
	import { page } from '$app/state';

	let { data } = $props();

	let expanded = $state<string | null>(null);

	function fmtDate(s: string) {
		return new Date(s).toLocaleString('en-US', {
			month: 'short', day: 'numeric', year: 'numeric',
			hour: 'numeric', minute: '2-digit'
		});
	}

	const totalPages = $derived(Math.ceil(data.total / data.perPage));

	function pageUrl(p: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(p));
		return `/admin/messages?${params}`;
	}
</script>

<div class="admin-page-content">
	<div class="admin-page-header">
		<div>
			<h1 class="admin-page-title">Messages</h1>
			<p class="admin-page-sub">{data.total.toLocaleString()} total</p>
		</div>
	</div>

	{#if data.messages.length === 0}
		<div style="text-align:center;padding:60px 20px;color:var(--color-text-muted);font-family:'Space Grotesk',system-ui,sans-serif;font-size:14px;">
			No messages yet.
		</div>
	{:else}
		<div class="admin-table-wrap">
			<table class="admin-table">
				<thead>
					<tr>
						<th>From</th>
						<th>Subject</th>
						<th>Date</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.messages as msg}
						<tr class:expanded-row={expanded === msg.id}>
							<td>
								<div style="font-weight:600;font-size:13px;color:var(--color-text-primary);">{msg.name}</div>
								<div style="font-size:12px;color:var(--color-text-muted);">{msg.email}</div>
							</td>
							<td style="max-width:260px;">
								<span style="font-size:13px;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;">{msg.subject}</span>
							</td>
							<td style="white-space:nowrap;font-size:12px;color:var(--color-text-muted);">{fmtDate(msg.created_at)}</td>
							<td>
								<button
									type="button"
									onclick={() => expanded = expanded === msg.id ? null : msg.id}
									style="padding:4px 10px;border-radius:6px;border:1px solid var(--color-bg-border);background:transparent;color:var(--color-text-secondary);font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;font-weight:600;cursor:pointer;"
								>
									{expanded === msg.id ? 'Hide' : 'View'}
								</button>
							</td>
						</tr>
						{#if expanded === msg.id}
							<tr>
								<td colspan="4" style="padding:0;">
									<div style="padding:16px 20px;background:var(--color-bg-elevated);border-top:1px solid var(--color-bg-border);border-bottom:1px solid var(--color-bg-border);">
										<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
											<a
												href="mailto:{msg.email}"
												style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:7px;background:var(--color-brand);color:#fff;font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;font-weight:600;text-decoration:none;"
											>
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
												Reply to {msg.email}
											</a>
										</div>
										<p style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;color:var(--color-text-primary);margin:0;white-space:pre-wrap;line-height:1.6;">{msg.message}</p>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div style="display:flex;align-items:center;justify-content:space-between;margin-top:20px;font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;color:var(--color-text-muted);">
				<span>Page {data.page} of {totalPages}</span>
				<div style="display:flex;gap:8px;">
					{#if data.page > 1}
						<a href={pageUrl(data.page - 1)} class="admin-pagination-btn">← Prev</a>
					{/if}
					{#if data.page < totalPages}
						<a href={pageUrl(data.page + 1)} class="admin-pagination-btn">Next →</a>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>
