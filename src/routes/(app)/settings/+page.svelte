<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { trackPageVisit, trackBillingPortalClick, trackDeleteAccount, trackWordPackClick } from '$lib/client/analytics';

	onMount(() => trackPageVisit('settings'));

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

	function formatCreditDate(iso: string) {
		const d = new Date(iso);
		const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		return `${date} · ${time}`;
	}

	const sourceLabel: Record<string, string> = {
		subscription: 'Subscription',
		subscription_renewal: 'Renewal',
		word_pack: 'Word Pack',
		admin_credit: 'Admin Credit',
		admin_debit: 'Admin Debit',
		usage: 'Usage'
	};

	function sourceBadgeStyle(source: string, amount: number): { bg: string; color: string } {
		if (amount < 0 || source === 'admin_debit' || source === 'usage') {
			return { bg: '#f59e0b18', color: '#d97706' };
		}
		if (source === 'admin_credit') return { bg: '#7c3aed18', color: '#7c3aed' };
		if (source === 'word_pack') return { bg: '#3b82f618', color: '#3b82f6' };
		return { bg: 'var(--color-brand-muted)', color: 'var(--color-brand)' };
	}

	// Word Balance History
	const WC_PREVIEW = 5;
	let wcExpanded = $state(false);
	const wcVisible = $derived(
		wcExpanded ? data.wordCredits : data.wordCredits.slice(0, WC_PREVIEW)
	);

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
		trackBillingPortalClick();
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
		trackDeleteAccount();

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
		trackWordPackClick(variantId, 'settings');
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

	const planLabel = $derived(
		profile?.plan === 'ultra' ? 'Ultra' :
		profile?.plan === 'pro' ? 'Pro' :
		profile?.plan === 'basic' ? 'Basic' : 'Free'
	);

	const PLAN_MONTHLY_PRICE: Record<string, string> = {
		basic: '$9.99', pro: '$19.99', ultra: '$39.99'
	};

	const cancelDate = $derived(
		subscription?.cancel_at_period_end && subscription?.current_period_end
			? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
					year: 'numeric', month: 'long', day: 'numeric'
				})
			: null
	);

	const nextBillingDate = $derived(
		subscription?.current_period_end && !subscription?.cancel_at_period_end
			? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
					month: 'long', day: 'numeric', year: 'numeric'
				})
			: null
	);

	const PLAN_WORDS: Record<string, string> = { basic: '4,500', pro: '12,000', ultra: '35,000' };
	const PLAN_SUPPORT: Record<string, string> = { basic: 'Email', pro: 'Priority', ultra: 'Priority' };

	const planFeatures = $derived([
		{
			icon: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M13 2v7h7',
			iconColor: '#3b82f6',
			value: PLAN_WORDS[profile?.plan ?? ''] ?? '—',
			label: 'words per month'
		},
		{
			icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
			iconColor: '#10b981',
			value: 'Unlimited',
			label: 'AI detections'
		},
		{
			icon: 'M12 8v4l3 3 M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5',
			iconColor: '#8b5cf6',
			value: 'History',
			label: '& saved results'
		},
		{
			icon: 'M3 18v-6a9 9 0 0 1 18 0v6 M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z',
			iconColor: '#f59e0b',
			value: PLAN_SUPPORT[profile?.plan ?? ''] ?? '—',
			label: 'support'
		}
	]);

	const PLAN_WORD_LIMITS: Record<string, number> = { basic: 4500, pro: 12000, ultra: 35000 };
	const wordLimit = $derived(PLAN_WORD_LIMITS[profile?.plan ?? ''] ?? 0);
	const wordUsedPct = $derived(
		wordLimit <= 0 ? 0 :
		Math.min(100, ((wordLimit - wordsBalance) / wordLimit) * 100)
	);
</script>

