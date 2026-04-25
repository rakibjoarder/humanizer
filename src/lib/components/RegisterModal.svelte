<script lang="ts">
	import { onMount } from 'svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import Logo from '$lib/components/Logo.svelte';
	import { openLoginModal } from '$lib/stores/loginModal';

	interface Props {
		supabase: SupabaseClient;
		redirectAfter?: string | null;
		onClose?: () => void;
	}

	let { supabase, redirectAfter = '/humanize', onClose }: Props = $props();

	let fullName = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let agreedToTerms = $state(false);
	let loading = $state(false);
	let googleLoading = $state(false);
	let error = $state('');
	let success = $state(false);

	function dismiss() {
		error = '';
		onClose?.();
	}

	function onBackdropClick(e: MouseEvent) {
		if ((e.target as HTMLElement).dataset?.backdrop === 'true') dismiss();
	}

	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') dismiss();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	async function handleGoogleSignup() {
		googleLoading = true;
		const dest = redirectAfter ?? '/humanize';
		const { error: authError } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(dest)}`
			}
		});
		if (authError) {
			error = authError.message;
			googleLoading = false;
		}
	}

	async function handleRegister(e: Event) {
		e.preventDefault();
		error = '';
		if (password !== confirmPassword) { error = 'Passwords do not match.'; return; }
		if (password.length < 8) { error = 'Password must be at least 8 characters.'; return; }
		if (!agreedToTerms) { error = 'You must agree to the Terms of Service and Privacy Policy.'; return; }
		loading = true;
		const { error: authError } = await supabase.auth.signUp({
			email,
			password,
			options: { data: { full_name: fullName } }
		});
		if (authError) { error = authError.message; loading = false; return; }
		success = true;
		loading = false;
	}

	function goLogin() {
		dismiss();
		openLoginModal(redirectAfter);
	}

	const inputStyle = `
		background: var(--color-bg-elevated);
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		border: none;
		border-radius: 9px;
		padding: 11px 14px;
		color: var(--color-text-primary);
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 14px;
		outline: none;
		width: 100%;
		box-sizing: border-box;
		transition: box-shadow 150ms ease;
	`;

	function onFocus(e: FocusEvent) {
		(e.currentTarget as HTMLInputElement).style.boxShadow =
			'inset 0 0 0 1px var(--color-brand), 0 0 0 3px var(--color-brand-muted)';
	}
	function onBlur(e: FocusEvent) {
		(e.currentTarget as HTMLInputElement).style.boxShadow = 'inset 0 0 0 1px var(--color-bg-border)';
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="reg-backdrop"
	data-backdrop="true"
	onclick={onBackdropClick}
	role="presentation"
>
	<div
		class="reg-dialog"
		role="dialog"
		aria-modal="true"
		aria-labelledby="reg-modal-title"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="reg-header">
			<Logo size={28} onclick={dismiss} />
			<button type="button" class="reg-close" onclick={dismiss} aria-label="Close">×</button>
		</div>

		{#if success}
			<div class="reg-success">
				<div class="reg-success-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-human)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M20 6 9 17l-5-5"/>
					</svg>
				</div>
				<h2 id="reg-modal-title" class="reg-title">Check your email</h2>
				<p class="reg-sub">
					We sent a confirmation link to <strong style="color: var(--color-text-primary);">{email}</strong>. Click it to activate your account.
				</p>
				<button type="button" class="reg-link" style="margin-top: 8px;" onclick={goLogin}>
					Back to sign in →
				</button>
			</div>
		{:else}
			<h2 id="reg-modal-title" class="reg-title">Create an account</h2>
			<p class="reg-sub">Start humanizing AI text for free.</p>

			{#if error}
				<div class="reg-error" role="alert">{error}</div>
			{/if}

			<button
				type="button"
				class="reg-google"
				onclick={handleGoogleSignup}
				disabled={googleLoading}
				aria-busy={googleLoading}
			>
				{#if googleLoading}
					<span class="reg-spinner" aria-hidden="true"></span>
					Connecting…
				{:else}
					<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
						<path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
						<path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
						<path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
						<path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
					</svg>
					Continue with Google
				{/if}
			</button>

			<div class="reg-or">
				<div class="reg-or-line"></div>
				<span class="reg-or-text">OR</span>
				<div class="reg-or-line"></div>
			</div>

			<form onsubmit={handleRegister} class="reg-form">
				<div class="reg-field">
					<label for="reg-name">Full Name</label>
					<input id="reg-name" type="text" bind:value={fullName} placeholder="Jane Smith"
						required autocomplete="name" onfocus={onFocus} onblur={onBlur} style={inputStyle} />
				</div>
				<div class="reg-field">
					<label for="reg-email">Email</label>
					<input id="reg-email" type="email" bind:value={email} placeholder="you@example.com"
						required autocomplete="email" onfocus={onFocus} onblur={onBlur} style={inputStyle} />
				</div>
				<div class="reg-field">
					<label for="reg-password">Password</label>
					<input id="reg-password" type="password" bind:value={password} placeholder="Min. 8 characters"
						required autocomplete="new-password" onfocus={onFocus} onblur={onBlur} style={inputStyle} />
				</div>
				<div class="reg-field">
					<label for="reg-confirm">Confirm Password</label>
					<input id="reg-confirm" type="password" bind:value={confirmPassword} placeholder="Repeat your password"
						required autocomplete="new-password" onfocus={onFocus} onblur={onBlur} style={inputStyle} />
				</div>

				<label class="reg-terms">
					<div class="reg-checkbox-wrap">
						<input type="checkbox" bind:checked={agreedToTerms} style="position:absolute;opacity:0;width:16px;height:16px;cursor:pointer;margin:0;" />
						<div class="reg-checkbox" class:reg-checkbox-checked={agreedToTerms}>
							{#if agreedToTerms}
								<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
							{/if}
						</div>
					</div>
					<span class="reg-terms-text">
						I agree to the
						<a href="/terms" onclick={(e) => { e.stopPropagation(); dismiss(); }}>Terms of Service</a>
						and
						<a href="/privacy" onclick={(e) => { e.stopPropagation(); dismiss(); }}>Privacy Policy</a>
					</span>
				</label>

				<button type="submit" class="reg-submit" disabled={loading} aria-busy={loading}>
					{#if loading}
						<span class="reg-spinner reg-spinner-light" aria-hidden="true"></span>
						Creating account…
					{:else}
						Create account
					{/if}
				</button>
			</form>

			<p class="reg-footer">
				Already have an account?
				<button type="button" class="reg-link" onclick={goLogin}>Sign in</button>
			</p>
		{/if}
	</div>
</div>

<style>
	@keyframes spin { to { transform: rotate(360deg); } }

	.reg-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
	}

	.reg-dialog {
		position: relative;
		width: 100%;
		max-width: 420px;
		max-height: min(92vh, 760px);
		overflow-y: auto;
		background: var(--color-bg-surface);
		border-radius: 16px;
		box-shadow: var(--shadow-modal);
		padding: 22px 22px 20px;
		border: 1px solid var(--color-bg-border);
	}

	.reg-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.reg-close {
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 9px;
		background: var(--color-bg-elevated);
		color: var(--color-text-secondary);
		font-size: 22px;
		line-height: 1;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 120ms ease, color 120ms ease;
	}
	.reg-close:hover {
		background: var(--color-bg-border);
		color: var(--color-text-primary);
	}

	.reg-title {
		font-family: 'Newsreader', Georgia, serif;
		font-size: 1.35rem;
		font-weight: 500;
		color: var(--color-text-primary);
		margin: 0 0 6px;
		letter-spacing: -0.02em;
	}

	.reg-sub {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0 0 18px;
	}

	.reg-error {
		margin-bottom: 16px;
		padding: 11px 14px;
		background: var(--color-ai-muted);
		border-radius: 9px;
		box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.35);
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-ai);
		line-height: 1.5;
	}

	.reg-google {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 11px 16px;
		background: var(--color-bg-elevated);
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		border: none;
		border-radius: 9px;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-primary);
		cursor: pointer;
		transition: background 150ms ease;
		margin-bottom: 20px;
	}
	.reg-google:disabled { opacity: 0.55; cursor: not-allowed; }

	.reg-or {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 20px;
	}
	.reg-or-line { flex: 1; height: 1px; background: var(--color-bg-border); }
	.reg-or-text {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: var(--color-text-dim);
		letter-spacing: 0.08em;
	}

	.reg-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.reg-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.reg-field label {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-secondary);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.reg-terms {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		cursor: pointer;
		user-select: none;
	}

	.reg-checkbox-wrap {
		position: relative;
		margin-top: 2px;
		flex-shrink: 0;
		width: 16px;
		height: 16px;
	}

	.reg-checkbox {
		width: 16px;
		height: 16px;
		border-radius: 4px;
		background: var(--color-bg-elevated);
		box-shadow: inset 0 0 0 1px var(--color-bg-border);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 150ms, box-shadow 150ms;
		pointer-events: none;
	}

	.reg-checkbox-checked {
		background: var(--color-brand) !important;
		box-shadow: inset 0 0 0 1px var(--color-brand) !important;
	}

	.reg-terms-text {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12.5px;
		color: var(--color-text-secondary);
		line-height: 1.5;
	}

	.reg-terms-text a {
		color: var(--color-brand);
		text-decoration: underline;
	}

	.reg-submit {
		width: 100%;
		padding: 12px 16px;
		background: var(--color-brand);
		color: white;
		border: none;
		border-radius: 9px;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
		transition: opacity 150ms ease;
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.15) inset, 0 8px 24px -10px var(--color-brand);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-top: 4px;
	}
	.reg-submit:disabled { opacity: 0.55; cursor: not-allowed; }

	.reg-footer {
		text-align: center;
		margin-top: 18px;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.reg-link {
		background: none;
		border: none;
		padding: 0;
		margin-left: 4px;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		color: var(--color-brand);
		cursor: pointer;
	}
	.reg-link:hover { text-decoration: underline; }

	.reg-success {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 8px 0 4px;
		text-align: center;
	}

	.reg-success-icon {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--color-human-muted);
		box-shadow: inset 0 0 0 1px var(--color-human);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.reg-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--color-bg-border);
		border-top-color: var(--color-brand);
		border-radius: 50%;
		animation: spin 600ms linear infinite;
		display: inline-block;
	}

	.reg-spinner-light {
		width: 14px;
		height: 14px;
		border-color: rgba(255, 255, 255, 0.35);
		border-top-color: #fff;
	}
</style>
