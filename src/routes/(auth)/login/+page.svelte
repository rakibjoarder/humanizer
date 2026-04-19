<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Logo from '$lib/components/Logo.svelte';

	let { data } = $props();
	let supabase = $derived(data.supabase);

	let email         = $state('');
	let password      = $state('');
	let loading       = $state(false);
	let googleLoading = $state(false);
	let error         = $state('');

	async function handleEmailLogin(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;
		const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
		if (authError) { error = authError.message; loading = false; return; }
		const redirectTo = page.url.searchParams.get('redirect') ?? '/dashboard';
		window.location.href = redirectTo;
	}

	async function handleGoogleLogin() {
		googleLoading = true;
		const redirectTo = page.url.searchParams.get('redirect') ?? '/dashboard';
		const { error: authError } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}` }
		});
		if (authError) { error = authError.message; googleLoading = false; }
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
		(e.currentTarget as HTMLInputElement).style.boxShadow = 'inset 0 0 0 1px var(--color-brand), 0 0 0 3px var(--color-brand-muted)';
	}
	function onBlur(e: FocusEvent) {
		(e.currentTarget as HTMLInputElement).style.boxShadow = 'inset 0 0 0 1px var(--color-bg-border)';
	}
</script>

<!-- Dotted bg -->
<div style="
	position: fixed;
	inset: 0;
	pointer-events: none;
	background-image: radial-gradient(circle, var(--color-bg-border) 1px, transparent 1px);
	background-size: 32px 32px;
	background-position: 32px 32px;
	mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, #000 30%, transparent 100%);
	-webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, #000 30%, transparent 100%);
	opacity: 0.6;
"></div>

<div style="
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24px 16px;
	position: relative;
	z-index: 1;
">
	<div style="width: 100%; max-width: 420px;">
		<!-- Logo + headline -->
		<div style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 28px; text-align: center;">
			<Logo size={32} onclick={() => goto('/')}/>
			<h1 style="
				font-family: 'Newsreader', Georgia, serif;
				font-size: clamp(26px, 6vw, 36px);
				font-weight: 400;
				color: var(--color-text-primary);
				margin: 8px 0 0;
				letter-spacing: -0.02em;
			">Welcome back.</h1>
			<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0;">Sign in to your account to continue.</p>
		</div>

		<!-- Card -->
		<div style="
			background: var(--color-bg-surface);
			border-radius: 16px;
			box-shadow: inset 0 0 0 1px var(--color-bg-border), 0 24px 48px -12px rgba(0,0,0,0.5);
			padding: clamp(20px, 5vw, 32px);
		">
			<!-- Error -->
			{#if error}
				<div style="
					margin-bottom: 18px;
					padding: 11px 14px;
					background: var(--color-ai-muted);
					border-radius: 9px;
					box-shadow: inset 0 0 0 1px rgba(239,68,68,0.35);
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 13px;
					color: var(--color-ai);
					line-height: 1.5;
				" role="alert">{error}</div>
			{/if}

			<!-- Google button -->
			<button
				type="button"
				onclick={handleGoogleLogin}
				disabled={googleLoading}
				style="
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
					opacity: {googleLoading ? 0.55 : 1};
				"
				aria-busy={googleLoading}
			>
				{#if googleLoading}
					<span style="width:16px;height:16px;border:2px solid var(--color-bg-border);border-top-color:var(--color-brand);border-radius:50%;display:inline-block;animation:spin 600ms linear infinite;"></span>
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

			<!-- OR divider -->
			<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
				<div style="flex: 1; height: 1px; background: var(--color-bg-border);"></div>
				<span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-dim); letter-spacing: 0.08em;">OR</span>
				<div style="flex: 1; height: 1px; background: var(--color-bg-border);"></div>
			</div>

			<!-- Email / password form -->
			<form onsubmit={handleEmailLogin} style="display: flex; flex-direction: column; gap: 16px;">
				<div style="display: flex; flex-direction: column; gap: 6px;">
					<label for="email" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.08em; text-transform: uppercase;">Email</label>
					<input
						id="email"
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

				<div style="display: flex; flex-direction: column; gap: 6px;">
					<label for="password" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.08em; text-transform: uppercase;">Password</label>
					<input
						id="password"
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

				<div style="display: flex; justify-content: flex-end;">
					<a href="/forgot-password" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12px; color: var(--color-text-muted); text-decoration: none;">Forgot password?</a>
				</div>

				<button
					type="submit"
					disabled={loading}
					style="
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
						opacity: {loading ? 0.55 : 1};
						box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 8px 24px -10px var(--color-brand);
						display: flex;
						align-items: center;
						justify-content: center;
						gap: 8px;
					"
					aria-busy={loading}
				>
					{#if loading}
						<span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.35);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin 600ms linear infinite;"></span>
						Signing in…
					{:else}
						Sign in
					{/if}
				</button>
			</form>
		</div>

		<!-- Toggle link -->
		<p style="text-align: center; margin-top: 20px; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13.5px; color: var(--color-text-muted);">
			Don't have an account?
			<a href="/register" style="color: var(--color-brand); font-weight: 600; text-decoration: none; margin-left: 4px;">Create an account</a>
		</p>
	</div>
</div>

<style>
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