<div style="max-width: 720px; margin: 0 auto; padding: 32px 24px 64px; display: flex; flex-direction: column; gap: 20px;">

	<!-- Header -->
	<div>
		<h1 style="font-family: 'Newsreader', Georgia, serif; font-size: 32px; font-weight: 400; color: var(--color-text-primary); margin: 0 0 6px; letter-spacing: -0.02em;">Settings</h1>
		<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0;">Manage your account preferences and billing.</p>
	</div>

	<!-- Profile section -->
	<section class="settings-card">
		<div class="section-header">
			<div class="section-icon" style="background: var(--color-brand-muted);">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
			</div>
			<div>
				<h2 class="section-title">Profile</h2>
				<p class="section-sub">Update your personal information.</p>
			</div>
		</div>

		{#if profileSuccess}
			<div class="alert-success">Profile updated successfully.</div>
		{/if}
		{#if profileError}
			<div class="alert-error">{profileError}</div>
		{/if}

		<form onsubmit={updateProfile} style="display: flex; flex-direction: column; gap: 16px;">
			<div>
				<label class="input-label" for="fullName">Full Name</label>
				<input
					id="fullName"
					type="text"
					bind:value={fullName}
					placeholder="Your full name"
					onfocus={inputFocus}
					onblur={inputBlur}
					class="settings-input"
				/>
			</div>
			<div>
				<label class="input-label" for="email-display">Email</label>
				<input
					id="email-display"
					type="email"
					value={user?.email ?? ''}
					readonly
					class="settings-input settings-input-readonly"
				/>
				<p class="input-note">Email cannot be changed here. Contact support if needed.</p>
			</div>
			<div style="display: flex; justify-content: flex-end;">
				<button type="submit" disabled={profileLoading} class="btn-save">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
					{profileLoading ? 'Saving…' : 'Save changes'}
				</button>
			</div>
		</form>
	</section>

	<!-- Billing section -->
	<section class="settings-card">
		<div class="section-header">
			<div class="section-icon" style="background: var(--color-brand-muted);">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
			</div>
			<div>
				<h2 class="section-title">Billing</h2>
				<p class="section-sub">Manage your subscription and payment details.</p>
			</div>
		</div>

		<!-- Plan row -->
		<div class="plan-row">
			<div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
				<div style="width: 38px; height: 38px; border-radius: 10px; background: var(--color-brand-muted); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
				</div>
				<div style="min-width: 0;">
					<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px; flex-wrap: wrap;">
						<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; font-weight: 700; color: var(--color-text-primary);">{planLabel} Plan</span>
						{#if isPaidPlan}
							<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 99px; {cancelDate ? 'background:#f59e0b18;color:#d97706;' : 'background:var(--color-brand-muted);color:var(--color-brand);'}">{cancelDate ? 'Cancelling' : 'Active'}</span>
						{/if}
					</div>
					{#if nextBillingDate}
						<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; color: var(--color-text-muted); margin: 0 0 1px;">Next billing date: {nextBillingDate}</p>
					{/if}
					{#if isPaidPlan && PLAN_MONTHLY_PRICE[profile?.plan ?? '']}
						<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; color: var(--color-text-muted); margin: 0;">Billed monthly · {PLAN_MONTHLY_PRICE[profile?.plan ?? '']} / month</p>
					{/if}
					{#if cancelDate}
						<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; color: #d97706; margin: 3px 0 0;">Cancels on {cancelDate}</p>
					{/if}
				</div>
			</div>
			{#if subscription}
				<button onclick={openBillingPortal} disabled={billingLoading} class="btn-manage">
					{billingLoading ? 'Opening…' : 'Manage subscription'}
				</button>
			{:else}
				<a href="/plans" class="btn-upgrade">Upgrade plan</a>
			{/if}
		</div>

		{#if isPaidPlan}
			<!-- Plan features grid -->
			<div class="plan-features-grid">
				{#each planFeatures as feature}
					<div class="plan-feature-cell">
						<div style="width: 28px; height: 28px; border-radius: 8px; background: color-mix(in srgb, {feature.iconColor} 12%, transparent); display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="{feature.iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={feature.icon}/></svg>
						</div>
						<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; font-weight: 700; color: var(--color-text-primary);">{feature.value}</span>
						<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; color: var(--color-text-muted); line-height: 1.3;">{feature.label}</span>
					</div>
				{/each}
			</div>

			<!-- Word packs -->
			{#if wordPacks?.length > 0}
				<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-bg-border);">
					<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; font-weight: 600; color: var(--color-text-secondary); margin: 0 0 10px;">
						{wordsBalance === 0 ? 'Out of words — buy more to continue:' : 'Top up your word balance:'}
					</p>
					<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
						{#each wordPacks as pack}
							<button
								onclick={() => buyWordPack(pack.variantId)}
								disabled={wordBuyLoading !== null}
								style="display: flex; flex-direction: column; align-items: center; padding: 12px 8px; border-radius: 10px; background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border); cursor: pointer; transition: border-color 150ms; {wordBuyLoading !== null ? 'opacity:0.6;cursor:not-allowed;' : ''}"
							>
								<span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: var(--color-text-primary);">{wordBuyLoading === pack.variantId ? '…' : `+${(pack.words / 1000).toFixed(0)}K`}</span>
								<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 10px; color: var(--color-text-muted); margin-top: 2px;">words</span>
								<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; font-weight: 700; color: var(--color-brand); margin-top: 4px;">${pack.price}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</section>

	<!-- Word Balance History -->
	{#if data.wordCredits.length > 0}
	<section class="settings-card">
		<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px;">
			<div style="display: flex; align-items: center; gap: 12px;">
				<div class="section-icon" style="background: var(--color-brand-muted);">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
				</div>
				<div>
					<h2 class="section-title">Word Balance History</h2>
					<p class="section-sub">All changes to your word balance.</p>
				</div>
			</div>
			{#if data.wordCredits.length > WC_PREVIEW}
				<button
					onclick={() => (wcExpanded = !wcExpanded)}
					style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; font-weight: 600; color: var(--color-brand); background: none; border: none; cursor: pointer; white-space: nowrap; padding: 0; flex-shrink: 0; margin-top: 2px;"
				>{wcExpanded ? 'Show less ↑' : `Show all (${data.wordCredits.length}) ↓`}</button>
			{/if}
		</div>

		<div>
			{#each wcVisible as credit, i}
				{@const badge = sourceBadgeStyle(credit.source, credit.amount)}
				{@const isLast = i === wcVisible.length - 1}
				<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; {isLast ? '' : 'border-bottom: 1px solid var(--color-bg-border);'}">
					<div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
						<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 3px 8px; border-radius: 5px; flex-shrink: 0; background: {badge.bg}; color: {badge.color};">{sourceLabel[credit.source] ?? credit.source}</span>
						<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{credit.description ?? ''}</span>
					</div>
					<div style="display: flex; align-items: center; gap: 16px; flex-shrink: 0;">
						<span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; color: {credit.amount >= 0 ? 'var(--color-brand)' : '#dc2626'}; white-space: nowrap;">{credit.amount >= 0 ? '+' : ''}{credit.amount.toLocaleString()} words</span>
						<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; color: var(--color-text-muted); white-space: nowrap;">{formatCreditDate(credit.created_at)}</span>
					</div>
				</div>
			{/each}
		</div>
	</section>
	{/if}

	<!-- Danger zone -->
	<section style="border-radius: 14px; border: 1px solid #ef444430; background: var(--color-bg-surface); padding: 24px;">
		<h2 style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; font-weight: 700; color: #ef4444; margin: 0 0 6px;">Danger Zone</h2>
		<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-text-secondary); margin: 0 0 18px;">
			Permanently delete your account and all associated data. This action cannot be undone.
		</p>
		<button
			onclick={() => (showDeleteModal = true)}
			style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px; background: transparent; border: 1px solid #ef444440; color: #ef4444; cursor: pointer; transition: background 120ms;"
		>Delete account</button>
	</section>
</div>

<!-- Delete account modal -->
{#if showDeleteModal}
	<div style="position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.7);" role="dialog" aria-modal="true">
		<div style="width:100%;max-width:440px;border-radius:18px;border:1px solid var(--color-bg-border);padding:24px;background:var(--color-bg-surface);">
			<h3 style="font-family:'Space Grotesk',system-ui;font-size:16px;font-weight:700;color:var(--color-text-primary);margin:0 0 8px;">Delete your account?</h3>
			<p style="font-family:'Space Grotesk',system-ui;font-size:13px;color:var(--color-text-secondary);margin:0 0 20px;">
				This will permanently delete your account, all detections, humanizations, and usage history. Type your email address to confirm.
			</p>

			{#if deleteError}
				<div style="margin-bottom:16px;padding:10px 14px;border-radius:8px;background:#ef444415;border:1px solid #ef444440;font-family:'Space Grotesk',system-ui;font-size:13px;color:#ef4444;">{deleteError}</div>
			{/if}

			<input
				type="email"
				bind:value={deleteConfirm}
				placeholder={user?.email ?? 'your@email.com'}
				style="width:100%;padding:10px 14px;border-radius:8px;font-size:13px;font-family:'Space Grotesk',system-ui;outline:none;margin-bottom:20px;box-sizing:border-box;background:var(--color-bg-elevated);border:1px solid #ef444440;color:var(--color-text-primary);"
			/>

			<div style="display:flex;gap:10px;">
				<button
					onclick={() => { showDeleteModal = false; deleteConfirm = ''; deleteError = ''; }}
					style="flex:1;padding:10px;border-radius:8px;font-family:'Space Grotesk',system-ui;font-size:13px;font-weight:600;background:transparent;border:1px solid var(--color-bg-border);color:var(--color-text-secondary);cursor:pointer;"
				>Cancel</button>
				<button
					onclick={deleteAccount}
					disabled={deleteLoading || deleteConfirm !== user?.email}
					style="flex:1;padding:10px;border-radius:8px;font-family:'Space Grotesk',system-ui;font-size:13px;font-weight:600;background:#ef4444;color:white;border:none;cursor:pointer;opacity:{deleteLoading || deleteConfirm !== user?.email ? 0.5 : 1};"
				>{deleteLoading ? 'Deleting…' : 'Yes, delete my account'}</button>
			</div>
		</div>
	</div>
{/if}

<style>
.settings-card {
	background: var(--color-bg-surface);
	border: 1px solid var(--color-bg-border);
	border-radius: 14px;
	padding: 24px;
}

.section-header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 20px;
	padding-bottom: 16px;
	border-bottom: 1px solid var(--color-bg-border);
}

.section-icon {
	width: 36px;
	height: 36px;
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.section-title {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 14px;
	font-weight: 700;
	color: var(--color-text-primary);
	margin: 0 0 2px;
}

.section-sub {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 12px;
	color: var(--color-text-secondary);
	margin: 0;
}

.settings-input {
	width: 100%;
	padding: 10px 14px;
	border-radius: 9px;
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 13px;
	outline: none;
	transition: border-color 150ms, box-shadow 150ms;
	box-sizing: border-box;
	background: var(--color-bg-elevated);
	border: 1px solid var(--color-bg-border);
	color: var(--color-text-primary);
}

.settings-input-readonly {
	cursor: not-allowed;
	opacity: 0.7;
	color: var(--color-text-muted);
}

.input-label {
	display: block;
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 13px;
	font-weight: 600;
	color: var(--color-text-secondary);
	margin-bottom: 6px;
}

.input-note {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 11px;
	color: var(--color-text-muted);
	margin: 5px 0 0;
}

.alert-success {
	margin-bottom: 14px;
	padding: 10px 14px;
	border-radius: 8px;
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 13px;
	background: #22c55e15;
	border: 1px solid #22c55e40;
	color: #22c55e;
}

.alert-error {
	margin-bottom: 14px;
	padding: 10px 14px;
	border-radius: 8px;
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 13px;
	background: #ef444415;
	border: 1px solid #ef444440;
	color: #ef4444;
}

.btn-save {
	display: inline-flex;
	align-items: center;
	gap: 7px;
	padding: 9px 18px;
	border-radius: 9px;
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 13px;
	font-weight: 700;
	background: var(--color-brand);
	color: white;
	border: none;
	cursor: pointer;
	transition: background 150ms;
}
.btn-save:hover:not(:disabled) { background: var(--color-brand-hover, #059669); }
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

.plan-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 16px;
	border: 1px solid var(--color-bg-border);
	border-radius: 12px;
	margin-bottom: 16px;
	flex-wrap: wrap;
}

.btn-manage {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 13px;
	font-weight: 600;
	padding: 9px 16px;
	border-radius: 9px;
	background: transparent;
	border: 1px solid var(--color-bg-border);
	color: var(--color-text-secondary);
	cursor: pointer;
	white-space: nowrap;
	transition: border-color 120ms, color 120ms;
	flex-shrink: 0;
}
.btn-manage:hover:not(:disabled) { border-color: var(--color-brand); color: var(--color-brand); }
.btn-manage:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-upgrade {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 13px;
	font-weight: 700;
	padding: 9px 16px;
	border-radius: 9px;
	background: var(--color-brand);
	color: white;
	text-decoration: none;
	white-space: nowrap;
	flex-shrink: 0;
	transition: background 150ms;
}
.btn-upgrade:hover { background: var(--color-brand-hover, #059669); }

.plan-features-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 1px;
	background: var(--color-bg-border);
	border: 1px solid var(--color-bg-border);
	border-radius: 10px;
	overflow: hidden;
	margin-bottom: 16px;
}

@media (max-width: 560px) {
	.plan-features-grid { grid-template-columns: repeat(2, 1fr); }
}

.plan-feature-cell {
	background: var(--color-bg-surface);
	padding: 14px 12px;
	display: flex;
	flex-direction: column;
	gap: 2px;
}
</style>
