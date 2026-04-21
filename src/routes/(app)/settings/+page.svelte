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

	// ── Billing history (Stripe invoices) ────────────────────────────────────────
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
		if (profile?.stripe_customer_id) loadInvoices();
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
		admin_credit: 'Admin credit'
	};

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

	async function buyWordPack(priceId: string) {
		wordBuyLoading = priceId;
		try {
			const res = await fetch('/api/stripe/tokens', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ priceId })
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

<div class="max-w-2xl mx-auto px-6 py-10 space-y-8">
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
					<div class="h-2 rounded-full transition-all" style="width: {Math.max(0, 100 - wordUsedPct)}%; background: {wordsBalance === 0 ? '#ef4444' : wordsBalance <= wordLimit * 0.2 ? '#f59e0b' : 'var(--color-brand)'}"></div>
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
							onclick={() => buyWordPack(pack.priceId)}
							disabled={wordBuyLoading !== null}
							class="flex flex-col items-center p-3 rounded-lg border transition-all disabled:opacity-60 disabled:cursor-not-allowed"
							style="background: var(--color-bg-elevated); border-color: var(--color-bg-border)"
						>
							<span class="text-sm font-bold" style="color: var(--color-text-primary)">
								{wordBuyLoading === pack.priceId ? '…' : `+${(pack.words / 1000).toFixed(0)}K`}
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
	<section class="rounded-xl border p-6" style="background: var(--color-bg-surface); border-color: var(--color-bg-border)">
		<h2 class="text-base font-semibold mb-1" style="color: var(--color-text-primary)">Word Balance History</h2>
		<p class="text-sm mb-5" style="color: var(--color-text-secondary)">All credits added to your word balance.</p>
		<div class="space-y-2">
			{#each data.wordCredits as credit}
				<div class="flex items-center justify-between px-4 py-3 rounded-lg" style="background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border)">
					<div style="display: flex; align-items: center; gap: 12px;">
						<span style="
							font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700;
							letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px;
							background: {credit.source === 'admin_credit' ? '#7c3aed20' : credit.source === 'word_pack' ? '#3b82f620' : 'var(--color-brand-muted)'};
							color: {credit.source === 'admin_credit' ? '#7c3aed' : credit.source === 'word_pack' ? '#3b82f6' : 'var(--color-brand)'};
						">{sourceLabel[credit.source] ?? credit.source}</span>
						<span class="text-sm" style="color: var(--color-text-secondary)">{credit.description ?? ''}</span>
					</div>
					<div style="display: flex; align-items: center; gap: 16px; flex-shrink: 0;">
						<span class="text-sm font-semibold" style="color: var(--color-brand); font-family: 'JetBrains Mono', monospace;">+{credit.amount.toLocaleString()} words</span>
						<span class="text-xs" style="color: var(--color-text-muted); min-width: 80px; text-align: right;">{formatCreditDate(credit.created_at)}</span>
					</div>
				</div>
			{/each}
		</div>
	</section>
	{/if}

	<!-- Billing history (Stripe invoices) -->
	{#if profile?.stripe_customer_id}
	<section class="rounded-xl border p-6" style="background: var(--color-bg-surface); border-color: var(--color-bg-border)">
		<div class="flex items-center justify-between mb-1">
			<h2 class="text-base font-semibold" style="color: var(--color-text-primary)">Billing History</h2>
			{#if invoicesLoading}
				<span class="text-xs" style="color: var(--color-text-muted);">Loading…</span>
			{/if}
		</div>
		<p class="text-sm mb-5" style="color: var(--color-text-secondary)">Recent charges from Stripe.</p>

		{#if invoicesError}
			<p class="text-sm" style="color: #ef4444">{invoicesError}</p>
		{:else if invoicesLoaded && invoices.length === 0 && cancellations.length === 0}
			<p class="text-sm" style="color: var(--color-text-muted)">No billing history found.</p>
		{:else if invoicesLoaded}
			<div class="space-y-2">
				{#each timeline as entry}
					{#if entry.kind === 'cancellation'}
						<div class="flex items-center justify-between px-4 py-3 rounded-lg" style="background: #ef444408; border: 1px solid #ef444425;">
							<div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
								<span style="font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; background: #ef444420; color: #ef4444; flex-shrink: 0;">Canceled</span>
								<span class="text-sm" style="color: var(--color-text-secondary)">Subscription canceled</span>
							</div>
							<span class="text-xs" style="color: var(--color-text-muted); flex-shrink: 0; margin-left: 12px;">{entry.canceled_at ? formatDate(entry.canceled_at) : '—'}</span>
						</div>
					{:else}
						<div class="flex items-center justify-between px-4 py-3 rounded-lg" style="background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border)">
							<div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
								<span style="
									font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700;
									letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; flex-shrink: 0;
									background: {entry.status === 'paid' ? '#22c55e20' : '#ef444420'};
									color: {entry.status === 'paid' ? '#22c55e' : '#ef4444'};
								">{entry.status ?? 'unknown'}</span>
								<span class="text-sm" style="color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{entry.description ?? entry.number ?? entry.billing_reason ?? 'Invoice'}</span>
							</div>
							<div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0; margin-left: 12px;">
								<span class="text-sm font-semibold" style="color: var(--color-text-primary); font-family: 'JetBrains Mono', monospace; white-space: nowrap;">{formatCurrency(entry.amount_paid, entry.currency)}</span>
								<span class="text-xs" style="color: var(--color-text-muted); white-space: nowrap;">{formatDate(entry.created)}</span>
								{#if entry.hosted_invoice_url}
									<a href={entry.hosted_invoice_url} target="_blank" rel="noopener noreferrer" class="text-xs font-semibold" style="color: var(--color-brand);">View</a>
								{/if}
							</div>
						</div>
					{/if}
				{/each}
			</div>
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
