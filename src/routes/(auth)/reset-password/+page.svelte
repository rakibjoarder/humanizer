<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Logo from '$lib/components/Logo.svelte';

	let { data } = $props();
	let supabase = $derived(data.supabase);

	let password        = $state('');
	let confirmPassword = $state('');
	let loading         = $state(false);
	let error           = $state('');
	let success         = $state(false);
	let sessionReady    = $state(false);

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const code      = params.get('code');
		const tokenHash = params.get('token_hash');
		const type      = params.get('type') ?? 'recovery';

		if (code) {
			const { error: err } = await supabase.auth.exchangeCodeForSession(code);
			if (err) { goto('/forgot-password?error=expired'); return; }
			// Remove the code from the URL bar so it isn't reused or bookmarked
			window.history.replaceState({}, '', '/reset-password');
			sessionReady = true;
			return;
		}

		if (tokenHash) {
			const { error: err } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'recovery' });
			if (err) { goto('/forgot-password?error=expired'); return; }
			window.history.replaceState({}, '', '/reset-password');
			sessionReady = true;
			return;
		}

		// No token in URL — check for an existing valid session
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) { goto('/forgot-password'); return; }
		sessionReady = true;
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		if (password !== confirmPassword) { error = 'Passwords do not match.'; return; }
		if (password.length < 8) { error = 'Password must be at least 8 characters.'; return; }
		loading = true;
		const { error: authError } = await supabase.auth.updateUser({ password });
		if (authError) { error = authError.message; loading = false; return; }
		success = true;
		loading = false;
		await supabase.auth.signOut();
		setTimeout(() => goto('/login'), 2000);
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
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24px;
	position: relative;
	z-index: 1;
">
	<div style="width: 100%; max-width: 420px;">
		<!-- Logo + headline -->
		<div style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 28px; text-align: center;">
			<Logo size={32} onclick={() => goto('/')}/>
			<h1 style="
				font-family: 'Newsreader', Georgia, serif;
				font-size: 36px;
				font-weight: 400;
				color: var(--color-text-primary);
				margin: 8px 0 0;
				letter-spacing: -0.02em;
			">Choose a new password.</h1>
			<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0;">
				Must be at least 8 characters.
			</p>
		</div>

		<!-- Card -->
		<div style="
			background: var(--color-bg-surface);
			border-radius: 16px;
			box-shadow: var(--shadow-modal);
			padding: 32px;
		">
			{#if success}
				<div style="display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 8px 0; text-align: center;">
					<div style="
						width: 56px; height: 56px; border-radius: 50%;
						background: var(--color-human-muted);
						box-shadow: inset 0 0 0 1px var(--color-human);
						display: flex; align-items: center; justify-content: center;
					">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-human)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M20 6 9 17l-5-5"/>
						</svg>
					</div>
					<h2 style="font-family: 'Newsreader', Georgia, serif; font-size: 24px; font-weight: 400; color: var(--color-text-primary); margin: 0;">Password updated</h2>
					<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0; line-height: 1.6;">
						Your password has been changed. Redirecting you to sign in…
					</p>
				</div>
			{:else if !sessionReady}
				<div style="display: flex; justify-content: center; padding: 24px 0;">
					<span style="width:20px;height:20px;border:2px solid var(--color-bg-border);border-top-color:var(--color-brand);border-radius:50%;display:inline-block;animation:spin 600ms linear infinite;"></span>
				</div>
			{:else}
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

				<form onsubmit={handleSubmit} style="display: flex; flex-direction: column; gap: 14px;">
					<div style="display: flex; flex-direction: column; gap: 6px;">
						<label for="password" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.08em; text-transform: uppercase;">New Password</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							placeholder="Min. 8 characters"
							required
							autocomplete="new-password"
							onfocus={onFocus}
							onblur={onBlur}
							style={inputStyle}
						/>
					</div>

					<div style="display: flex; flex-direction: column; gap: 6px;">
						<label for="confirmPassword" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.08em; text-transform: uppercase;">Confirm Password</label>
						<input
							id="confirmPassword"
							type="password"
							bind:value={confirmPassword}
							placeholder="Repeat your password"
							required
							autocomplete="new-password"
							onfocus={onFocus}
							onblur={onBlur}
							style={inputStyle}
						/>
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
							margin-top: 4px;
						"
						aria-busy={loading}
					>
						{#if loading}
							<span style="width:14px;height:14px;border:2px solid rgba(255,255,255,0.35);border-top-color:#fff;border-radius:50%;display:inline-block;animation:spin 600ms linear infinite;"></span>
							Updating…
						{:else}
							Update password
						{/if}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>

<style>
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
