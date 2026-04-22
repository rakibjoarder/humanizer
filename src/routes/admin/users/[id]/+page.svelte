<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { StripeCustomerInfo } from './+page.server';

	let { data } = $props();
	let { profile, subscriptions, payments, events, activity, customerInfo, detections, humanizations, recentDetections, recentHumanizations } = $derived(data);

	let wordsInput = $state(profile.words_balance);
	let planInput = $state<'free' | 'basic' | 'pro' | 'ultra'>(profile.plan);
	let saving = $state(false);
	let saveMsg = $state('');
	let selectedDetections = $state<Set<string>>(new Set());
	let selectedHumanizations = $state<Set<string>>(new Set());
	let confirmDeleteAllDetections = $state('');
	let confirmDeleteAllHumanizations = $state('');
	let accessInput = $state<'active' | 'deactivated'>(profile.disabled ? 'deactivated' : 'active');

	async function saveChanges() {
		saving = true;
		saveMsg = '';
		try {
			const res = await fetch(`/api/admin/users/${profile.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					words_balance: Number(wordsInput),
					plan: planInput,
					disabled: accessInput === 'deactivated'
				})
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

	let insightRows = $derived.by(() => {
		const ci = data.customerInfo as StripeCustomerInfo | null;
		if (!ci) return [];
		return [
			{ label: 'Total Spent',    value: `$${(ci.totalSpent / 100).toFixed(2)}` },
			{ label: 'Top-up Spent',   value: `$${(ci.topUpSpent / 100).toFixed(2)}` },
			{ label: 'Stripe Balance', value: ci.balance !== 0 ? `$${(ci.balance / 100).toFixed(2)}` : '—' },
			{ label: 'Delinquent',     value: ci.delinquent ? 'Yes' : 'No' },
			{ label: 'First Payment',  value: ci.firstCharge ? fmtDate(ci.firstCharge) : '—' },
			{ label: 'Last Payment',   value: ci.lastCharge  ? fmtDate(ci.lastCharge)  : '—' },
		];
	});

	function fmtDate(s: string | null) {
		if (!s) return '—';
		return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function planColor(plan: string) {
		if (plan === 'ultra') return { bg: '#7c3aed20', color: '#7c3aed' };
		if (plan === 'pro') return { bg: 'var(--color-brand-muted)', color: 'var(--color-brand)' };
		if (plan === 'basic') return { bg: '#3b82f620', color: '#3b82f6' };
		return { bg: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' };
	}

	function toggleSet(set: Set<string>, id: string, checked: boolean): Set<string> {
		const next = new Set(set);
		if (checked) next.add(id);
		else next.delete(id);
		return next;
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
		<div>
			<p style="font-family: 'Space Grotesk', system-ui; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 3px;">Plan</p>
			<span style="font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 99px; background: {planColor(profile.plan).bg}; color: {planColor(profile.plan).color};">{profile.plan}</span>
		</div>
		<div>
			<p style="font-family: 'Space Grotesk', system-ui; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 3px;">Words Balance</p>
			<p style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--color-text-primary); margin: 0;">
				{profile.words_balance === -1 ? '∞ unlimited' : (profile.words_balance ?? 0).toLocaleString()}
			</p>
		</div>
		<div>
			<p style="font-family: 'Space Grotesk', system-ui; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 3px;">Status</p>
			<span style="font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: {profile.disabled ? '#ef444415' : 'rgba(34,197,94,0.15)'}; color: {profile.disabled ? '#ef4444' : '#16a34a'};">
				{profile.disabled ? 'Deactivated' : 'Active'}
			</span>
		</div>
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

	<!-- Edit: plan + words -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; padding: 24px;">
		<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 18px;">Edit account</h2>

		<div style="display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap;">
			<div>
				<label for="user-access" style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted); display: block; margin-bottom: 6px;">Account access</label>
				<select
					id="user-access"
					bind:value={accessInput}
					style="padding: 8px 12px; border-radius: 8px; font-size: 13px; outline: none; cursor: pointer; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'Space Grotesk', system-ui;"
				>
					<option value="active">Active</option>
					<option value="deactivated">Deactivated</option>
				</select>
			</div>

			<div>
				<label for="user-plan" style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted); display: block; margin-bottom: 6px;">Plan</label>
				<select
					id="user-plan"
					bind:value={planInput}
					style="padding: 8px 12px; border-radius: 8px; font-size: 13px; outline: none; cursor: pointer; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'Space Grotesk', system-ui;"
				>
					<option value="free">Free (no plan)</option>
					<option value="basic">Basic</option>
					<option value="pro">Pro</option>
					<option value="ultra">Ultra</option>
				</select>
			</div>

			<div>
				<label for="user-words" style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted); display: block; margin-bottom: 6px;">Words Balance (-1 = unlimited)</label>
				<input
					id="user-words"
					type="number"
					min="-1"
					max="9999999"
					bind:value={wordsInput}
					style="width: 140px; padding: 8px 12px; border-radius: 8px; font-size: 13px; outline: none; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'JetBrains Mono', monospace;"
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

	<!-- Subscriptions -->
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

	<!-- Payments -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
		<div style="padding: 14px 20px; border-bottom: 1px solid var(--color-bg-border); display: flex; justify-content: space-between; align-items: center;">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">
				Payments <span style="font-weight: 400; color: var(--color-text-muted); font-size: 11px;">(live from Stripe)</span>
			</h2>
			{#if profile.stripe_customer_id}
				<a href={`https://dashboard.stripe.com/test/customers/${profile.stripe_customer_id}`} target="_blank" rel="noopener" style="font-family: 'Space Grotesk', system-ui; font-size: 12px; font-weight: 600; color: var(--color-brand); text-decoration: none;">View in Stripe →</a>
			{/if}
		</div>

		{#if payments.length === 0}
			<p style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-muted); margin: 0; padding: 20px;">No payments found.</p>
		{:else}
			<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 13px;">
				<thead>
					<tr style="border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated);">
						{#each ['Date', 'Description', 'Words', 'Amount', 'Receipt'] as h}
							<th style="padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">{h}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each payments as p}
						<tr style="border-bottom: 1px solid var(--color-bg-border);">
							<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{fmtDate(p.created)}</td>
							<td style="padding: 10px 14px; color: var(--color-text-primary);">{p.description}</td>
							<td style="padding: 10px 14px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: {p.words ? 'var(--color-brand)' : 'var(--color-text-muted)'};">
								{p.words ? `+${p.words.toLocaleString()}` : '—'}
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

	<!-- Recent Activity -->
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

	<!-- Detections / Humanizations quick delete -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; padding: 24px;">
		<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 18px;">
			Delete user data
		</h2>

		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
			<div style="border: 1px solid var(--color-bg-border); border-radius: 10px; overflow: hidden;">
				<div style="padding: 12px 14px; border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated); display: flex; align-items: center; justify-content: space-between; gap: 10px;">
					<div style="font-family: 'Space Grotesk', system-ui; font-weight: 700; font-size: 12px; color: var(--color-text-primary);">Detections (recent)</div>
					<div style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted);">{selectedDetections.size} selected</div>
				</div>
				<div style="padding: 12px 14px; display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid var(--color-bg-border);">
					<form
						method="POST"
						action="?/deleteUserDetectionsSelected"
						onsubmit={(e) => {
							if (selectedDetections.size === 0) { e.preventDefault(); return; }
							if (!confirm(`Delete ${selectedDetections.size} detection(s) for this user?`)) e.preventDefault();
						}}
					>
						<input type="hidden" name="ids" value={JSON.stringify(Array.from(selectedDetections))} />
						<button type="submit" style="padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; background: #ef4444; color: white; border: none; cursor: pointer; font-family: 'Space Grotesk', system-ui; opacity: {selectedDetections.size === 0 ? 0.5 : 1};" disabled={selectedDetections.size === 0}>Delete selected</button>
					</form>
					<form
						method="POST"
						action="?/deleteUserDetectionsAll"
						onsubmit={(e) => {
							if (!confirm('Delete ALL detections for this user?')) { e.preventDefault(); return; }
							if (confirmDeleteAllDetections !== 'DELETE') { e.preventDefault(); alert('Type DELETE to confirm.'); }
						}}
					>
						<input name="confirm" type="text" placeholder="Type DELETE" bind:value={confirmDeleteAllDetections} style="padding: 7px 10px; border-radius: 8px; font-size: 12px; outline: none; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'JetBrains Mono', monospace; width: 120px;" />
						<button type="submit" style="padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; background: transparent; color: #ef4444; border: 1px solid rgba(239,68,68,0.4); cursor: pointer; font-family: 'Space Grotesk', system-ui;">Delete all</button>
					</form>
				</div>
				<div style="max-height: 220px; overflow: auto;">
					<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 13px;">
						<thead>
							<tr style="border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated);">
								<th style="padding: 8px 10px; width: 1%;"></th>
								<th style="padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">Date</th>
								<th style="padding: 8px 10px;"></th>
							</tr>
						</thead>
						<tbody>
							{#each recentDetections ?? [] as d}
								<tr style="border-bottom: 1px solid var(--color-bg-border);">
									<td style="padding: 8px 10px;">
										<input type="checkbox" checked={selectedDetections.has(d.id)} onchange={(e) => (selectedDetections = toggleSet(selectedDetections, d.id, (e.currentTarget as HTMLInputElement).checked))} />
									</td>
									<td style="padding: 8px 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{fmtDate(d.created_at)}</td>
									<td style="padding: 8px 10px;">
										<a href={`/admin/detections/${d.id}`} style="font-size: 12px; color: var(--color-brand); text-decoration: none; font-weight: 600;">View →</a>
									</td>
								</tr>
							{:else}
								<tr><td colspan="3" style="padding: 14px 10px; color: var(--color-text-muted);">No detections.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<div style="border: 1px solid var(--color-bg-border); border-radius: 10px; overflow: hidden;">
				<div style="padding: 12px 14px; border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated); display: flex; align-items: center; justify-content: space-between; gap: 10px;">
					<div style="font-family: 'Space Grotesk', system-ui; font-weight: 700; font-size: 12px; color: var(--color-text-primary);">Humanizations (recent)</div>
					<div style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted);">{selectedHumanizations.size} selected</div>
				</div>
				<div style="padding: 12px 14px; display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid var(--color-bg-border);">
					<form
						method="POST"
						action="?/deleteUserHumanizationsSelected"
						onsubmit={(e) => {
							if (selectedHumanizations.size === 0) { e.preventDefault(); return; }
							if (!confirm(`Delete ${selectedHumanizations.size} humanization(s) for this user?`)) e.preventDefault();
						}}
					>
						<input type="hidden" name="ids" value={JSON.stringify(Array.from(selectedHumanizations))} />
						<button type="submit" style="padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; background: #ef4444; color: white; border: none; cursor: pointer; font-family: 'Space Grotesk', system-ui; opacity: {selectedHumanizations.size === 0 ? 0.5 : 1};" disabled={selectedHumanizations.size === 0}>Delete selected</button>
					</form>
					<form
						method="POST"
						action="?/deleteUserHumanizationsAll"
						onsubmit={(e) => {
							if (!confirm('Delete ALL humanizations for this user?')) { e.preventDefault(); return; }
							if (confirmDeleteAllHumanizations !== 'DELETE') { e.preventDefault(); alert('Type DELETE to confirm.'); }
						}}
					>
						<input name="confirm" type="text" placeholder="Type DELETE" bind:value={confirmDeleteAllHumanizations} style="padding: 7px 10px; border-radius: 8px; font-size: 12px; outline: none; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'JetBrains Mono', monospace; width: 120px;" />
						<button type="submit" style="padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; background: transparent; color: #ef4444; border: 1px solid rgba(239,68,68,0.4); cursor: pointer; font-family: 'Space Grotesk', system-ui;">Delete all</button>
					</form>
				</div>
				<div style="max-height: 220px; overflow: auto;">
					<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 13px;">
						<thead>
							<tr style="border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated);">
								<th style="padding: 8px 10px; width: 1%;"></th>
								<th style="padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">Date</th>
								<th style="padding: 8px 10px;"></th>
							</tr>
						</thead>
						<tbody>
							{#each recentHumanizations ?? [] as h}
								<tr style="border-bottom: 1px solid var(--color-bg-border);">
									<td style="padding: 8px 10px;">
										<input type="checkbox" checked={selectedHumanizations.has(h.id)} onchange={(e) => (selectedHumanizations = toggleSet(selectedHumanizations, h.id, (e.currentTarget as HTMLInputElement).checked))} />
									</td>
									<td style="padding: 8px 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{fmtDate(h.created_at)}</td>
									<td style="padding: 8px 10px;">
										<a href={`/admin/humanizations/${h.id}`} style="font-size: 12px; color: var(--color-brand); text-decoration: none; font-weight: 600;">View →</a>
									</td>
								</tr>
							{:else}
								<tr><td colspan="3" style="padding: 14px 10px; color: var(--color-text-muted);">No humanizations.</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
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
