<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto, invalidate } from '$app/navigation';
	import Logo from '$lib/components/Logo.svelte';
	import NavUserMenu from '$lib/components/NavUserMenu.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { openLoginModal } from '$lib/stores/loginModal';

	let { data, children } = $props();

	let supabase = $derived(data.supabase);
	let profile = $derived(data.profile);
	let user = $derived(data.user);

	let scrollY = $state(0);
	let mobileOpen = $state(false);

	const arrowR = 'M5 12h14 M13 6l6 6-6 6';

	const navLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'Detect', href: '/detect' },
		{ label: 'Humanize', href: '/humanize' },
		{ label: 'Dashboard', href: '/dashboard' },
		{ label: 'Pricing', href: '/pricing' }
	];

	function isActive(href: string) {
		const path = page.url.pathname;
		if (href === '/') return path === '/';
		return path === href || path.startsWith(href + '/');
	}

	/**
	 * Client-side navigations to app routes do not reliably apply server auth redirects,
	 * so guests never see the login modal. Intercept and open the modal instead.
	 */
	function onGuestAppLink(e: MouseEvent, href: string) {
		if (user) return;
		const pathOnly = href.split(/[?#]/)[0];
		if (
			pathOnly === '/humanize' ||
			pathOnly === '/dashboard' ||
			pathOnly === '/activity' ||
			pathOnly.startsWith('/settings')
		) {
			e.preventDefault();
			openLoginModal(href.startsWith('/') ? href : pathOnly);
		}
	}

	async function signOut() {
		await supabase.auth.signOut();
		invalidate('supabase:auth');
		goto('/');
	}

	const planLabel = $derived(
		profile?.plan === 'pro' ? 'Pro' : 'Free'
	);

	const planColor = $derived(
		profile?.plan === 'free' ? 'var(--color-text-muted)' : 'var(--color-brand)'
	);
	const planBg = $derived(
		profile?.plan === 'free' ? 'var(--color-bg-elevated)' : 'var(--color-brand-muted)'
	);
	const planBorder = $derived(
		profile?.plan === 'free' ? 'var(--color-bg-border)' : 'var(--color-brand)'
	);

	/** Yearly Pro ≈ $99 → monthly equivalent for promo strip */
	const yearlyMo = (99 / 12).toFixed(2);

	/** Home promo: guests + Free only */
	const showHomePromoBanner = $derived(
		page.url.pathname === '/' && (!profile || profile.plan !== 'pro')
	);

	onMount(() => {
		const onScroll = () => {
			scrollY = window.scrollY;
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<!-- ── NAV (structure matches (app)/+layout for stable item positions) ── -->
<header
	style="
	position: sticky;
	top: 0;
	left: 0;
	right: 0;
	z-index: 40;
	background: var(--nav-bg-light, var(--color-bg-base));
	border-bottom: 1px solid var(--color-divider);
	backdrop-filter: blur(16px);
	-webkit-backdrop-filter: blur(16px);
	box-shadow: {scrollY > 10 ? 'var(--nav-scroll-shadow)' : 'none'};
	transition: box-shadow 200ms ease;
"
>
	<nav
		style="
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 24px;
		height: 56px;
		display: flex;
		align-items: center;
		gap: 24px;
	"
	>
		<Logo size={26} onclick={() => goto('/')} />

		<div
			style="display: flex; align-items: center; gap: 4px; flex: 1; min-width: 0;"
			class="marketing-nav-links"
		>
			{#each navLinks as link}
				{@const active = isActive(link.href)}
				<a
					href={link.href}
					onclick={(e) => onGuestAppLink(e, link.href)}
					style="
						display: inline-flex;
						align-items: center;
						padding: 6px 12px;
						border-radius: 7px;
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 13.5px;
						font-weight: {active ? '600' : '500'};
						color: {active ? 'var(--color-brand)' : 'var(--color-text-secondary)'};
						background: {active ? 'var(--color-brand-muted)' : 'transparent'};
						text-decoration: none;
						transition: background 150ms, color 150ms;
					"
					onmouseenter={(e) => {
						if (!active) {
							(e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-bg-elevated)';
							(e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-primary)';
						}
					}}
					onmouseleave={(e) => {
						if (!active) {
							(e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
							(e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-secondary)';
						}
					}}
				>{link.label}</a>
			{/each}
		</div>

		<!-- Fixed-width rail so center links do not shift when auth state / CTA width changes -->
		<div
			style="
				display: flex;
				align-items: center;
				justify-content: flex-end;
				gap: 10px;
				margin-left: auto;
				flex-shrink: 0;
				min-width: 200px;
			"
			class="marketing-nav-right"
		>
			<ThemeToggle />
			{#if user}
				<span
					style="
					font-family: 'JetBrains Mono', monospace;
					font-size: 10px;
					font-weight: 700;
					letter-spacing: 0.1em;
					text-transform: uppercase;
					color: {planColor};
					background: {planBg};
					padding: 3px 8px;
					border-radius: 5px;
					box-shadow: inset 0 0 0 1px {planBorder};
				">{planLabel}</span>

				<NavUserMenu {supabase} {user} {profile} />
			{:else}
				<Button variant="ghost" size="sm" onclick={() => openLoginModal()}>Sign in</Button>
				<Button variant="primary" size="sm" iconRight={arrowR} onclick={() => goto('/register')}>Get started</Button>
			{/if}

			<button
				class="marketing-hamburger"
				type="button"
				onclick={() => (mobileOpen = !mobileOpen)}
				aria-label="Toggle menu"
				aria-expanded={mobileOpen}
				style="
					display: none;
					flex-direction: column;
					gap: 5px;
					background: none;
					border: none;
					padding: 4px;
					cursor: pointer;
				"
			>
				<span
					style="display: block; width: 20px; height: 2px; background: var(--color-text-primary); border-radius: 2px; transition: transform 200ms, opacity 200ms; transform: {mobileOpen
						? 'translateY(7px) rotate(45deg)'
						: 'none'};"
				></span>
				<span
					style="display: block; width: 20px; height: 2px; background: var(--color-text-primary); border-radius: 2px; opacity: {mobileOpen
						? 0
						: 1}; transition: opacity 200ms;"
				></span>
				<span
					style="display: block; width: 20px; height: 2px; background: var(--color-text-primary); border-radius: 2px; transition: transform 200ms; transform: {mobileOpen
						? 'translateY(-7px) rotate(-45deg)'
						: 'none'};"
				></span>
			</button>
		</div>
	</nav>

	{#if mobileOpen}
		<div
			style="
			background: var(--color-bg-surface);
			border-top: 1px solid var(--color-bg-border);
			padding: 12px 16px 20px;
		"
			class="marketing-mobile-menu"
		>
			{#each navLinks as link}
				{@const active = isActive(link.href)}
				<a
					href={link.href}
					onclick={(e) => {
						onGuestAppLink(e, link.href);
						mobileOpen = false;
					}}
					style="
						display: block;
						padding: 10px 12px;
						border-radius: 8px;
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 14px;
						font-weight: {active ? '600' : '500'};
						color: {active ? 'var(--color-brand)' : 'var(--color-text-secondary)'};
						background: {active ? 'var(--color-brand-muted)' : 'transparent'};
						text-decoration: none;
						margin-bottom: 2px;
					"
				>{link.label}</a>
			{/each}
			{#if user}
				<div
					style="
					display: flex;
					align-items: center;
					justify-content: space-between;
					margin-top: 16px;
					padding-top: 16px;
					border-top: 1px solid var(--color-bg-border);
				"
				>
					<span
						style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-text-muted);"
						>{user.email}</span>
					<button
						type="button"
						onclick={signOut}
						style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-ai); background: none; border: none; cursor: pointer; font-weight: 600;"
					>Sign out</button>
				</div>
			{:else}
				<div
					style="display: flex; flex-direction: column; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-bg-border);"
				>
					<button
						type="button"
						onclick={() => {
							mobileOpen = false;
							openLoginModal();
						}}
						style="display: block; width: 100%; padding: 11px 16px; text-align: center; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; font-weight: 600; color: var(--color-text-secondary); background: var(--color-bg-elevated); border-radius: 9px; box-shadow: inset 0 0 0 1px var(--color-bg-border); border: none; cursor: pointer;"
					>Sign in</button>
					<a
						href="/register"
						onclick={() => (mobileOpen = false)}
						style="display: block; padding: 11px 16px; text-align: center; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; font-weight: 600; color: white; text-decoration: none; background: var(--color-brand); border-radius: 9px;"
					>Get started</a>
				</div>
			{/if}
		</div>
	{/if}
</header>

{#if showHomePromoBanner}
	<div
		class="marketing-home-promo-banner"
		style="
			width: 100%;
			background: var(--color-bg-sunk);
			border-bottom: 1px solid var(--color-bg-border);
			padding: 12px 24px;
			box-sizing: border-box;
		"
	>
		<div
			style="
				max-width: 1200px;
				margin: 0 auto;
				width: 100%;
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 16px;
				flex-wrap: wrap;
			"
		>
			<div
				style="
					display: flex;
					align-items: center;
					gap: 10px;
					min-width: 0;
					flex: 1 1 240px;
				"
			>
				<svg
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true"
					style="flex-shrink: 0; color: var(--color-text-muted); transform: rotate(45deg);"
				>
					<rect x="9" y="9" width="6" height="6" rx="0.5" />
				</svg>
				<p
					style="
						margin: 0;
						font-family: 'Space Grotesk', system-ui, sans-serif;
						font-size: 13px;
						line-height: 1.4;
						color: var(--color-text-secondary);
					"
				>
					Enjoy unlimited access starting at {'$'}{yearlyMo}/month. Cancel anytime.
				</p>
			</div>
			<button
				type="button"
				onclick={() => goto('/pricing')}
				style="
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 12px;
					font-weight: 600;
					padding: 7px 16px;
					border-radius: 999px;
					border: 1px solid var(--color-bg-border);
					background: var(--color-bg-surface);
					color: var(--color-text-primary);
					cursor: pointer;
					flex-shrink: 0;
					transition: background 150ms, border-color 150ms;
					box-shadow: 0 1px 0 rgba(255,255,255,0.04);
				"
				onmouseenter={(e) => {
					(e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-elevated)';
				}}
				onmouseleave={(e) => {
					(e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-surface)';
				}}
			>
				Explore Premium
			</button>
		</div>
	</div>
{/if}

<!-- Page content -->
{@render children()}

<!-- ── FOOTER ── -->
<footer class="marketing-footer">
	<div class="marketing-footer-grid">
		<div class="marketing-footer-brand">
			<Logo size={24} onclick={() => goto('/')} />
			<p class="marketing-footer-tagline">
				AI detection and humanizing — built for drafts you stand behind.
			</p>
		</div>

		<div class="marketing-footer-col">
			<h3 class="marketing-footer-heading">Product</h3>
			<nav class="marketing-footer-nav" aria-label="Product">
				<a href="/detect">AI Detector</a>
				<a href="/humanize" onclick={(e) => onGuestAppLink(e, '/humanize')}>Humanizer</a>
				<a href="/pricing">Pricing</a>
				<a href="/">Home</a>
			</nav>
		</div>

		<div class="marketing-footer-col">
			<h3 class="marketing-footer-heading">Account</h3>
			<nav class="marketing-footer-nav" aria-label="Account">
				<a
					href="/login"
					onclick={(e) => {
						e.preventDefault();
						openLoginModal();
					}}>Sign in</a
				>
				<a href="/register">Create account</a>
				<a href="/dashboard" onclick={(e) => onGuestAppLink(e, '/dashboard')}>Dashboard</a>
				<a href="/activity" onclick={(e) => onGuestAppLink(e, '/activity')}>Activity</a>
			</nav>
		</div>

		<div class="marketing-footer-col">
			<h3 class="marketing-footer-heading">Legal</h3>
			<nav class="marketing-footer-nav" aria-label="Legal">
				<a href="/terms">Terms of Service</a>
				<a href="/privacy">Privacy Policy</a>
			</nav>
		</div>
	</div>

	<div class="marketing-footer-bottom">
		<span class="marketing-footer-copy">&copy; {new Date().getFullYear()} HumanizeAIWrite</span>
		<span class="marketing-footer-note">Detection and humanizing only — we don’t sell your text.</span>
	</div>
</footer>

<style>
	.marketing-footer {
		/* Elevated (not sunk) so the band reads clearly against page base in dark + light */
		background: var(--color-bg-elevated);
		border-top: 1px solid var(--color-bg-border-hi);
		padding: 48px 24px 28px;
	}

	.marketing-footer-grid {
		max-width: 1200px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: 1.4fr repeat(3, 1fr);
		gap: 32px 40px;
		align-items: start;
	}

	.marketing-footer-brand {
		min-width: 0;
	}

	.marketing-footer-tagline {
		margin: 14px 0 0;
		max-width: 280px;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		line-height: 1.55;
		color: var(--color-text-secondary);
	}

	.marketing-footer-heading {
		margin: 0 0 12px;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	.marketing-footer-nav {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.marketing-footer-nav a {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-primary);
		text-decoration: none;
		transition: color 120ms ease;
	}

	.marketing-footer-nav a:hover {
		color: var(--color-brand);
	}

	.marketing-footer-bottom {
		max-width: 1200px;
		margin: 40px auto 0;
		padding-top: 24px;
		border-top: 1px solid var(--color-bg-border-hi);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 24px;
	}

	.marketing-footer-copy {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.marketing-footer-note {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12px;
		color: var(--color-text-secondary);
		max-width: 420px;
		text-align: right;
	}

	@media (max-width: 900px) {
		.marketing-footer-grid {
			grid-template-columns: 1fr 1fr;
		}
		.marketing-footer-brand {
			grid-column: 1 / -1;
		}
		.marketing-footer-note {
			text-align: left;
		}
	}

	@media (max-width: 520px) {
		.marketing-footer-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.marketing-nav-links {
			display: none !important;
		}
		.marketing-nav-right {
			min-width: auto;
			gap: 8px;
		}
		.marketing-nav-right > :not(.marketing-hamburger):not(.nav-theme-toggle) {
			display: none !important;
		}
		.marketing-hamburger {
			display: flex !important;
		}
	}
</style>
