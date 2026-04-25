<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Logo from '$lib/components/Logo.svelte';
	import NavUserMenu from '$lib/components/NavUserMenu.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { openLoginModal } from '$lib/stores/loginModal';
	import { openRegisterModal } from '$lib/stores/registerModal';

	let { data, children } = $props();

	let supabase = $derived(data.supabase);
	let profile = $derived(data.profile);
	let user = $derived(data.user);

	let scrollY = $state(0);
	let mobileOpen = $state(false);

	const arrowR = 'M5 12h14 M13 6l6 6-6 6';

	const navLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'AI Humanizer', href: '/humanize' },
		{ label: 'AI Detector', href: '/detect' },
		{ label: 'Blog', href: '/blog' },
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
		window.location.href = '/';
	}

	const planLabel = $derived(
		profile?.plan === 'ultra' ? 'Ultra' :
		profile?.plan === 'pro' ? 'Pro' :
		profile?.plan === 'basic' ? 'Basic' : 'Free'
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
	<nav class="marketing-nav">
		<Logo size={26} onclick={() => goto('/')} />

		<div class="marketing-nav-links">
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

		<!-- Right rail: theme + auth (desktop); theme + hamburger (mobile) -->
		<div class="marketing-nav-right">
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
				<Button variant="primary" size="sm" iconRight={arrowR} onclick={() => openRegisterModal()}>Get started</Button>
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
				<button
					type="button"
					onclick={() => { mobileOpen = false; openRegisterModal(); }}
					style="display: block; width: 100%; padding: 11px 16px; text-align: center; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; font-weight: 600; color: white; background: var(--color-brand); border-radius: 9px; border: none; cursor: pointer;"
				>Get started</button>
				</div>
			{/if}
		</div>
	{/if}
</header>

<!-- Page content -->
{@render children()}

<!-- ── FOOTER ── -->
<footer class="marketing-footer">
	<div class="marketing-footer-grid">
		<!-- Brand -->
		<div class="marketing-footer-brand">
			<div class="footer-brand-logo" role="button" tabindex="0" onclick={() => goto('/')} onkeydown={(e) => e.key === 'Enter' && goto('/')}>
				<div class="footer-brand-icon">H</div>
				<span class="footer-brand-name">HumanizeAI<span style="color:#059669">Write</span></span>
			</div>
			<p class="marketing-footer-tagline">
				Make AI-generated content sound natural, human, and trustworthy.
			</p>
		</div>

		<!-- Product -->
		<div class="marketing-footer-col">
			<h3 class="marketing-footer-heading">Product</h3>
			<nav class="marketing-footer-nav" aria-label="Product">
				<a href="/humanize" onclick={(e) => onGuestAppLink(e, '/humanize')}>AI Humanizer</a>
				<a href="/detect">AI Detector</a>
				<a href="/pricing">Pricing</a>
				<a href="/blog">Blog</a>
			</nav>
		</div>

		<!-- Company -->
		<div class="marketing-footer-col">
			<h3 class="marketing-footer-heading">Company</h3>
			<nav class="marketing-footer-nav" aria-label="Company">
				<a href="/blog">About</a>
				<a href="/blog">Blog</a>
				<a href="/register">Careers</a>
				<a
					href="/login"
					onclick={(e) => {
						e.preventDefault();
						openLoginModal();
					}}>Sign in</a
				>
			</nav>
		</div>

		<!-- Legal -->
		<div class="marketing-footer-col">
			<h3 class="marketing-footer-heading">Legal</h3>
			<nav class="marketing-footer-nav" aria-label="Legal">
				<a href="/privacy">Privacy Policy</a>
				<a href="/terms">Terms of Service</a>
			</nav>
		</div>
	</div>

	<div class="marketing-footer-bottom">
		<span class="marketing-footer-copy">&copy; {new Date().getFullYear()} HumanizeAIWrite. All rights reserved.</span>
	</div>
</footer>

<style>
	.marketing-nav {
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 clamp(12px, 4vw, 24px);
		min-height: 56px;
		display: flex;
		align-items: center;
		gap: clamp(8px, 2vw, 24px);
		min-width: 0;
	}

	.marketing-nav-links {
		display: flex;
		align-items: center;
		gap: 4px;
		flex: 1;
		min-width: 0;
	}

	.marketing-nav-right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		margin-left: auto;
		flex-shrink: 0;
		min-width: 200px;
	}

	/* ── FOOTER ─────────────────────────────────────────────────────────── */
	.marketing-footer {
		background: #063f32;
		border-top: none;
	}

	.marketing-footer-grid {
		max-width: 1180px;
		margin: 0 auto;
		padding: 64px 32px 0;
		display: grid;
		grid-template-columns: 1.6fr repeat(3, 1fr);
		gap: 40px;
		align-items: start;
	}

	.marketing-footer-brand {
		min-width: 0;
	}

	.footer-brand-logo {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		margin-bottom: 16px;
	}

	.footer-brand-icon {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
		font-weight: 900;
		font-size: 16px;
		flex-shrink: 0;
	}

	.footer-brand-name {
		font-size: 17px;
		font-weight: 800;
		color: #fff;
		font-family: inherit;
	}

	.footer-brand-name span {
		color: #6ee7b7;
	}

	.marketing-footer-tagline {
		margin: 0;
		max-width: 260px;
		font-size: 14px;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.6);
	}

	.marketing-footer-col {
		min-width: 0;
	}

	.marketing-footer-heading {
		margin: 0 0 12px;
		font-size: 14px;
		font-weight: 900;
		color: #fff;
	}

	.marketing-footer-nav {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.marketing-footer-nav a {
		font-size: 14px;
		font-weight: 400;
		color: rgba(255, 255, 255, 0.65);
		text-decoration: none;
		transition: color 120ms ease;
	}

	.marketing-footer-nav a:hover {
		color: #fff;
	}

	.marketing-footer-bottom {
		max-width: 1180px;
		margin: 64px auto 0;
		padding: 24px 32px;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
		text-align: center;
	}

	.marketing-footer-copy {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.45);
	}

	/* ── RESPONSIVE ──────────────────────────────────────────────────────── */
	@media (max-width: 900px) {
		.marketing-footer-grid {
			grid-template-columns: 1fr 1fr;
			padding: 48px 24px 0;
		}
		.marketing-footer-brand {
			grid-column: 1 / -1;
		}
		.marketing-footer-bottom {
			padding-left: 24px;
			padding-right: 24px;
		}
	}

	@media (max-width: 520px) {
		.marketing-footer-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 768px) {
		.marketing-nav {
			gap: 8px;
			padding: 0 12px;
		}

		/* Icon-only logo in header — saves horizontal space on narrow screens */
		.marketing-nav :global(.logo-wordmark) {
			display: none;
		}

		.marketing-nav-links {
			display: none !important;
		}

		.marketing-nav-right {
			min-width: 0;
			flex-shrink: 0;
			gap: 6px;
			margin-left: auto;
		}

		.marketing-nav-right > :not(.marketing-hamburger):not(.nav-theme-toggle) {
			display: none !important;
		}

		.marketing-hamburger {
			display: flex !important;
		}
	}
</style>
