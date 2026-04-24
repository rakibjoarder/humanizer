<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { LSCustomerInfo } from './+page.server';

	let { data } = $props();
	let { profile, subscriptions, payments, activity, customerInfo, detections, humanizations, recentDetections, recentHumanizations, wordCredits } = $derived(data);

	let creditInput = $state(0);
	let planInput = $state<'free' | 'basic' | 'pro' | 'ultra'>(profile.plan);
	let saving = $state(false);
	let saveMsg = $state('');
	let selectedDetections = $state<Set<string>>(new Set());
	let selectedHumanizations = $state<Set<string>>(new Set());
	let confirmDeleteAllDetections = $state('');
	let confirmDeleteAllHumanizations = $state('');
	let accessEnabled = $state(!profile.disabled);

	// Payment timeline — merge subscriptions + payments into one sorted list
	type TimelineEvent =
		| { kind: 'payment'; date: string; orderId: string; description: string; amount: number; currency: string; receiptUrl: string | null }
		| { kind: 'sub_start'; date: string; subId: string; interval: string | null; status: string }
		| { kind: 'sub_cancelled'; date: string; subId: string };

	const paymentTimeline = $derived.by((): TimelineEvent[] => {
		const events: TimelineEvent[] = [];
		for (const p of payments) {
			events.push({ kind: 'payment', date: p.created, orderId: p.id, description: p.description, amount: p.amount, currency: p.currency, receiptUrl: p.receiptUrl });
		}
		for (const s of subscriptions) {
			events.push({ kind: 'sub_start', date: s.created, subId: s.id, interval: s.interval, status: s.status });
			if (s.cancelled_at) {
				events.push({ kind: 'sub_cancelled', date: s.cancelled_at, subId: s.id });
			}
		}
		return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	});

	// Word balance history pagination
	const WC_PREVIEW = 5;
	const WC_PAGE_SIZE = 10;
	let wcExpanded = $state(false);
	let wcPage = $state(1);
	let wcFilter = $state('all');
	let wcSort = $state<'desc' | 'asc'>('desc');

	const wcFiltered = $derived.by(() => {
		const list = wcFilter === 'all' ? [...wordCredits] : wordCredits.filter(c => c.source === wcFilter);
		return list.sort((a, b) => {
			const d = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			return wcSort === 'desc' ? d : -d;
		});
	});
	const wcPageCount = $derived(Math.max(1, Math.ceil(wcFiltered.length / WC_PAGE_SIZE)));
	const wcVisible = $derived(wcFiltered.slice((wcPage - 1) * WC_PAGE_SIZE, wcPage * WC_PAGE_SIZE));

	async function saveChanges() {
		saving = true;
		saveMsg = '';
		try {
			const res = await fetch(`/api/admin/users/${profile.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					words_credit: Number(creditInput) || 0,
					plan: planInput,
					disabled: !accessEnabled
				})
			});
			const json = await res.json();
			if (!res.ok) { saveMsg = json.error ?? 'Failed to save.'; return; }
			saveMsg = 'Saved!';
			creditInput = 0;
			wcPage = 1;
			await invalidateAll();
			setTimeout(() => (saveMsg = ''), 3000);
		} finally {
			saving = false;
		}
	}

	let insightRows = $derived.by(() => {
		const ci = data.customerInfo as LSCustomerInfo | null;
		if (!ci) return [];
		return [
			{ label: 'Total Spent',   value: `$${(ci.totalSpent / 100).toFixed(2)}` },
			{ label: 'First Payment', value: ci.firstCharge ? fmtDate(ci.firstCharge) : '—' },
			{ label: 'Last Payment',  value: ci.lastCharge  ? fmtDate(ci.lastCharge)  : '—' },
		];
	});

	function fmtDate(s: string | null) {
		if (!s) return '—';
		return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function fmtDateTime(s: string | null) {
		if (!s) return '—';
		return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
	}

	function planColor(plan: string) {
		if (plan === 'ultra') return { bg: '#7c3aed20', color: '#7c3aed' };
		if (plan === 'pro') return { bg: 'var(--color-brand-muted)', color: 'var(--color-brand)' };
		if (plan === 'basic') return { bg: '#3b82f620', color: '#3b82f6' };
		return { bg: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' };
	}

	function creditColor(source: string) {
		if (source === 'subscription' || source === 'subscription_renewal') return '#16a34a';
		if (source === 'word_pack') return '#3b82f6';
		if (source === 'admin') return '#7c3aed';
		return 'var(--color-text-muted)';
	}

	function toggleSet(set: Set<string>, id: string, checked: boolean): Set<string> {
		const next = new Set(set);
		if (checked) next.add(id);
		else next.delete(id);
		return next;
	}
</script>

<div style="display: flex; flex-direction: column; gap: 24px; max-width: 860px;">
	<!-- Header -->
	<div style="display: flex; align-items: center; gap: 12px;">
		<a href="/admin/users" style="font-size: 13px; color: var(--color-text-muted); text-decoration: none;">← Users</a>
		<span style="color: var(--color-bg-border);">/</span>
		<h1 style="font-family: 'Instrument Serif', Georgia, serif; font-size: 22px; font-weight: 400; color: var(--color-text-primary); margin: 0;">{profile.email}</h1>
		<span style="margin-left: 4px; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 99px; background: {planColor(profile.plan).bg}; color: {planColor(profile.plan).color};">{profile.plan}</span>
		<span style="font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: {profile.disabled ? '#ef444415' : 'rgba(34,197,94,0.15)'}; color: {profile.disabled ? '#ef4444' : '#16a34a'};">
			{profile.disabled ? 'Deactivated' : 'Active'}
		</span>
	</div>

	<!-- Profile info -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; padding: 20px 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
		{#each [
			{ label: 'User ID',            value: profile.id },
			{ label: 'Email',              value: profile.email },
			{ label: 'Name',               value: profile.full_name ?? '—' },
			{ label: 'LS Customer',        value: profile.ls_customer_id ?? '—' },
			{ label: 'Joined',             value: fmtDate(profile.created_at) },
			{ label: 'Words Balance',      value: profile.words_balance === -1 ? '∞ unlimited' : (profile.words_balance ?? 0).toLocaleString() },
			{ label: 'Total Detections',   value: detections.toLocaleString() },
			{ label: 'Total Humanizations',value: humanizations.toLocaleString() }
		] as row}
			<div>
				<p style="font-family: 'Space Grotesk', system-ui; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 3px;">{row.label}</p>
				<p style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-text-primary); margin: 0; word-break: break-all;">{row.value}</p>
			</div>
		{/each}
	</div>

	<!-- Customer Insights -->
	{#if customerInfo}
		<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; padding: 20px 24px;">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 14px;">
				Customer Insights <span style="font-weight: 400;">(live from LemonSqueezy)</span>
			</h2>
			<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
				{#each insightRows as row}
					<div style="background: var(--color-bg-elevated); border-radius: 10px; padding: 12px 16px;">
						<p style="font-family: 'Space Grotesk', system-ui; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 4px;">{row.label}</p>
						<p style="font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 600; color: var(--color-text-primary); margin: 0;">{row.value}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Edit account -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
		<div style="padding: 14px 24px; border-bottom: 1px solid var(--color-bg-border);">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">Edit Account</h2>
		</div>
		<div style="padding: 20px 24px; display: flex; gap: 24px; align-items: flex-end; flex-wrap: wrap;">

			<!-- Account access toggle -->
			<div>
				<p style="font-family: 'Space Grotesk', system-ui; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 10px;">Account Access</p>
				<button
					onclick={() => (accessEnabled = !accessEnabled)}
					style="display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer; padding: 0;"
					type="button"
				>
					<span style="
						position: relative; display: inline-block; width: 42px; height: 24px;
						background: {accessEnabled ? 'var(--color-brand)' : '#dc2626'}; border-radius: 999px;
						transition: background 0.2s;
					">
						<span style="
							position: absolute; top: 3px; left: {accessEnabled ? '21px' : '3px'};
							width: 18px; height: 18px; background: white; border-radius: 50%;
							transition: left 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
						"></span>
					</span>
					<span style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: {accessEnabled ? '#16a34a' : '#dc2626'};">
						{accessEnabled ? 'Active' : 'Deactivated'}
					</span>
				</button>
			</div>

			<!-- Plan -->
			<div>
				<label for="user-plan" style="font-family: 'Space Grotesk', system-ui; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 8px;">Plan</label>
				<select
					id="user-plan"
					bind:value={planInput}
					style="padding: 8px 12px; border-radius: 8px; font-size: 13px; outline: none; cursor: pointer; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'Space Grotesk', system-ui;"
				>
					<option value="free">Free</option>
					<option value="basic">Basic</option>
					<option value="pro">Pro</option>
					<option value="ultra">Ultra</option>
				</select>
			</div>

			<!-- Add credit -->
			<div>
				<label for="user-credit" style="font-family: 'Space Grotesk', system-ui; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 4px;">Add Words</label>
				<p style="font-family: 'Space Grotesk', system-ui; font-size: 11px; color: var(--color-text-muted); margin: 0 0 8px;">
					Current: <strong style="color: var(--color-text-primary);">{(profile.words_balance === -1 ? '∞' : (profile.words_balance ?? 0).toLocaleString())}</strong>
				</p>
				<div style="display: flex; align-items: center; gap: 8px;">
					<input
						id="user-credit"
						type="number"
						min="-999999"
						max="999999"
						placeholder="e.g. 5000"
						bind:value={creditInput}
						style="width: 130px; padding: 8px 12px; border-radius: 8px; font-size: 13px; outline: none; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'JetBrains Mono', monospace;"
					/>
					{#if creditInput !== 0}
						<span style="font-family: 'Space Grotesk', system-ui; font-size: 11px; color: {creditInput > 0 ? '#16a34a' : '#dc2626'};">
							→ {(profile.words_balance === -1 ? '∞' : ((profile.words_balance ?? 0) + Number(creditInput)).toLocaleString())}
						</span>
					{/if}
				</div>
			</div>

			<button
				onclick={saveChanges}
				disabled={saving}
				style="padding: 9px 22px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; background: var(--color-brand); color: white; border: none; font-family: 'Space Grotesk', system-ui; opacity: {saving ? 0.6 : 1};"
			>{saving ? 'Saving…' : 'Save changes'}</button>

			{#if saveMsg}
				<span style="font-size: 13px; color: {saveMsg === 'Saved!' ? 'var(--color-brand)' : '#ef4444'}; font-family: 'Space Grotesk', system-ui;">{saveMsg}</span>
			{/if}
		</div>

		<!-- Word balance history -->
		{#if wordCredits.length > 0}
			<div style="border-top: 1px solid var(--color-bg-border);">
				<!-- Header row -->
				<div style="padding: 10px 24px; background: var(--color-bg-elevated); display: flex; align-items: center; justify-content: space-between;">
					<p style="font-family: 'Space Grotesk', system-ui; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">Word Balance History</p>
					{#if wordCredits.length > WC_PREVIEW}
						<button
							onclick={() => { wcExpanded = !wcExpanded; wcPage = 1; }}
							style="background: none; border: none; cursor: pointer; font-family: 'Space Grotesk', system-ui; font-size: 11px; font-weight: 600; color: var(--color-brand);"
						>{wcExpanded ? 'Show less ↑' : `Show all (${wordCredits.length}) ↓`}</button>
					{/if}
				</div>

				{#if wcExpanded}
					<!-- Filter + sort controls -->
					<div style="padding: 10px 24px; border-bottom: 1px solid var(--color-bg-border); display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
						<select
							bind:value={wcFilter}
							onchange={() => (wcPage = 1)}
							style="padding: 5px 10px; border-radius: 6px; font-size: 11px; font-family: 'Space Grotesk', system-ui; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); cursor: pointer; outline: none;"
						>
							<option value="all">All sources</option>
							<option value="subscription">Plan activation</option>
							<option value="subscription_renewal">Renewal</option>
							<option value="word_pack">Word pack</option>
							<option value="admin_credit">Admin</option>
						</select>
						<button
							onclick={() => { wcSort = wcSort === 'desc' ? 'asc' : 'desc'; wcPage = 1; }}
							style="padding: 5px 10px; border-radius: 6px; font-size: 11px; font-family: 'Space Grotesk', system-ui; font-weight: 600; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); cursor: pointer;"
						>{wcSort === 'desc' ? '↓ Newest' : '↑ Oldest'}</button>
						<span style="font-size: 11px; color: var(--color-text-muted); margin-left: auto;">{wcFiltered.length} records</span>
					</div>
					<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 12px;">
						<thead>
							<tr style="border-bottom: 1px solid var(--color-bg-border);">
								{#each ['Date', 'Source', 'Description', 'Amount'] as h}
									<th style="padding: 8px 24px; text-align: left; font-size: 10px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">{h}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each wcVisible as wc}
								<tr style="border-bottom: 1px solid var(--color-bg-border);">
									<td style="padding: 8px 24px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{fmtDate(wc.created_at)}</td>
									<td style="padding: 8px 24px;">
										<span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; background: {creditColor(wc.source)}18; color: {creditColor(wc.source)};">{wc.source.replace(/_/g, ' ')}</span>
									</td>
									<td style="padding: 8px 24px; color: var(--color-text-secondary);">{wc.description ?? '—'}</td>
									<td style="padding: 8px 24px; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; color: {wc.amount >= 0 ? '#16a34a' : '#dc2626'};">
										{wc.amount >= 0 ? '+' : ''}{wc.amount.toLocaleString()}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
					{#if wcPageCount > 1}
						<div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 24px; border-top: 1px solid var(--color-bg-border);">
							<button
								onclick={() => wcPage--}
								disabled={wcPage === 1}
								style="padding: 5px 14px; border-radius: 6px; font-size: 11px; font-weight: 600; font-family: 'Space Grotesk', system-ui; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); cursor: pointer; opacity: {wcPage === 1 ? 0.4 : 1};"
							>← Prev</button>
							<span style="font-size: 11px; color: var(--color-text-muted);">Page {wcPage} of {wcPageCount}</span>
							<button
								onclick={() => wcPage++}
								disabled={wcPage === wcPageCount}
								style="padding: 5px 14px; border-radius: 6px; font-size: 11px; font-weight: 600; font-family: 'Space Grotesk', system-ui; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); cursor: pointer; opacity: {wcPage === wcPageCount ? 0.4 : 1};"
							>Next →</button>
						</div>
					{/if}
				{:else}
					<!-- Preview: top 5 -->
					<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 12px;">
						<thead>
							<tr style="border-bottom: 1px solid var(--color-bg-border);">
								{#each ['Date', 'Source', 'Description', 'Amount'] as h}
									<th style="padding: 8px 24px; text-align: left; font-size: 10px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">{h}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each wordCredits.slice(0, WC_PREVIEW) as wc}
								<tr style="border-bottom: 1px solid var(--color-bg-border);">
									<td style="padding: 8px 24px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{fmtDate(wc.created_at)}</td>
									<td style="padding: 8px 24px;">
										<span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; background: {creditColor(wc.source)}18; color: {creditColor(wc.source)};">{wc.source.replace(/_/g, ' ')}</span>
									</td>
									<td style="padding: 8px 24px; color: var(--color-text-secondary);">{wc.description ?? '—'}</td>
									<td style="padding: 8px 24px; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; color: {wc.amount >= 0 ? '#16a34a' : '#dc2626'};">
										{wc.amount >= 0 ? '+' : ''}{wc.amount.toLocaleString()}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
					{#if wordCredits.length > WC_PREVIEW}
						<div style="padding: 10px 24px; border-top: 1px solid var(--color-bg-border);">
							<button
								onclick={() => { wcExpanded = true; wcPage = 1; }}
								style="width: 100%; padding: 7px; border-radius: 7px; font-size: 12px; font-weight: 600; font-family: 'Space Grotesk', system-ui; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); cursor: pointer;"
							>Show all {wordCredits.length} records ↓</button>
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	</div>

	<!-- Payment Timeline -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
		<div style="padding: 14px 24px; border-bottom: 1px solid var(--color-bg-border); display: flex; justify-content: space-between; align-items: center;">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">
				Payment Timeline <span style="font-weight: 400;">(live from LemonSqueezy)</span>
			</h2>
			{#if profile.ls_customer_id}
				<a href={`https://app.lemonsqueezy.com/customers/${profile.ls_customer_id}`} target="_blank" rel="noopener" style="font-family: 'Space Grotesk', system-ui; font-size: 12px; font-weight: 600; color: var(--color-brand); text-decoration: none;">View in LS →</a>
			{/if}
		</div>

		{#if paymentTimeline.length === 0}
			<p style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-muted); margin: 0; padding: 20px 24px;">No payment history found.</p>
		{:else}
			<div style="padding: 20px 24px;">
				{#each paymentTimeline as event, i}
					{@const isLast = i === paymentTimeline.length - 1}
					<div style="display: flex; gap: 16px; align-items: flex-start;">
						<!-- Timeline spine -->
						<div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 16px;">
							<div style="
								width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; margin-top: 3px;
								background: {event.kind === 'payment' ? '#16a34a' : event.kind === 'sub_cancelled' ? '#dc2626' : '#3b82f6'};
								border: 2px solid var(--color-bg-surface);
								box-shadow: 0 0 0 1px {event.kind === 'payment' ? '#16a34a' : event.kind === 'sub_cancelled' ? '#dc2626' : '#3b82f6'};
							"></div>
							{#if !isLast}
								<div style="width: 1px; flex: 1; min-height: 28px; background: var(--color-bg-border); margin-top: 4px;"></div>
							{/if}
						</div>

						<!-- Event content -->
						<div style="flex: 1; padding-bottom: {isLast ? '0' : '16px'};">
							<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
								<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
									{#if event.kind === 'payment'}
										<span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; background: #16a34a18; color: #16a34a;">Paid</span>
										<span style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-primary);">{event.description}</span>
										<span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--color-text-muted);">#{event.orderId}</span>
									{:else if event.kind === 'sub_start'}
										<span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; background: #3b82f618; color: #3b82f6;">Subscribed</span>
										<span style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-primary);">Subscription started</span>
										<span style="font-family: 'Space Grotesk', system-ui; font-size: 11px; color: var(--color-text-muted); text-transform: capitalize;">{event.interval ?? ''}</span>
										<span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--color-text-muted);">#{event.subId}</span>
									{:else if event.kind === 'sub_cancelled'}
										<span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; background: #dc262618; color: #dc2626;">Cancelled</span>
										<span style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-primary);">Subscription cancelled</span>
										<span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--color-text-muted);">#{event.subId}</span>
									{/if}
								</div>
								<div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
									{#if event.kind === 'payment'}
										<span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; color: #16a34a;">${(event.amount / 100).toFixed(2)} <span style="font-size: 10px; font-weight: 400; color: var(--color-text-muted);">{event.currency.toUpperCase()}</span></span>
										{#if event.receiptUrl}
											<a href={event.receiptUrl} target="_blank" rel="noopener" style="font-size: 11px; font-weight: 600; font-family: 'Space Grotesk', system-ui; color: var(--color-brand); text-decoration: none; padding: 2px 8px; border: 1px solid var(--color-brand); border-radius: 4px;">Receipt</a>
										{/if}
									{/if}
								</div>
							</div>
							<p style="font-family: 'Space Grotesk', system-ui; font-size: 11px; color: var(--color-text-muted); margin: 3px 0 0;">{fmtDateTime(event.date)}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Recent Activity -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
		<div style="padding: 14px 24px; border-bottom: 1px solid var(--color-bg-border);">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">
				Recent Activity <span style="font-weight: 400;">(last 15 actions)</span>
			</h2>
		</div>
		{#if activity.length === 0}
			<p style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-muted); margin: 0; padding: 20px 24px;">No activity yet.</p>
		{:else}
			<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 13px;">
				<thead>
					<tr style="border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated);">
						{#each ['Date', 'Action'] as h}
							<th style="padding: 10px 24px; text-align: left; font-size: 10px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">{h}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each activity as a}
						<tr style="border-bottom: 1px solid var(--color-bg-border);">
							<td style="padding: 10px 24px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{fmtDate(a.created_at)}</td>
							<td style="padding: 10px 24px;">
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

	<!-- Delete user data -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
		<div style="padding: 14px 24px; border-bottom: 1px solid var(--color-bg-border);">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">Delete User Data</h2>
		</div>

		<!-- Detections -->
		<div style="border-bottom: 1px solid var(--color-bg-border);">
			<div style="padding: 12px 24px; background: var(--color-bg-elevated); display: flex; align-items: center; justify-content: space-between; gap: 16px;">
				<span style="font-family: 'Space Grotesk', system-ui; font-size: 12px; font-weight: 700; color: var(--color-text-primary);">Detections <span style="font-weight: 400; color: var(--color-text-muted);">(recent 10)</span></span>
				<div style="display: flex; gap: 8px; align-items: center;">
					<span style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted);">{selectedDetections.size} selected</span>
					<form method="POST" action="?/deleteUserDetectionsSelected" onsubmit={(e) => { if (selectedDetections.size === 0) { e.preventDefault(); return; } if (!confirm(`Delete ${selectedDetections.size} detection(s)?`)) e.preventDefault(); }}>
						<input type="hidden" name="ids" value={JSON.stringify(Array.from(selectedDetections))} />
						<button type="submit" disabled={selectedDetections.size === 0} style="padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; background: #ef4444; color: white; border: none; cursor: pointer; opacity: {selectedDetections.size === 0 ? 0.4 : 1};">Delete selected</button>
					</form>
					<form method="POST" action="?/deleteUserDetectionsAll" onsubmit={(e) => { if (!confirm('Delete ALL detections for this user?')) { e.preventDefault(); return; } if (confirmDeleteAllDetections !== 'DELETE') { e.preventDefault(); alert('Type DELETE to confirm.'); } }}>
						<input name="confirm" type="text" placeholder="Type DELETE" bind:value={confirmDeleteAllDetections} style="padding: 5px 10px; border-radius: 6px; font-size: 12px; outline: none; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'JetBrains Mono', monospace; width: 110px;" />
						<button type="submit" style="padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; background: transparent; color: #ef4444; border: 1px solid rgba(239,68,68,0.4); cursor: pointer; margin-left: 4px;">Delete all</button>
					</form>
				</div>
			</div>
			<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 12px;">
				<thead>
					<tr style="border-bottom: 1px solid var(--color-bg-border);">
						<th style="padding: 8px 24px; width: 1%;"></th>
						<th style="padding: 8px 24px; text-align: left; font-size: 10px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">Date</th>
						<th style="padding: 8px 24px;"></th>
					</tr>
				</thead>
				<tbody>
					{#each recentDetections ?? [] as d}
						<tr style="border-bottom: 1px solid var(--color-bg-border);">
							<td style="padding: 8px 24px;"><input type="checkbox" checked={selectedDetections.has(d.id)} onchange={(e) => (selectedDetections = toggleSet(selectedDetections, d.id, (e.currentTarget as HTMLInputElement).checked))} /></td>
							<td style="padding: 8px 24px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{fmtDate(d.created_at)}</td>
							<td style="padding: 8px 24px;"><a href={`/admin/detections/${d.id}`} style="font-size: 12px; color: var(--color-brand); text-decoration: none; font-weight: 600;">View →</a></td>
						</tr>
					{:else}
						<tr><td colspan="3" style="padding: 14px 24px; color: var(--color-text-muted); font-size: 13px;">No detections.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Humanizations -->
		<div>
			<div style="padding: 12px 24px; background: var(--color-bg-elevated); display: flex; align-items: center; justify-content: space-between; gap: 16px;">
				<span style="font-family: 'Space Grotesk', system-ui; font-size: 12px; font-weight: 700; color: var(--color-text-primary);">Humanizations <span style="font-weight: 400; color: var(--color-text-muted);">(recent 10)</span></span>
				<div style="display: flex; gap: 8px; align-items: center;">
					<span style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted);">{selectedHumanizations.size} selected</span>
					<form method="POST" action="?/deleteUserHumanizationsSelected" onsubmit={(e) => { if (selectedHumanizations.size === 0) { e.preventDefault(); return; } if (!confirm(`Delete ${selectedHumanizations.size} humanization(s)?`)) e.preventDefault(); }}>
						<input type="hidden" name="ids" value={JSON.stringify(Array.from(selectedHumanizations))} />
						<button type="submit" disabled={selectedHumanizations.size === 0} style="padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; background: #ef4444; color: white; border: none; cursor: pointer; opacity: {selectedHumanizations.size === 0 ? 0.4 : 1};">Delete selected</button>
					</form>
					<form method="POST" action="?/deleteUserHumanizationsAll" onsubmit={(e) => { if (!confirm('Delete ALL humanizations for this user?')) { e.preventDefault(); return; } if (confirmDeleteAllHumanizations !== 'DELETE') { e.preventDefault(); alert('Type DELETE to confirm.'); } }}>
						<input name="confirm" type="text" placeholder="Type DELETE" bind:value={confirmDeleteAllHumanizations} style="padding: 5px 10px; border-radius: 6px; font-size: 12px; outline: none; background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); font-family: 'JetBrains Mono', monospace; width: 110px;" />
						<button type="submit" style="padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; background: transparent; color: #ef4444; border: 1px solid rgba(239,68,68,0.4); cursor: pointer; margin-left: 4px;">Delete all</button>
					</form>
				</div>
			</div>
			<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 12px;">
				<thead>
					<tr style="border-bottom: 1px solid var(--color-bg-border);">
						<th style="padding: 8px 24px; width: 1%;"></th>
						<th style="padding: 8px 24px; text-align: left; font-size: 10px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">Date</th>
						<th style="padding: 8px 24px;"></th>
					</tr>
				</thead>
				<tbody>
					{#each recentHumanizations ?? [] as h}
						<tr style="border-bottom: 1px solid var(--color-bg-border);">
							<td style="padding: 8px 24px;"><input type="checkbox" checked={selectedHumanizations.has(h.id)} onchange={(e) => (selectedHumanizations = toggleSet(selectedHumanizations, h.id, (e.currentTarget as HTMLInputElement).checked))} /></td>
							<td style="padding: 8px 24px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{fmtDate(h.created_at)}</td>
							<td style="padding: 8px 24px;"><a href={`/admin/humanizations/${h.id}`} style="font-size: 12px; color: var(--color-brand); text-decoration: none; font-weight: 600;">View →</a></td>
						</tr>
					{:else}
						<tr><td colspan="3" style="padding: 14px 24px; color: var(--color-text-muted); font-size: 13px;">No humanizations.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

</div>
