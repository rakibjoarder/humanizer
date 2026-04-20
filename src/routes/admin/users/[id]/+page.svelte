<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let { profile, subscriptions, detections, humanizations } = $derived(data);

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
</div>
