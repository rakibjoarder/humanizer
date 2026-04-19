<script lang="ts">
	import { page } from '$app/state';
	import { goto, invalidate } from '$app/navigation';
	import Logo from '$lib/components/Logo.svelte';
	import NavUserMenu from '$lib/components/NavUserMenu.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let { data, children } = $props();
	let supabase = $derived(data.supabase);
	let profile = $derived(data.profile);
	let user = $derived(data.user);

	let mobileOpen = $state(false);
	let scrollY = $state(0);

	const navLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'Detect', href: '/detect' },
		{ label: 'Humanize', href: '/humanize' },
		{ label: 'Dashboard', href: '/dashboard' },
		{ label: 'Activity', href: '/activity' },
		{ label: 'Pricing', href: '/pricing' }
	];

	function isActive(href: string) {
		const path = page.url.pathname;
		if (href === '/') return path === '/';
		return path === href || path.startsWith(href + '/');
	}

	async function signOut() {
		await supabase.auth.signOut();
		invalidate('supabase:auth');
		goto('/login');
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

	import { onMount } from 'svelte';
	onMount(() => {
		const onScroll = () => { scrollY = window.scrollY; };
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<!-- Nav -->
<header style="
	position: sticky;
	top: 0;
	z-index: 40;
	background: var(--color-bg-base);
	border-bottom: 1px solid var(--color-bg-border);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	box-shadow: {scrollY > 10 ? 'var(--nav-scroll-shadow)' : 'none'};
	transition: box-shadow 200ms ease;
">
	<nav style="
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 24px;
		height: 56px;
		display: flex;
		align-items: center;
		gap: 24px;
	">
		<!-- Logo -->
		<Logo size={26} onclick={() => goto('/')} />

		<!-- Nav links (desktop) -->
		<div style="display: flex; align-items: center; gap: 4px; flex: 1;" class="app-nav-links">
			{#each navLinks as link}
				{@const active = isActive(link.href)}
				<a
					href={link.href}
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
					onmouseenter={(e) => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-bg-elevated)'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-primary)'; } }}
					onmouseleave={(e) => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-secondary)'; } }}
				>{link.label}</a>
			{/each}
		</div>

		<!-- Right side: min-width keeps link column from shifting when CTAs differ in width -->
		<div
			style="display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-left: auto; flex-shrink: 0; min-width: 200px;"
			class="app-nav-right"
		>
			<ThemeToggle />
			{#if user}
				<!-- Plan badge -->
				<span style="
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
				<Button variant="ghost" size="sm" onclick={() => goto('/login')}>Sign in</Button>
				<Button variant="primary" size="sm" onclick={() => goto('/register')}>Get started</Button>
			{/if}

			<!-- Hamburger (mobile) -->
			<button
				class="app-hamburger"
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
				<span style="display: block; width: 20px; height: 2px; background: var(--color-text-primary); border-radius: 2px; transition: transform 200ms, opacity 200ms; transform: {mobileOpen ? 'translateY(7px) rotate(45deg)' : 'none'};"></span>
				<span style="display: block; width: 20px; height: 2px; background: var(--color-text-primary); border-radius: 2px; opacity: {mobileOpen ? 0 : 1}; transition: opacity 200ms;"></span>
				<span style="display: block; width: 20px; height: 2px; background: var(--color-text-primary); border-radius: 2px; transition: transform 200ms; transform: {mobileOpen ? 'translateY(-7px) rotate(-45deg)' : 'none'};"></span>
			</button>
		</div>
	</nav>

	<!-- Mobile menu -->
	{#if mobileOpen}
		<div style="
			background: var(--color-bg-surface);
			border-top: 1px solid var(--color-bg-border);
			padding: 12px 16px 20px;
		" class="app-mobile-menu">
			{#each navLinks as link}
				{@const active = isActive(link.href)}
				<a
					href={link.href}
					onclick={() => (mobileOpen = false)}
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
				<div style="
					display: flex;
					align-items: center;
					justify-content: space-between;
					margin-top: 16px;
					padding-top: 16px;
					border-top: 1px solid var(--color-bg-border);
				">
					<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-text-muted);">{user.email}</span>
					<button onclick={signOut} style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-ai); background: none; border: none; cursor: pointer; font-weight: 600;">Sign out</button>
				</div>
			{/if}
		</div>
	{/if}
</header>

<!-- Content -->
<main>
	{@render children()}
</main>

<style>
	@media (max-width: 768px) {
		.app-nav-links { display: none !important; }
		.app-nav-right { min-width: auto; }
		.app-hamburger { display: flex !important; }
	}
</style>
