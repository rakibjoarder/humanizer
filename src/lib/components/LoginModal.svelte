<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidate } from '$app/navigation';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import Logo from '$lib/components/Logo.svelte';
	import { openRegisterModal } from '$lib/stores/registerModal';
	import { trackLogin } from '$lib/client/analytics';

	type Variant = 'modal' | 'page';

	interface Props {
		supabase: SupabaseClient;
		/** `modal` = overlay; `page` = full-page layout for /login */
		variant?: Variant;
		/** Path after successful sign-in */
		redirectAfter?: string | null;
		/** Close overlay (modal only) */
		onClose?: () => void;
	}

	let {
		supabase,
		variant = 'modal',
		redirectAfter = '/humanize',
		onClose
	}: Props = $props();

	const isModal = $derived(variant === 'modal');

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let googleLoading = $state(false);
	let error = $state('');

	const safeRedirect = $derived.by(() => {
		const r = redirectAfter?.trim();
		if (!r || !r.startsWith('/') || r.startsWith('//')) return '/';
		return r;
	});

	function dismiss() {
		error = '';
		onClose?.();
	}

	function onBackdropClick(e: MouseEvent) {
		if ((e.target as HTMLElement).dataset?.backdrop === 'true') dismiss();
	}

	onMount(() => {
		if (!isModal) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') dismiss();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	async function handleEmailLogin(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;
		const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
		if (authError) {
			error = authError.message;
			loading = false;
			return;
		}
		trackLogin('email');
		await invalidate('supabase:auth');
		if (isModal) onClose?.();
		window.location.href = safeRedirect;
	}

	async function handleGoogleLogin() {
		googleLoading = true;
		trackLogin('google');
		const dest = safeRedirect;
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

	function goRegister() {
		if (isModal) {
			onClose?.();
			openRegisterModal(safeRedirect);
		} else {
			goto('/register');
		}
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

{#if isModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="login-modal-backdrop"
		data-backdrop="true"
		onclick={onBackdropClick}
		role="presentation"
	>
		<div
			class="login-modal-dialog"
			role="dialog"
			aria-modal="true"
			aria-labelledby="login-modal-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="login-modal-header">
				<Logo size={28} onclick={dismiss} />
				<button type="button" class="login-modal-close" onclick={dismiss} aria-label="Close">×</button>
			</div>
			<h2 id="login-modal-title" class="login-modal-title">Sign in</h2>
			<p class="login-modal-sub">Continue to your account.</p>
			{@render formBody()}
		</div>
	</div>
{:else}
	<div class="login-page-bg" aria-hidden="true"></div>
	<div class="login-page-wrap">
		<div class="login-page-inner">
			<div class="login-page-intro">
				<Logo size={32} onclick={() => goto('/')} />
				<h1 class="login-page-h1">Welcome back.</h1>
				<p class="login-page-sub">Sign in to your account to continue.</p>
			</div>
			<div class="login-page-card">
				{@render formBody()}
			</div>
			<p class="login-page-footer">
				Don't have an account?
				<button type="button" class="login-page-link" onclick={goRegister}>Create an account</button>
			</p>
		</div>
	</div>
{/if}

{#snippet formBody()}
	{#if error}
		<div class="login-error" role="alert">{error}</div>
	{/if}

	<button
		type="button"
		class="login-google"
		onclick={handleGoogleLogin}
		disabled={googleLoading}
		aria-busy={googleLoading}
	>
		{#if googleLoading}
			<span class="login-spinner" aria-hidden="true"></span>
			Connecting…
		{:else}
			<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
				<path
					d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
					fill="#4285F4"
				/>
				<path
					d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
					fill="#34A853"
				/>
				<path
					d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
					fill="#FBBC05"
				/>
				<path
					d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
					fill="#EA4335"
				/>
			</svg>
			Continue with Google
		{/if}
	</button>

	<div class="login-or">
		<div class="login-or-line"></div>
		<span class="login-or-text">OR</span>
		<div class="login-or-line"></div>
	</div>

	<form onsubmit={handleEmailLogin} class="login-form">
		<div class="login-field">
			<label for="login-email-{variant}">Email</label>
			<input
				id="login-email-{variant}"
				type="email"
				bind:value={email}
				placeholder="you@example.com"
				required
				autocomplete="email"
				onfocus={onFocus}
				onblur={onBlur}
				style={inputStyle}
			/>
		</div>
		<div class="login-field">
			<label for="login-password-{variant}">Password</label>
			<input
				id="login-password-{variant}"
				type="password"
				bind:value={password}
				placeholder="••••••••"
				required
				autocomplete="current-password"
				onfocus={onFocus}
				onblur={onBlur}
				style={inputStyle}
			/>
		</div>
		<div class="login-forgot">
			<a
				href="/forgot-password"
				onclick={() => {
					if (isModal) onClose?.();
				}}>Forgot password?</a
			>
		</div>
		<button type="submit" class="login-submit" disabled={loading} aria-busy={loading}>
			{#if loading}
				<span class="login-spinner login-spinner-light" aria-hidden="true"></span>
				Signing in…
			{:else}
				Sign in
			{/if}
		</button>
	</form>

	{#if isModal}
		<p class="login-modal-register">
			Don't have an account?
			<button type="button" class="login-page-link" onclick={goRegister}>Create an account</button>
		</p>
	{/if}
{/snippet}

<style>
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.login-modal-backdrop {
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

	.login-modal-dialog {
		position: relative;
		width: 100%;
		max-width: 420px;
		max-height: min(90vh, 720px);
		overflow-y: auto;
		background: var(--color-bg-surface);
		border-radius: 16px;
		box-shadow: var(--shadow-modal);
		padding: 22px 22px 20px;
		border: 1px solid var(--color-bg-border);
	}

	.login-modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.login-modal-close {
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

	.login-modal-close:hover {
		background: var(--color-bg-border);
		color: var(--color-text-primary);
	}

	.login-modal-title {
		font-family: 'Newsreader', Georgia, serif;
		font-size: 1.35rem;
		font-weight: 500;
		color: var(--color-text-primary);
		margin: 0 0 6px;
		letter-spacing: -0.02em;
	}

	.login-modal-sub {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0 0 18px;
	}

	.login-modal-register {
		text-align: center;
		margin-top: 18px;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-text-muted);
	}

	.login-page-bg {
		position: fixed;
		inset: 0;
		pointer-events: none;
		background-image: radial-gradient(circle, var(--color-bg-border) 1px, transparent 1px);
		background-size: 32px 32px;
		background-position: 32px 32px;
		mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, #000 30%, transparent 100%);
		-webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, #000 30%, transparent 100%);
		opacity: 0.6;
	}

	.login-page-wrap {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		position: relative;
		z-index: 1;
		min-height: 100%;
	}

	.login-page-inner {
		width: 100%;
		max-width: 420px;
	}

	.login-page-intro {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		margin-bottom: 28px;
		text-align: center;
	}

	.login-page-h1 {
		font-family: 'Newsreader', Georgia, serif;
		font-size: clamp(26px, 6vw, 36px);
		font-weight: 400;
		color: var(--color-text-primary);
		margin: 8px 0 0;
		letter-spacing: -0.02em;
	}

	.login-page-sub {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 14px;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.login-page-card {
		background: var(--color-bg-surface);
		border-radius: 16px;
		box-shadow: var(--shadow-modal);
		padding: clamp(20px, 5vw, 32px);
	}

	.login-page-footer {
		text-align: center;
		margin-top: 20px;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13.5px;
		color: var(--color-text-muted);
	}

	.login-page-link {
		background: none;
		border: none;
		padding: 0;
		margin-left: 4px;
		font: inherit;
		font-weight: 600;
		color: var(--color-brand);
		cursor: pointer;
		text-decoration: none;
	}

	.login-page-link:hover {
		text-decoration: underline;
	}

	.login-error {
		margin-bottom: 18px;
		padding: 11px 14px;
		background: var(--color-ai-muted);
		border-radius: 9px;
		box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.35);
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-ai);
		line-height: 1.5;
	}

	.login-google {
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

	.login-google:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.login-or {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 20px;
	}

	.login-or-line {
		flex: 1;
		height: 1px;
		background: var(--color-bg-border);
	}

	.login-or-text {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: var(--color-text-dim);
		letter-spacing: 0.08em;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.login-field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.login-field label {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-secondary);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.login-forgot {
		display: flex;
		justify-content: flex-end;
	}

	.login-forgot a {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12px;
		color: var(--color-text-muted);
		text-decoration: none;
	}

	.login-forgot a:hover {
		color: var(--color-brand);
	}

	.login-submit {
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
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.15) inset,
			0 8px 24px -10px var(--color-brand);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.login-submit:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.login-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--color-bg-border);
		border-top-color: var(--color-brand);
		border-radius: 50%;
		animation: spin 600ms linear infinite;
	}

	.login-spinner-light {
		width: 14px;
		height: 14px;
		border-color: rgba(255, 255, 255, 0.35);
		border-top-color: #fff;
	}
</style>
