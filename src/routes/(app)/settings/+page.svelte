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
	let tokenPacks = $derived(data.tokenPacks);
	let tokens = $derived(profile?.tokens ?? 0);
	let tokenBuyLoading = $state<string | null>(null);

	async function buyTokenPack(priceId: string) {
		tokenBuyLoading = priceId;
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
			tokenBuyLoading = null;
		}
	}

	let planLabel = $derived(
		profile?.plan === 'pro' ? 'Pro' : 'Free'
	);

	let planDescription = $derived(
		profile?.plan === 'pro'
			? 'Unlimited detections and humanizations per day.'
			: '3 free detections total · 500 words per scan.'
	);

	let cancelDate = $derived(
		subscription?.cancel_at_period_end && subscription?.current_period_end
			? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
					year: 'numeric', month: 'long', day: 'numeric'
				})
			: null
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
			<div
				class="mb-4 px-4 py-3 rounded-lg text-sm border"
				style="background: #22c55e15; border-color: #22c55e40; color: #22c55e"
			>
				Profile updated successfully.
			</div>
		{/if}

		{#if profileError}
			<div
				class="mb-4 px-4 py-3 rounded-lg text-sm border"
				style="background: #ef444415; border-color: #ef444440; color: #ef4444"
			>
				{profileError}
			</div>
		{/if}

		<form onsubmit={updateProfile} class="space-y-4">
			<div>
				<label
					class="block text-sm font-medium mb-1.5"
					style="color: var(--color-text-secondary)"
					for="fullName"
				>
					Full Name
				</label>
				<input
					id="fullName"
					type="text"
					bind:value={fullName}
					placeholder="Your full name"
					onfocus={inputFocus}
					onblur={inputBlur}
					class="settings-input w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
					style="
						background: var(--color-bg-elevated);
						border: 1px solid var(--color-bg-border);
						color: var(--color-text-primary);
					"
				/>
			</div>

			<div>
				<label
					class="block text-sm font-medium mb-1.5"
					style="color: var(--color-text-secondary)"
					for="email-display"
				>
					Email
				</label>
				<input
					id="email-display"
					type="email"
					value={user?.email ?? ''}
					readonly
					class="w-full px-3.5 py-2.5 rounded-lg text-sm cursor-not-allowed"
					style="
						background: var(--color-bg-elevated);
						border: 1px solid var(--color-bg-border);
						color: var(--color-text-muted);
						opacity: 0.7;
					"
				/>
				<p class="mt-1 text-xs" style="color: var(--color-text-muted)">
					Email cannot be changed here. Contact support if needed.
				</p>
			</div>

			<div class="flex justify-end">
				<button
					type="submit"
					disabled={profileLoading}
					class="btn-brand px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
				>
					{#if profileLoading}
						Saving…
					{:else}
						Save changes
					{/if}
				</button>
			</div>
		</form>
	</section>

	<!-- Billing section -->
	<section
		class="rounded-xl border p-6"
		style="background: var(--color-bg-surface); border-color: var(--color-bg-border)"
	>
		<h2 class="text-base font-semibold mb-1" style="color: var(--color-text-primary)">Billing</h2>
		<p class="text-sm mb-5" style="color: var(--color-text-secondary)">
			Manage your subscription and payment details.
		</p>

		<div
			class="flex items-center justify-between p-4 rounded-lg mb-5"
			style="background: var(--color-bg-elevated); border: 1px solid var(--color-bg-border)"
		>
			<div>
				<div class="flex items-center gap-2 mb-0.5">
					<span class="text-sm font-semibold" style="color: var(--color-text-primary)">
						{planLabel} Plan
					</span>
					{#if profile?.plan !== 'free'}
						<span
							class="text-[10px] font-semibold px-1.5 py-0.5 rounded"
							style={cancelDate
								? 'background: #f59e0b20; color: #f59e0b'
								: 'background: var(--color-brand-muted); color: var(--color-brand)'}
						>
							{cancelDate ? 'Cancelling' : 'Active'}
						</span>
					{/if}
				</div>
				<p class="text-xs" style="color: var(--color-text-muted)">{planDescription}</p>
				{#if cancelDate}
					<p class="text-xs mt-1" style="color: #f59e0b">
						Cancels on {cancelDate}
					</p>
				{/if}
			</div>

			{#if profile?.plan === 'free'}
				<a href="/pricing" class="btn-brand shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold">
					Upgrade
				</a>
			{:else}
				<button
					onclick={openBillingPortal}
					disabled={billingLoading}
					class="btn-outline shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-60 disabled:cursor-not-allowed"
				>
					{#if billingLoading}
						Opening…
					{:else}
						Manage Billing
					{/if}
				</button>
			{/if}
		</div>

		{#if profile?.plan === 'pro'}
			<!-- Credits balance -->
			<div class="mb-4">
				<div class="flex items-center justify-between mb-1.5">
					<span class="text-sm font-medium" style="color: var(--color-text-secondary)">
						Credits remaining
					</span>
					<span
						class="text-sm font-semibold"
						style="color: {tokens === 0 ? '#ef4444' : tokens <= 20 ? '#f59e0b' : 'var(--color-brand)'}"
					>
						{tokens} / 100
					</span>
				</div>
				<div class="w-full h-2 rounded-full" style="background: var(--color-bg-elevated)">
					<div
						class="h-2 rounded-full transition-all"
						style="width: {Math.min(100, (tokens / 100) * 100)}%; background: {tokens === 0 ? '#ef4444' : tokens <= 20 ? '#f59e0b' : 'var(--color-brand)'}"
					></div>
				</div>
				<p class="mt-1 text-xs" style="color: var(--color-text-muted)">
					Resets monthly with your Pro plan. 1 credit = 1 humanization.
				</p>
			</div>

			<!-- Credit packs -->
			{#if tokens <= 20}
				<div>
					<p class="text-xs font-medium mb-2" style="color: var(--color-text-secondary)">
						{tokens === 0 ? 'Out of credits — buy more to continue humanizing:' : 'Running low — top up your credits:'}
					</p>
					<div class="grid grid-cols-3 gap-2">
						{#each tokenPacks as pack}
							<button
								onclick={() => buyTokenPack(pack.priceId)}
								disabled={tokenBuyLoading !== null}
								class="flex flex-col items-center p-3 rounded-lg border transition-all disabled:opacity-60 disabled:cursor-not-allowed"
								style="background: var(--color-bg-elevated); border-color: var(--color-bg-border)"
							>
								<span class="text-sm font-bold" style="color: var(--color-text-primary)">
									{#if tokenBuyLoading === pack.priceId}…{:else}+{pack.tokens}{/if}
								</span>
								<span class="text-[10px] mt-0.5" style="color: var(--color-text-muted)">credits</span>
								<span class="text-xs font-semibold mt-1" style="color: var(--color-brand)">${pack.price}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</section>

	<!-- Danger zone -->
	<section
		class="rounded-xl border p-6"
		style="border-color: #ef444430; background: var(--color-bg-surface)"
	>
		<h2 class="text-base font-semibold mb-1" style="color: #ef4444">Danger Zone</h2>
		<p class="text-sm mb-5" style="color: var(--color-text-secondary)">
			Permanently delete your account and all associated data. This action cannot be undone.
		</p>

		<button
			onclick={() => (showDeleteModal = true)}
			class="btn-danger px-4 py-2 rounded-lg text-sm font-medium border transition-all"
		>
			Delete account
		</button>
	</section>
</div>

<!-- Delete account modal -->
{#if showDeleteModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		style="background: rgba(0,0,0,0.7)"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="w-full max-w-md rounded-2xl border p-6"
			style="background: var(--color-bg-surface); border-color: var(--color-bg-border)"
		>
			<h3 class="text-lg font-semibold mb-2" style="color: var(--color-text-primary)">
				Delete your account?
			</h3>
			<p class="text-sm mb-5" style="color: var(--color-text-secondary)">
				This will permanently delete your account, all detections, humanizations, and usage history.
				Type your email address to confirm.
			</p>

			{#if deleteError}
				<div
					class="mb-4 px-4 py-3 rounded-lg text-sm border"
					style="background: #ef444415; border-color: #ef444440; color: #ef4444"
				>
					{deleteError}
				</div>
			{/if}

			<input
				type="email"
				bind:value={deleteConfirm}
				placeholder={user?.email ?? 'your@email.com'}
				class="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none mb-5"
				style="
					background: var(--color-bg-elevated);
					border: 1px solid #ef444440;
					color: var(--color-text-primary);
				"
			/>

			<div class="flex gap-3">
				<button
					onclick={() => {
						showDeleteModal = false;
						deleteConfirm = '';
						deleteError = '';
					}}
					class="btn-outline flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all"
				>
					Cancel
				</button>
				<button
					onclick={deleteAccount}
					disabled={deleteLoading || deleteConfirm !== user?.email}
					class="btn-delete flex-1 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if deleteLoading}
						Deleting…
					{:else}
						Yes, delete my account
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.btn-brand {
		background: var(--color-brand);
		color: white;
	}
	.btn-brand:hover:not(:disabled) {
		background: var(--color-brand-hover);
	}

	.btn-outline {
		background: transparent;
		border-color: var(--color-bg-border);
		color: var(--color-text-secondary);
	}
	.btn-outline:hover:not(:disabled) {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.btn-danger {
		background: transparent;
		border: 1px solid #ef444440;
		color: #ef4444;
	}
	.btn-danger:hover {
		background: #ef444415;
	}

	.btn-delete {
		background: #ef4444;
		color: white;
	}
	.btn-delete:hover:not(:disabled) {
		background: #dc2626;
	}
</style>
