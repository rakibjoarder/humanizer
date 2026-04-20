<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let { profile, subscriptions, payments, events, activity, customerInfo, detections, humanizations } = $derived(data);

	let creditInput = $state(profile.tokens);
	let planInput = $state<'free' | 'pro'>(profile.plan);
	let saving = $state(false);
	let saveMsg = $state('');

	async function saveChanges() {
		saving = true;
		saveMsg = '';
		try {
			const res = await fetch(`/api/admin/users/${profile.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tokens: Number(creditInput), plan: planInput })
			});
			const json = await res.json();
			if (!res.ok) { saveMsg = json.error ?? 'Failed to save.'; return; }
			saveMsg = 'Saved!';
			await invalidateAll();
			setTimeout(() => (saveMsg = ''), 3000);
		} finally {
			saving = false;
		}
	}

	let insightRows = $derived(data.customerInfo ? [
		{ label: 'Total Spent',    value: `$${(data.customerInfo.totalSpent / 100).toFixed(2)}` },
		{ label: 'Top-up Spent',   value: `$${(data.customerInfo.topUpSpent / 100).toFixed(2)}` },
		{ label: 'Stripe Balance', value: data.customerInfo.balance !== 0 ? `$${(data.customerInfo.balance / 100).toFixed(2)}` : '—' },
		{ label: 'Delinquent',     value: data.customerInfo.delinquent ? 'Yes' : 'No' },
		{ label: 'First Payment',  value: data.customerInfo.firstCharge ? fmtDate(data.customerInfo.firstCharge) : '—' },
		{ label: 'Last Payment',   value: data.customerInfo.lastCharge  ? fmtDate(data.customerInfo.lastCharge)  : '—' },
	] : []);

	function fmtDate(s: string | null) {
		if (!s) return '—';
		return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<div style="display: flex; flex-direction: column; gap: 24px; max-width: 760px;">
	<!-- Header -->
	<div style="display: flex; align-items: center; gap: 12px;">
		<a href="/admin/users" style="font-size: 13px; color: var(--color-text-muted); text-decoration: none;">← Users</a>
		<span style="color: var(--color-bg-border);">/</span>
		<h1 style="font-family: 'Instrument Serif', Georgia, serif; font-size: 22px; font-weight: 400; color: var(--color-text-primary); margin: 0;">{profile.email}</h1>
	</div>

	<!-- Profile info -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
		{#each [
			{ label: 'User ID', value: profile.id },
			{ label: 'Email', value: profile.email },
			{ label: 'Name', value: profile.full_name ?? '—' },
			{ label: 'Stripe Customer', value: profile.stripe_customer_id ?? '—' },
			{ label: 'Joined', value: fmtDate(profile.created_at) },
			{ label: 'Total Detections', value: detections.toLocaleString() },
			{ label: 'Total Humanizations', value: humanizations.toLocaleString() }
		] as row}
			<div>
				<p style="font-family: 'Space Grotesk', system-ui; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 3px;">{row.label}</p>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--color-text-primary); margin: 0; word-break: break-all;">{row.value}</p>
			</div>
		{/each}
	</div>

	<!-- Customer Insights -->
	{#if customerInfo}
		<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; padding: 24px;">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 18px;">
				Customer Insights <span style="font-weight: 400; color: var(--color-text-muted); font-size: 11px;">(live from Stripe)</span>
			</h2>
			<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px;">
				{#each insightRows as row}
					<div style="background: var(--color-bg-elevated); border-radius: 10px; padding: 14px 16px;">
						<p style="font-family: 'Space Grotesk', system-ui; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 4px;">{row.label}</p>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 600; color: var(--color-text-primary); margin: 0;">{row.value}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Edit: plan + credits -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; padding: 24px;">
		<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 18px;">Edit account</h2>

		<div style="display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap;">
			<div>
				<label style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted); display: block; margin-bottom: 6px;">Plan</label>
				<select
					bind:value={planInput}
					style="padding: 8px 12px; border-radius: 8px; font-size: 13px; outline: none; cursor: pointer; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'Space Grotesk', system-ui;"
				>
					<option value="free">Free</option>
					<option value="pro">Pro</option>
				</select>
			</div>

			<div>
				<label style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted); display: block; margin-bottom: 6px;">Credits</label>
				<input
					type="number"
					min="0"
					max="9999"
					bind:value={creditInput}
					style="width: 100px; padding: 8px 12px; border-radius: 8px; font-size: 13px; outline: none; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'JetBrains Mono', monospace;"
				/>
			</div>

			<button
				onclick={saveChanges}
				disabled={saving}
				style="padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; background: var(--color-brand); color: white; border: none; font-family: 'Space Grotesk', system-ui; opacity: {saving ? 0.6 : 1};"
			>{saving ? 'Saving…' : 'Save changes'}</button>

			{#if saveMsg}
				<span style="font-size: 13px; color: {saveMsg === 'Saved!' ? 'var(--color-brand)' : '#ef4444'}; font-family: 'Space Grotesk', system-ui;">{saveMsg}</span>
			{/if}
		</div>
	</div>

	<!-- Subscriptions (live from Stripe) -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; padding: 24px;">
		<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 18px;">
			Subscriptions <span style="font-weight: 400; color: var(--color-text-muted); font-size: 11px;">(live from Stripe)</span>
		</h2>

		{#if subscriptions.length === 0}
			<p style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-muted); margin: 0;">No subscriptions found in Stripe.</p>
		{:else}
			{#each subscriptions as sub}
				<div style="border: 1px solid var(--color-bg-border); border-radius: 10px; padding: 16px; margin-bottom: 12px;">
					<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
						{#each [
							{ label: 'Subscription ID', value: sub.id },
							{ label: 'Status',           value: sub.status },
							{ label: 'Interval',         value: sub.interval ?? '—' },
							{ label: 'Amount',           value: sub.price != null ? `$${(sub.price / 100).toFixed(2)}` : '—' },
							{ label: 'Cancels at end',   value: sub.cancel_at_period_end ? 'Yes' : 'No' },
							{ label: 'Period start',     value: fmtDate(sub.current_period_start) },
							{ label: 'Period end',       value: fmtDate(sub.current_period_end) },
							{ label: 'Created',          value: fmtDate(sub.created) }
						] as row}
							<div>
								<p style="font-family: 'Space Grotesk', system-ui; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 3px;">{row.label}</p>
								<p style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-text-primary); margin: 0; word-break: break-all;">{row.value}</p>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Payments / Top-ups (live from Stripe) -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
		<div style="padding: 14px 20px; border-bottom: 1px solid var(--color-bg-border); display: flex; justify-content: space-between; align-items: center;">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">
				Payments <span style="font-weight: 400; color: var(--color-text-muted); font-size: 11px;">(live from Stripe)</span>
			</h2>
			{#if profile.stripe_customer_id}
				<a
					href="https://dashboard.stripe.com/test/customers/{profile.stripe_customer_id}"
					target="_blank"
					rel="noopener"
					style="font-family: 'Space Grotesk', system-ui; font-size: 12px; font-weight: 600; color: var(--color-brand); text-decoration: none;"
				>View in Stripe →</a>
			{/if}
		</div>

		{#if payments.length === 0}
			<p style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-muted); margin: 0; padding: 20px;">No payments found.</p>
		{:else}
			<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 13px;">
				<thead>
					<tr style="border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated);">
						{#each ['Date', 'Description', 'Credits', 'Amount', 'Receipt'] as h}
							<th style="padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">{h}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each payments as p}
						<tr style="border-bottom: 1px solid var(--color-bg-border);">
							<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{fmtDate(p.created)}</td>
							<td style="padding: 10px 14px; color: var(--color-text-primary);">{p.description}</td>
							<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: {p.credits ? 'var(--color-brand)' : 'var(--color-text-muted)'};">
								{p.credits ? `+${p.credits}` : '—'}
							</td>
							<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-text-secondary);">
								${(p.amount / 100).toFixed(2)} {p.currency.toUpperCase()}
							</td>
							<td style="padding: 10px 14px;">
								{#if p.receiptUrl}
									<a href={p.receiptUrl} target="_blank" rel="noopener" style="font-size: 12px; color: var(--color-brand); text-decoration: none; font-weight: 600;">View →</a>
								{:else}
									<span style="color: var(--color-text-muted);">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<!-- Recent Activity (detections + humanizations) -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
		<div style="padding: 14px 20px; border-bottom: 1px solid var(--color-bg-border);">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">
				Recent Activity <span style="font-weight: 400; color: var(--color-text-muted); font-size: 11px;">(last 15 actions)</span>
			</h2>
		</div>
		{#if activity.length === 0}
			<p style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-muted); margin: 0; padding: 20px;">No activity yet.</p>
		{:else}
			<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 13px;">
				<thead>
					<tr style="border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated);">
						{#each ['Date', 'Action'] as h}
							<th style="padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">{h}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each activity as a}
						<tr style="border-bottom: 1px solid var(--color-bg-border);">
							<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{fmtDate(a.created_at)}</td>
							<td style="padding: 10px 14px;">
								<span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; background: {a.type === 'detection' ? '#3b82f620' : 'var(--color-brand-muted)'}; color: {a.type === 'detection' ? '#3b82f6' : 'var(--color-brand)'};">
									{a.type === 'detection' ? 'Detection' : 'Humanization'}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>

	<!-- Stripe Events -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
		<div style="padding: 14px 20px; border-bottom: 1px solid var(--color-bg-border);">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">
				Stripe Events <span style="font-weight: 400; color: var(--color-text-muted); font-size: 11px;">(last 30)</span>
			</h2>
		</div>
		{#if events.length === 0}
			<p style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-muted); margin: 0; padding: 20px;">No Stripe events found.</p>
		{:else}
			<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 13px;">
				<thead>
					<tr style="border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated);">
						{#each ['Date', 'Event', 'Type'] as h}
							<th style="padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">{h}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each events as ev}
						<tr style="border-bottom: 1px solid var(--color-bg-border);">
							<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{fmtDate(ev.created)}</td>
							<td style="padding: 10px 14px; color: var(--color-text-primary);">{ev.description}</td>
							<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--color-text-muted);">{ev.type}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
