<script lang="ts">
	let { data } = $props();
	let { subscription: s, profile } = $derived(data);

	function fmtDate(v: string | null) {
		if (!v) return '—';
		return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
	function fmtDateTime(v: string | null) {
		if (!v) return '—';
		return new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
	}

	function statusColor(st: string) {
		if (st === 'active') return { color: 'var(--color-brand)', bg: 'var(--color-brand-muted)' };
		if (st === 'cancelled') return { color: '#ef4444', bg: '#ef444415' };
		if (st === 'past_due') return { color: '#f59e0b', bg: '#f59e0b20' };
		if (st === 'on_trial') return { color: '#3b82f6', bg: '#3b82f618' };
		return { color: 'var(--color-text-muted)', bg: 'var(--color-bg-elevated)' };
	}

	const sc = $derived(statusColor(s.status));

	const lsSubUrl     = `https://app.lemonsqueezy.com/subscriptions/${s.id}`;
	const lsCustomerUrl = s.customerId ? `https://app.lemonsqueezy.com/customers/${s.customerId}` : null;
</script>

<div style="display: flex; flex-direction: column; gap: 24px; max-width: 860px;">

	<!-- Breadcrumb + header -->
	<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
		<div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
			<a href="/admin/subscriptions" style="font-size: 13px; color: var(--color-text-muted); text-decoration: none;">← Subscriptions</a>
			<span style="color: var(--color-bg-border);">/</span>
			<h1 style="font-family: 'Instrument Serif', Georgia, serif; font-size: 22px; font-weight: 400; color: var(--color-text-primary); margin: 0;">{s.email}</h1>
			<span style="font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; background: {sc.bg}; color: {sc.color}; text-transform: capitalize;">{s.status}</span>
		</div>
		<!-- LS links -->
		<div style="display: flex; gap: 8px;">
			{#if lsCustomerUrl}
				<a href={lsCustomerUrl} target="_blank" rel="noopener noreferrer"
					style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid var(--color-bg-border); border-radius: 8px; font-family: 'Space Grotesk', system-ui; font-size: 12px; font-weight: 600; color: var(--color-text-secondary); text-decoration: none; background: var(--color-bg-elevated);">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
					LS Customer
				</a>
			{/if}
			<a href={lsSubUrl} target="_blank" rel="noopener noreferrer"
				style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid var(--color-brand); border-radius: 8px; font-family: 'Space Grotesk', system-ui; font-size: 12px; font-weight: 600; color: var(--color-brand); text-decoration: none; background: var(--color-brand-muted);">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
				Open in LemonSqueezy
			</a>
		</div>
	</div>

	<!-- Subscription details -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
		<div style="padding: 12px 20px; border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated);">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">Subscription Details</h2>
		</div>
		<div style="padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
			{#each [
				{ label: 'Subscription ID', value: s.id },
				{ label: 'Customer ID',     value: s.customerId || '—' },
				{ label: 'Order ID',        value: s.orderId || '—' },
				{ label: 'Product',         value: s.productName },
				{ label: 'Variant',         value: s.variantName },
				{ label: 'Billing',         value: s.interval },
				{ label: 'Renews At',       value: fmtDate(s.renewsAt) },
				{ label: 'Ends At',         value: fmtDate(s.endsAt) },
				{ label: 'Trial Ends',      value: fmtDate(s.trialEndsAt) },
				{ label: 'Cancels at end',  value: s.cancelled ? 'Yes' : 'No' },
				{ label: 'Created',         value: fmtDateTime(s.createdAt) },
				{ label: 'Updated',         value: fmtDateTime(s.updatedAt) },
			] as row}
				<div>
					<p style="font-family: 'Space Grotesk', system-ui; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 3px;">{row.label}</p>
					<p style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-text-primary); margin: 0; word-break: break-all;">{row.value}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Linked user profile -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
		<div style="padding: 12px 20px; border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated); display: flex; align-items: center; justify-content: space-between;">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">Linked User Account</h2>
			{#if profile}
				<a href="/admin/users/{profile.id}"
					style="font-family: 'Space Grotesk', system-ui; font-size: 12px; font-weight: 600; color: var(--color-brand); text-decoration: none;">
					View full profile →
				</a>
			{/if}
		</div>

		{#if profile}
			<div style="padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
				{#each [
					{ label: 'User ID',       value: profile.id },
					{ label: 'Email',         value: profile.email },
					{ label: 'Name',          value: profile.full_name ?? '—' },
					{ label: 'Plan (local)',  value: profile.plan },
					{ label: 'Word Balance',  value: profile.words_balance === -1 ? '∞ unlimited' : (profile.words_balance ?? 0).toLocaleString() },
					{ label: 'LS Customer',   value: profile.ls_customer_id ?? '—' },
					{ label: 'Joined',        value: fmtDate(profile.created_at) },
					{ label: 'Status',        value: profile.disabled ? 'Deactivated' : 'Active' },
				] as row}
					<div>
						<p style="font-family: 'Space Grotesk', system-ui; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 3px;">{row.label}</p>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-text-primary); margin: 0; word-break: break-all;">{row.value}</p>
					</div>
				{/each}
			</div>
		{:else}
			<div style="padding: 20px 24px; display: flex; align-items: center; gap: 10px;">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
				<p style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-muted); margin: 0;">
					No local account found for <strong style="color: var(--color-text-primary);">{s.email}</strong>.
				</p>
			</div>
		{/if}
	</div>

</div>
