<script lang="ts">
	import { goto } from '$app/navigation';
	import Logo from '$lib/components/Logo.svelte';
	import { openLoginModal } from '$lib/stores/loginModal';

	let { data } = $props();
	let supabase = $derived(data.supabase);

	let fullName        = $state('');
	let email           = $state('');
	let password        = $state('');
	let confirmPassword = $state('');
	let agreedToTerms   = $state(false);
	let loading         = $state(false);
	let googleLoading   = $state(false);
	let error           = $state('');
	let success         = $state(false);

	async function handleGoogleSignup() {
		googleLoading = true;
		const { error: authError } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: `${window.location.origin}/auth/callback?redirect=/humanize` }
		});
		if (authError) { error = authError.message; googleLoading = false; }
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
			">Create an account.</h1>
			<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0;">Start humanizing AI text for free.</p>
		</div>

		<!-- Card -->
		<div style="
			background: var(--color-bg-surface);
			border-radius: 16px;
			box-shadow: var(--shadow-modal);
			padding: 32px;
		">
			{#if success}
				<!-- Success state -->
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
					<h2 style="font-family: 'Newsreader', Georgia, serif; font-size: 24px; font-weight: 400; color: var(--color-text-primary); margin: 0;">Check your email</h2>
					<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0; line-height: 1.6;">
						We sent a confirmation link to <strong style="color: var(--color-text-primary);">{email}</strong>. Click it to activate your account.
					</p>
					<a
						href="/login"
						style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; font-weight: 600; color: var(--color-brand); text-decoration: none; margin-top: 4px;"
						onclick={(e) => {
							e.preventDefault();
							openLoginModal();
						}}>Back to sign in →</a
					>
				</div>
			{:else}
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
					onclick={handleGoogleSignup}
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

				<!-- Form -->
				<form onsubmit={handleRegister} style="display: flex; flex-direction: column; gap: 14px;">
					<div style="display: flex; flex-direction: column; gap: 6px;">
						<label for="fullName" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.08em; text-transform: uppercase;">Full Name</label>
						<input id="fullName" type="text" bind:value={fullName} placeholder="Jane Smith" required autocomplete="name" onfocus={onFocus} onblur={onBlur} style={inputStyle}/>
					</div>

					<div style="display: flex; flex-direction: column; gap: 6px;">
						<label for="email" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.08em; text-transform: uppercase;">Email</label>
						<input id="email" type="email" bind:value={email} placeholder="you@example.com" required autocomplete="email" onfocus={onFocus} onblur={onBlur} style={inputStyle}/>
					</div>

					<div style="display: flex; flex-direction: column; gap: 6px;">
						<label for="password" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.08em; text-transform: uppercase;">Password</label>
						<input id="password" type="password" bind:value={password} placeholder="Min. 8 characters" required autocomplete="new-password" onfocus={onFocus} onblur={onBlur} style={inputStyle}/>
					</div>

					<div style="display: flex; flex-direction: column; gap: 6px;">
						<label for="confirmPassword" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.08em; text-transform: uppercase;">Confirm Password</label>
						<input id="confirmPassword" type="password" bind:value={confirmPassword} placeholder="Repeat your password" required autocomplete="new-password" onfocus={onFocus} onblur={onBlur} style={inputStyle}/>
					</div>

					<!-- Terms checkbox -->
					<label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; user-select: none;">
						<div style="position: relative; margin-top: 2px; flex-shrink: 0; width: 16px; height: 16px;">
							<input type="checkbox" bind:checked={agreedToTerms} style="position: absolute; opacity: 0; width: 16px; height: 16px; cursor: pointer; margin: 0;"/>
							<div style="
								width: 16px; height: 16px; border-radius: 4px;
								background: {agreedToTerms ? 'var(--color-brand)' : 'var(--color-bg-elevated)'};
								box-shadow: inset 0 0 0 1px {agreedToTerms ? 'var(--color-brand)' : 'var(--color-bg-border)'};
								display: flex; align-items: center; justify-content: center;
								transition: background 150ms, box-shadow 150ms;
								pointer-events: none;
							">
								{#if agreedToTerms}
									<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
								{/if}
							</div>
						</div>
						<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 12.5px; color: var(--color-text-secondary); line-height: 1.5;">
							I agree to the
							<a href="/terms" style="color: var(--color-brand); text-decoration: underline;">Terms of Service</a>
							and
							<a href="/privacy" style="color: var(--color-brand); text-decoration: underline;">Privacy Policy</a>
						</span>
					</label>

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
							Creating account…
						{:else}
							Create account
						{/if}
					</button>
				</form>
			{/if}
		</div>

		<!-- Toggle link -->
		{#if !success}
			<p style="text-align: center; margin-top: 20px; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13.5px; color: var(--color-text-muted);">
				Already have an account?
				<a
					href="/login"
					style="color: var(--color-brand); font-weight: 600; text-decoration: none; margin-left: 4px;"
					onclick={(e) => {
						e.preventDefault();
						openLoginModal();
					}}>Sign in</a
				>
			</p>
		{/if}
	</div>
</div>

<style>
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
