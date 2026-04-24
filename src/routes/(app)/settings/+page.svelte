<script lang="ts">
	import { invalidate } from '$app/navigation';

	let { data } = $props();
	let supabase = $derived(data.supabase);
	let profile = $derived(data.profile);
	let user = $derived(data.user);

	let fullName = $state('');
	$effect(() => { fullName = profile?.full_name ?? ''; });
	let profileLoading = $state(false);
	let profileSuccess = $state(false);
	let profileError = $state('');

	let billingLoading = $state(false);

	// ── Billing history ───────────────────────────────────────────────────────────
	type Invoice = {
		id: string;
		number: string | null;
		status: string | null;
		amount_paid: number;
		currency: string;
		created: number;
		hosted_invoice_url: string | null;
		billing_reason: string | null;
		description: string | null;
	};
	type Cancellation = { id: string; canceled_at: number | null; ended_at: number | null; plan: string | null; };
	type TimelineEntry = ({ kind: 'invoice' } & Invoice) | ({ kind: 'cancellation' } & Cancellation);
	let invoices = $state<Invoice[]>([]);
	let cancellations = $state<Cancellation[]>([]);
	const timeline = $derived<TimelineEntry[]>(
		[
			...invoices.map(i => ({ kind: 'invoice' as const, ...i })),
			...cancellations.map(c => ({ kind: 'cancellation' as const, ...c }))
		].sort((a, b) => {
			const ta = a.kind === 'invoice' ? a.created : (a.canceled_at ?? 0);
			const tb = b.kind === 'invoice' ? b.created : (b.canceled_at ?? 0);
			return tb - ta;
		})
	);
	let invoicesLoading = $state(false);
	let invoicesLoaded = $state(false);
	let invoicesError = $state<string | null>(null);

	$effect(() => {
		if (profile?.ls_customer_id || profile?.stripe_customer_id) loadInvoices();
	});

	async function loadInvoices() {
		if (invoicesLoaded) return;
		invoicesLoading = true;
		invoicesError = null;
		try {
			const res = await fetch('/api/billing/history');
			const body = await res.json();
			if (body.error) { invoicesError = body.error; } else {
				invoices = body.invoices ?? [];
				cancellations = body.cancellations ?? [];
			}
		} catch { invoicesError = 'Failed to load invoices.'; } finally {
			invoicesLoading = false;
			invoicesLoaded = true;
		}
	}

	function formatCurrency(amount: number, currency: string) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
	}

	function formatDate(ts: number) {
		return new Date(ts * 1000).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
	}

	function formatCreditDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	const sourceLabel: Record<string, string> = {
		subscription: 'Plan activated',
		subscription_renewal: 'Plan renewal',
		word_pack: 'Word pack',
		admin_credit: 'Admin credit',
		admin_debit: 'Admin removed'
	};

	// ── Word Balance History pagination ──────────────────────────────────────────
	const WC_PREVIEW = 5;
	const WC_PAGE_SIZE = 10;
	let wcExpanded = $state(false);
	let wcPage = $state(1);
	let wcFilter = $state('all');
	let wcSort = $state<'desc' | 'asc'>('desc');

	const wcFiltered = $derived.by(() => {
		const list = wcFilter === 'all'
			? [...data.wordCredits]
			: data.wordCredits.filter(c => c.source === wcFilter);
		return list.sort((a, b) => {
			const d = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			return wcSort === 'desc' ? d : -d;
		});
	});
	const wcPageCount = $derived(Math.max(1, Math.ceil(wcFiltered.length / WC_PAGE_SIZE)));
	const wcVisible = $derived(wcFiltered.slice((wcPage - 1) * WC_PAGE_SIZE, wcPage * WC_PAGE_SIZE));

	// ── Billing History pagination ────────────────────────────────────────────
	const BH_PREVIEW = 5;
	const BH_PAGE_SIZE = 10;
	let bhExpanded = $state(false);
	let bhPage = $state(1);
	let bhSort = $state<'desc' | 'asc'>('desc');

	const bhSorted = $derived.by(() => {
		return [...timeline].sort((a, b) => {
			const ta = a.kind === 'invoice' ? a.created : (a.canceled_at ?? 0);
			const tb = b.kind === 'invoice' ? b.created : (b.canceled_at ?? 0);
			return bhSort === 'desc' ? tb - ta : ta - tb;
		});
	});
	const bhPageCount = $derived(Math.max(1, Math.ceil(bhSorted.length / BH_PAGE_SIZE)));
	const bhVisible = $derived(bhSorted.slice((bhPage - 1) * BH_PAGE_SIZE, bhPage * BH_PAGE_SIZE));

	let deleteConfirm = $state('');
	let deleteLoading = $state(false);
	let deleteError = $state('');
	let showDeleteModal = $state(false);

	$effect(() => {
		if (profile?.full_name && !fullName) {
			fullName = profile.full_name;
		}
	});

	function inputFocus(e: FocusEvent) {
		const el = e.currentTarget as HTMLInputElement;
		el.style.borderColor = 'var(--color-brand)';
		el.style.boxShadow = '0 0 0 3px var(--color-accent-glow)';
	}

	function inputBlur(e: FocusEvent) {
		const el = e.currentTarget as HTMLInputElement;
		el.style.borderColor = 'var(--color-bg-border)';
		el.style.boxShadow = 'none';
	}

	async function updateProfile(e: Event) {
		e.preventDefault();
		profileError = '';
		profileSuccess = false;
		profileLoading = true;

		const { error } = await supabase
			.from('profiles')
			.update({ full_name: fullName })
			.eq('id', user!.id);

		if (error) {
			profileError = error.message;
		} else {
			profileSuccess = true;
			invalidate('supabase:auth');
			setTimeout(() => (profileSuccess = false), 3000);
		}

		profileLoading = false;
	}

	async function openBillingPortal() {
		billingLoading = true;
		try {
			const res = await fetch('/api/billing/portal', { method: 'POST' });
			const json = await res.json();
			if (json.url) {
				window.location.href = json.url;
			} else {
				alert(json.error ?? 'Could not open billing portal. Please try again.');
			}
		} catch {
			alert('Failed to reach billing portal.');
		} finally {
			billingLoading = false;
		}
	}

	async function deleteAccount() {
		if (deleteConfirm !== user?.email) {
			deleteError = 'Email does not match.';
			return;
		}

		deleteLoading = true;
		deleteError = '';

		try {
			const res = await fetch('/api/account/delete', { method: 'DELETE' });
			if (!res.ok) {
				const json = await res.json();
				deleteError = json.error ?? 'Failed to delete account.';
				deleteLoading = false;
				return;
			}
			await supabase.auth.signOut();
			window.location.href = '/';
		} catch {
			deleteError = 'An unexpected error occurred.';
			deleteLoading = false;
		}
	}

	let subscription = $derived(data.subscription);
	let wordPacks = $derived(data.wordPacks);
	let wordsBalance = $derived(profile?.words_balance ?? 0);
	let wordBuyLoading = $state<string | null>(null);

	async function buyWordPack(variantId: string) {
		wordBuyLoading = variantId;
		try {
			const res = await fetch('/api/lemonsqueezy/tokens', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ variantId })
			});
			const json = await res.json();
			if (json.url) {
				window.location.href = json.url;
			} else {
				alert(json.error ?? 'Could not start purchase. Please try again.');
			}
		} catch {
			alert('Failed to reach payment service.');
		} finally {
			wordBuyLoading = null;
		}
	}

	const isPaidPlan = $derived(
		profile?.plan === 'basic' || profile?.plan === 'pro' || profile?.plan === 'ultra'
	);
	const planLabel = $derived(() => {
		switch (profile?.plan) {
			case 'basic': return 'Basic';
			case 'pro': return 'Pro';
			case 'ultra': return 'Ultra';
			default: return 'Free';
		}
	});

	const planDescription = $derived(() => {
		switch (profile?.plan) {
			case 'basic': return '4,500 words per month · Unlimited detections.';
			case 'pro': return '12,000 words per month · Unlimited detections.';
			case 'ultra': return '35,000 words per month · Unlimited detections.';
			default: return 'No active plan · Upgrade to humanize AI text.';
		}
	});

	const cancelDate = $derived(
		subscription?.cancel_at_period_end && subscription?.current_period_end
			? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
					year: 'numeric', month: 'long', day: 'numeric'
				})
			: null
	);

	// Word limit for progress bar
	const PLAN_WORD_LIMITS: Record<string, number> = { basic: 4500, pro: 12000, ultra: 35000 };
	const wordLimit = $derived(PLAN_WORD_LIMITS[profile?.plan ?? ''] ?? 0);
	const wordUsedPct = $derived(
		wordLimit <= 0 ? 0 :
		Math.min(100, ((wordLimit - wordsBalance) / wordLimit) * 100)
	);
</script>

<div class="max-w-3xl mx-auto px-6 py-10 space-y-8">
	<div>
		<h1
			class="text-2xl font-semibold"
			style="font-family: 'Instrument Serif', Georgia, serif; color: var(--color-text-primary)"
		>
			Settings
		</h1>
		<p class="mt-1 text-sm" style="color: var(--color-text-secondary)">
			Manage your account preferences and billing.
		</p>
	</div>

	<!-- Profile section -->
	<section
		class="rounded-xl border p-6"
		style="background: var(--color-bg-surface); border-color: var(--color-bg-border)"
	>
		<h2 class="text-base font-semibold mb-4" style="color: var(--color-text-primary)">Profile</h2>

		{#if profileSuccess}
			<div class="mb-4 px-4 py-3 rounded-lg text-sm border" style="background: #22c55e15; border-color: #22c55e40; color: #22c55e">
				Profile updated successfully.
			</div>
		{/if}

		{#if profileError}
			<div class="mb-4 px-4 py-3 rounded-lg text-sm border" style="background: #ef444415; border-color: #ef444440; color: #ef4444">
				{profileError}
			</div>
		{/if}

		<form onsubmit={updateProfile} class="space-y-4">
			<div>
				<label class="block text-sm font-medium mb-1.5" style="color: var(--color-text-secondary)" for="fullName">Full Name</label>
				<input
					id="fullName"
					type="text"
					bind:value={fullName}
					placeholder="Your full name"
					onfocus={inputFocus}
					onblur={inputBlur}
					class="settings-input w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
					style="background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-primary);"
				/>
			</div>

			<div>
				<label class="block text-sm font-medium mb-1.5" style="color: var(--color-text-secondary)" for="email-display">Email</label>
				<input
					id="email-display"
					type="email"
					value={user?.email ?? ''}
					readonly
					class="w-full px-3.5 py-2.5 rounded-lg text-sm cursor-not-allowed"
					style="background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-muted); opacity: 0.7;"
				/>
				<p class="mt-1 text-xs" style="color: var(--color-text-muted)">Email cannot be changed here. Contact support if needed.</p>
			</div>

			<div class="flex justify-end">
				<button type="submit" disabled={profileLoading} class="btn-brand px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed">
					{profileLoading ? 'Saving…' : 'Save changes'}
				</button>
			</div>
		</form>
	</section>

	<!-- Billing section -->
	<section class="rounded-xl border p-6" style="background: var(--color-bg-surface); border-color: var(--color-bg-border)">
		<h2 class="text-base font-semibold mb-1" style="color: var(--color-text-primary)">Billing</h2>
		<p class="text-sm mb-5" style="color: var(--color-text-secondary)">Manage your subscription and payment details.</p>

		<div class="flex items-center justify-between p-4 rounded-lg mb-5" style="background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border)">
			<div>
				<div class="flex items-center gap-2 mb-0.5">
					<span class="text-sm font-semibold" style="color: var(--color-text-primary)">{planLabel()} Plan</span>
					{#if isPaidPlan}
						<span class="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={cancelDate ? 'background: #f59e0b20; color: #f59e0b' : 'background: var(--color-brand-muted); color: var(--color-brand)'}>
							{cancelDate ? 'Cancelling' : 'Active'}
						</span>
					{/if}
				</div>
				<p class="text-xs" style="color: var(--color-text-muted)">{planDescription()}</p>
				{#if cancelDate}
					<p class="text-xs mt-1" style="color: #f59e0b">Cancels on {cancelDate}</p>
				{/if}
			</div>

			{#if subscription}
				<button onclick={openBillingPortal} disabled={billingLoading} class="btn-outline shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-60 disabled:cursor-not-allowed">
					{billingLoading ? 'Opening…' : 'Manage Billing'}
				</button>
			{:else}
				<a href="/plans" class="btn-brand shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold">Upgrade</a>
			{/if}
		</div>

		{#if isPaidPlan}
			<!-- Words balance -->
			<div class="mb-5">
				<div class="flex items-center justify-between mb-1.5">
					<span class="text-sm font-medium" style="color: var(--color-text-secondary)">Words remaining</span>
					<span class="text-sm font-semibold" style="color: {wordsBalance === 0 ? '#ef4444' : wordsBalance <= wordLimit * 0.2 ? '#f59e0b' : 'var(--color-brand)'}">
						{wordsBalance.toLocaleString()} / {wordLimit.toLocaleString()}
					</span>
				</div>
				<div class="w-full h-2 rounded-full" style="background: var(--color-bg-elevated)">
					<div class="h-2 rounded-full transition-all" style="width: {Math.min(100, Math.max(0, 100 - wordUsedPct))}%; background: {wordsBalance === 0 ? '#ef4444' : wordsBalance <= wordLimit * 0.2 ? '#f59e0b' : 'var(--color-brand)'}"></div>
				</div>
				<p class="mt-1 text-xs" style="color: var(--color-text-muted)">Resets monthly with your plan.</p>
			</div>

			<!-- Word packs -->
			<div>
				<p class="text-xs font-medium mb-2" style="color: var(--color-text-secondary)">
					{wordsBalance === 0 ? 'Out of words — buy more to continue:' : 'Top up your word balance:'}
				</p>
				<div class="grid grid-cols-3 gap-2">
					{#each wordPacks as pack}
						<button
							onclick={() => buyWordPack(pack.variantId)}
							disabled={wordBuyLoading !== null}
							class="flex flex-col items-center p-3 rounded-lg border transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
							style="background: var(--color-bg-elevated); border-color: var(--color-bg-border)"
						>
							<span class="text-sm font-bold" style="color: var(--color-text-primary)">
								{wordBuyLoading === pack.variantId ? '…' : `+${(pack.words / 1000).toFixed(0)}K`}
							</span>
							<span class="text-[10px] mt-0.5" style="color: var(--color-text-muted)">words</span>
							<span class="text-xs font-semibold mt-1" style="color: var(--color-brand)">${pack.price}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</section>

	<!-- Word balance history -->
	{#if data.wordCredits.length > 0}
	{@const wcPreview = data.wordCredits.slice(0, WC_PREVIEW)}
	<section class="rounded-xl border p-6" style="background: var(--color-bg-surface); border-color: var(--color-bg-border)">
		<div class="flex items-center justify-between mb-1">
			<h2 class="text-base font-semibold" style="color: var(--color-text-primary)">Word Balance History</h2>
			{#if data.wordCredits.length > WC_PREVIEW}
				<button
					onclick={() => { wcExpanded = !wcExpanded; wcPage = 1; }}
					class="text-xs font-semibold"
					style="background: none; border: none; cursor: pointer; color: var(--color-brand);"
				>{wcExpanded ? 'Show less ↑' : `Show all (${data.wordCredits.length}) ↓`}</button>
			{/if}
		</div>
		<p class="text-sm mb-4" style="color: var(--color-text-secondary)">All changes to your word balance.</p>

		{#if wcExpanded}
			<!-- Filter + sort controls -->
			<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;">
				<select
					bind:value={wcFilter}
					onchange={() => (wcPage = 1)}
					style="padding: 6px 10px; border-radius: 7px; font-size: 12px; font-family: 'Space Grotesk', system-ui; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-primary); cursor: pointer; outline: none;"
				>
					<option value="all">All sources</option>
					<option value="subscription">Plan activation</option>
					<option value="subscription_renewal">Renewal</option>
					<option value="word_pack">Word pack</option>
					<option value="admin_credit">Admin</option>
				</select>
				<button
					onclick={() => { wcSort = wcSort === 'desc' ? 'asc' : 'desc'; wcPage = 1; }}
					style="padding: 6px 12px; border-radius: 7px; font-size: 12px; font-family: 'Space Grotesk', system-ui; font-weight: 600; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); cursor: pointer;"
				>{wcSort === 'desc' ? '↓ Newest first' : '↑ Oldest first'}</button>
				<span style="font-size: 12px; color: var(--color-text-muted); margin-left: auto;">{wcFiltered.length} records</span>
			</div>
			<!-- Full table -->
			<div class="space-y-2">
				{#each wcVisible as credit}
					<div class="flex items-center justify-between px-4 py-3 rounded-lg" style="background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border)">
						<div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
							<span style="font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; flex-shrink: 0; background: {credit.source === 'admin_credit' ? '#7c3aed20' : credit.source === 'word_pack' ? '#3b82f620' : 'var(--color-brand-muted)'}; color: {credit.source === 'admin_credit' ? '#7c3aed' : credit.source === 'word_pack' ? '#3b82f6' : 'var(--color-brand)'};">{sourceLabel[credit.source] ?? credit.source}</span>
							<span class="text-sm" style="color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{credit.description ?? ''}</span>
						</div>
						<div style="display: flex; align-items: center; gap: 16px; flex-shrink: 0;">
							<span class="text-sm font-semibold" style="color: {credit.amount >= 0 ? 'var(--color-brand)' : '#dc2626'}; font-family: 'JetBrains Mono', monospace;">{credit.amount >= 0 ? '+' : ''}{credit.amount.toLocaleString()} words</span>
							<span class="text-xs" style="color: var(--color-text-muted); min-width: 80px; text-align: right;">{formatCreditDate(credit.created_at)}</span>
						</div>
					</div>
				{/each}
			</div>
			<!-- Pagination -->
			{#if wcPageCount > 1}
				<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 14px;">
					<button
						onclick={() => wcPage--}
						disabled={wcPage === 1}
						style="padding: 6px 14px; border-radius: 7px; font-size: 12px; font-weight: 600; font-family: 'Space Grotesk', system-ui; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); cursor: pointer; opacity: {wcPage === 1 ? 0.4 : 1};"
					>← Prev</button>
					<span style="font-size: 12px; color: var(--color-text-muted);">Page {wcPage} of {wcPageCount}</span>
					<button
						onclick={() => wcPage++}
						disabled={wcPage === wcPageCount}
						style="padding: 6px 14px; border-radius: 7px; font-size: 12px; font-weight: 600; font-family: 'Space Grotesk', system-ui; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); cursor: pointer; opacity: {wcPage === wcPageCount ? 0.4 : 1};"
					>Next →</button>
				</div>
			{/if}
		{:else}
			<!-- Preview: top 5 -->
			<div class="space-y-2">
				{#each wcPreview as credit}
					<div class="flex items-center justify-between px-4 py-3 rounded-lg" style="background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border)">
						<div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
							<span style="font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; flex-shrink: 0; background: {credit.source === 'admin_credit' ? '#7c3aed20' : credit.source === 'word_pack' ? '#3b82f620' : 'var(--color-brand-muted)'}; color: {credit.source === 'admin_credit' ? '#7c3aed' : credit.source === 'word_pack' ? '#3b82f6' : 'var(--color-brand)'};">{sourceLabel[credit.source] ?? credit.source}</span>
							<span class="text-sm" style="color: var(--color-text-secondary);">{credit.description ?? ''}</span>
						</div>
						<div style="display: flex; align-items: center; gap: 16px; flex-shrink: 0;">
							<span class="text-sm font-semibold" style="color: {credit.amount >= 0 ? 'var(--color-brand)' : '#dc2626'}; font-family: 'JetBrains Mono', monospace;">{credit.amount >= 0 ? '+' : ''}{credit.amount.toLocaleString()} words</span>
							<span class="text-xs" style="color: var(--color-text-muted); min-width: 80px; text-align: right;">{formatCreditDate(credit.created_at)}</span>
						</div>
					</div>
				{/each}
			</div>
			{#if data.wordCredits.length > WC_PREVIEW}
				<button
					onclick={() => { wcExpanded = true; wcPage = 1; }}
					style="margin-top: 12px; width: 100%; padding: 8px; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: 'Space Grotesk', system-ui; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); cursor: pointer;"
				>Show all {data.wordCredits.length} records ↓</button>
			{/if}
		{/if}
	</section>
	{/if}

	<!-- Billing history -->
	{#if profile?.ls_customer_id || profile?.stripe_customer_id}
	<section class="rounded-xl border p-6" style="background: var(--color-bg-surface); border-color: var(--color-bg-border)">
		<div class="flex items-center justify-between mb-1">
			<h2 class="text-base font-semibold" style="color: var(--color-text-primary)">Billing History</h2>
			<div style="display: flex; align-items: center; gap: 10px;">
				{#if invoicesLoading}
					<span class="text-xs" style="color: var(--color-text-muted);">Loading…</span>
				{/if}
				{#if invoicesLoaded && bhSorted.length > BH_PREVIEW}
					<button
						onclick={() => { bhExpanded = !bhExpanded; bhPage = 1; }}
						class="text-xs font-semibold"
						style="background: none; border: none; cursor: pointer; color: var(--color-brand);"
					>{bhExpanded ? 'Show less ↑' : `Show all (${bhSorted.length}) ↓`}</button>
				{/if}
			</div>
		</div>
		<p class="text-sm mb-4" style="color: var(--color-text-secondary)">Recent charges and payments.</p>

		{#if invoicesError}
			<p class="text-sm" style="color: #ef4444">{invoicesError}</p>
		{:else if invoicesLoaded && invoices.length === 0 && cancellations.length === 0}
			<p class="text-sm" style="color: var(--color-text-muted)">No billing history found.</p>
		{:else if invoicesLoaded}
			{#snippet billingEntry(entry: typeof bhSorted[number], isLast: boolean)}
				{@const dotColor = entry.kind === 'cancellation' ? '#dc2626' : (entry.status === 'paid' ? '#16a34a' : '#d97806')}
				<div style="display: flex; gap: 16px; align-items: flex-start;">
					<!-- Spine -->
					<div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 16px;">
						<div style="width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; background: {dotColor}; border: 2px solid var(--color-bg-surface); box-shadow: 0 0 0 1px {dotColor};"></div>
						{#if !isLast}
							<div style="width: 1px; flex: 1; min-height: 28px; background: var(--color-bg-border); margin-top: 4px;"></div>
						{/if}
					</div>
					<!-- Content -->
					<div style="flex: 1; padding-bottom: {isLast ? '0' : '16px'};">
						<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
							<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
								{#if entry.kind === 'cancellation'}
									<span style="font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; background: #dc262618; color: #dc2626;">Cancelled</span>
									<span class="text-sm" style="color: var(--color-text-primary);">Subscription cancelled</span>
								{:else}
									<span style="font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; background: {entry.status === 'paid' ? '#16a34a18' : '#d9780618'}; color: {entry.status === 'paid' ? '#16a34a' : '#d97806'};">{entry.status === 'paid' ? 'Paid' : (entry.status ?? 'Unknown')}</span>
									<span class="text-sm" style="color: var(--color-text-primary);">{entry.description ?? entry.number ?? entry.billing_reason ?? 'Invoice'}</span>
								{/if}
							</div>
							{#if entry.kind === 'invoice'}
								<div style="display: flex; align-items: center; gap: 10px; flex-shrink: 0;">
									<span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; color: {entry.status === 'paid' ? '#16a34a' : 'var(--color-text-primary)'};">{formatCurrency(entry.amount_paid, entry.currency)}</span>
									{#if entry.hosted_invoice_url}
										<a href={entry.hosted_invoice_url} target="_blank" rel="noopener noreferrer" style="font-size: 11px; font-weight: 600; font-family: 'Space Grotesk', system-ui; color: var(--color-brand); text-decoration: none; padding: 2px 8px; border: 1px solid var(--color-brand); border-radius: 4px;">Receipt</a>
									{/if}
								</div>
							{/if}
						</div>
						<p class="text-xs" style="color: var(--color-text-muted); margin: 3px 0 0;">
							{entry.kind === 'cancellation' ? (entry.canceled_at ? formatDate(entry.canceled_at) : '—') : formatDate(entry.created)}
						</p>
					</div>
				</div>
			{/snippet}

			{#if bhExpanded}
				<!-- Sort control -->
				<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
					<button
						onclick={() => { bhSort = bhSort === 'desc' ? 'asc' : 'desc'; bhPage = 1; }}
						style="padding: 6px 12px; border-radius: 7px; font-size: 12px; font-family: 'Space Grotesk', system-ui; font-weight: 600; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); cursor: pointer;"
					>{bhSort === 'desc' ? '↓ Newest first' : '↑ Oldest first'}</button>
					<span style="font-size: 12px; color: var(--color-text-muted); margin-left: auto;">{bhSorted.length} records</span>
				</div>
				<div>
					{#each bhVisible as entry, i}
						{@render billingEntry(entry, i === bhVisible.length - 1)}
					{/each}
				</div>
				{#if bhPageCount > 1}
					<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 14px;">
						<button
							onclick={() => bhPage--}
							disabled={bhPage === 1}
							style="padding: 6px 14px; border-radius: 7px; font-size: 12px; font-weight: 600; font-family: 'Space Grotesk', system-ui; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); cursor: pointer; opacity: {bhPage === 1 ? 0.4 : 1};"
						>← Prev</button>
						<span style="font-size: 12px; color: var(--color-text-muted);">Page {bhPage} of {bhPageCount}</span>
						<button
							onclick={() => bhPage++}
							disabled={bhPage === bhPageCount}
							style="padding: 6px 14px; border-radius: 7px; font-size: 12px; font-weight: 600; font-family: 'Space Grotesk', system-ui; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); cursor: pointer; opacity: {bhPage === bhPageCount ? 0.4 : 1};"
						>Next →</button>
					</div>
				{/if}
			{:else}
				<!-- Preview: top 5 -->
				<div>
					{#each bhSorted.slice(0, BH_PREVIEW) as entry, i}
						{@render billingEntry(entry, i === Math.min(BH_PREVIEW, bhSorted.length) - 1)}
					{/each}
				</div>
				{#if bhSorted.length > BH_PREVIEW}
					<button
						onclick={() => { bhExpanded = true; bhPage = 1; }}
						style="margin-top: 12px; width: 100%; padding: 8px; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: 'Space Grotesk', system-ui; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); color: var(--color-text-secondary); cursor: pointer;"
					>Show all {bhSorted.length} records ↓</button>
				{/if}
			{/if}
		{/if}
	</section>
	{/if}

	<!-- Danger zone -->
	<section class="rounded-xl border p-6" style="border-color: #ef444430; background: var(--color-bg-surface)">
		<h2 class="text-base font-semibold mb-1" style="color: #ef4444">Danger Zone</h2>
		<p class="text-sm mb-5" style="color: var(--color-text-secondary)">
			Permanently delete your account and all associated data. This action cannot be undone.
		</p>

		<button onclick={() => (showDeleteModal = true)} class="btn-danger px-4 py-2 rounded-lg text-sm font-medium border transition-all">
			Delete account
		</button>
	</section>
</div>

<!-- Delete account modal -->
{#if showDeleteModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.7)" role="dialog" aria-modal="true">
		<div class="w-full max-w-md rounded-2xl border p-6" style="background: var(--color-bg-surface); border-color: var(--color-bg-border)">
			<h3 class="text-lg font-semibold mb-2" style="color: var(--color-text-primary)">Delete your account?</h3>
			<p class="text-sm mb-5" style="color: var(--color-text-secondary)">
				This will permanently delete your account, all detections, humanizations, and usage history. Type your email address to confirm.
			</p>

			{#if deleteError}
				<div class="mb-4 px-4 py-3 rounded-lg text-sm border" style="background: #ef444415; border-color: #ef444440; color: #ef4444">
					{deleteError}
				</div>
			{/if}

			<input
				type="email"
				bind:value={deleteConfirm}
				placeholder={user?.email ?? 'your@email.com'}
				class="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none mb-5"
				style="background: var(--color-bg-elevated); border: 1px solid #ef444440; color: var(--color-text-primary);"
			/>

			<div class="flex gap-3">
				<button onclick={() => { showDeleteModal = false; deleteConfirm = ''; deleteError = ''; }} class="btn-outline flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all">
					Cancel
				</button>
				<button onclick={deleteAccount} disabled={deleteLoading || deleteConfirm !== user?.email} class="btn-delete flex-1 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed">
					{deleteLoading ? 'Deleting…' : 'Yes, delete my account'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.btn-brand { background: var(--color-brand); color: white; }
	.btn-brand:hover:not(:disabled) { background: var(--color-brand-hover); }

	.btn-outline { background: transparent; border-color: var(--color-bg-border); color: var(--color-text-secondary); }
	.btn-outline:hover:not(:disabled) { background: var(--color-bg-elevated); color: var(--color-text-primary); }

	.btn-danger { background: transparent; border: 1px solid #ef444440; color: #ef4444; }
	.btn-danger:hover { background: #ef444415; }

	.btn-delete { background: #ef4444; color: white; }
	.btn-delete:hover:not(:disabled) { background: #dc2626; }
</style>
