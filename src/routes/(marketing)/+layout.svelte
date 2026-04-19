<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Logo from '$lib/components/Logo.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	let { children } = $props();

	let scrollY = $state(0);
	let mobileOpen = $state(false);

	const arrowR = 'M5 12h14 M13 6l6 6-6 6';

	onMount(() => {
		const onScroll = () => { scrollY = window.scrollY; };
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<!-- ── NAV ── -->
<header style="
	position: sticky;
	top: 0;
	left: 0;
	right: 0;
	z-index: 50;
	background: var(--color-bg-base);
	border-bottom: 1px solid var(--color-bg-border);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	box-shadow: {scrollY > 10 ? '0 4px 24px -4px rgba(0,0,0,0.5)' : 'none'};
	transition: box-shadow 200ms ease;
">
	<nav style="
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 32px;
		height: 58px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
	">
		<!-- Logo -->
		<Logo size={28} onclick={() => goto('/')} />

		<!-- Desktop links -->
		<div style="display: flex; align-items: center; gap: 32px;" class="nav-links-desktop">
			<a href="/" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); text-decoration: none; font-weight: 500; transition: color 150ms;" onmouseenter={(e)=>(e.currentTarget as HTMLAnchorElement).style.color='var(--color-text-primary)'} onmouseleave={(e)=>(e.currentTarget as HTMLAnchorElement).style.color='var(--color-text-secondary)'}>Home</a>
			<a href="/detect" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); text-decoration: none; font-weight: 500; transition: color 150ms;" onmouseenter={(e)=>(e.currentTarget as HTMLAnchorElement).style.color='var(--color-text-primary)'} onmouseleave={(e)=>(e.currentTarget as HTMLAnchorElement).style.color='var(--color-text-secondary)'}>Detect</a>
			<a href="/pricing" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); text-decoration: none; font-weight: 500; transition: color 150ms;" onmouseenter={(e)=>(e.currentTarget as HTMLAnchorElement).style.color='var(--color-text-primary)'} onmouseleave={(e)=>(e.currentTarget as HTMLAnchorElement).style.color='var(--color-text-secondary)'}>Pricing</a>
		</div>

		<!-- Desktop CTAs -->
		<div style="display: flex; align-items: center; gap: 10px;" class="nav-ctas-desktop">
			<Button variant="ghost" size="sm" onclick={() => goto('/login')}>Sign in</Button>
			<Button variant="primary" size="sm" iconRight={arrowR} onclick={() => goto('/register')}>Get started</Button>
		</div>

		<!-- Hamburger (mobile) -->
		<button
			class="hamburger"
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
			<span style="display: block; width: 22px; height: 2px; background: var(--color-text-primary); border-radius: 2px; transition: transform 250ms, opacity 250ms; transform: {mobileOpen ? 'translateY(7px) rotate(45deg)' : 'none'};"></span>
			<span style="display: block; width: 22px; height: 2px; background: var(--color-text-primary); border-radius: 2px; opacity: {mobileOpen ? '0' : '1'}; transition: opacity 250ms;"></span>
			<span style="display: block; width: 22px; height: 2px; background: var(--color-text-primary); border-radius: 2px; transition: transform 250ms; transform: {mobileOpen ? 'translateY(-7px) rotate(-45deg)' : 'none'};"></span>
		</button>
	</nav>

	<!-- Mobile menu -->
	{#if mobileOpen}
		<div style="
			background: var(--color-bg-surface);
			border-top: 1px solid var(--color-bg-border);
			padding: 16px 24px 24px;
		" class="mobile-menu">
			<div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px;">
				<a href="/" onclick={() => (mobileOpen = false)} style="padding: 10px 8px; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 15px; color: var(--color-text-secondary); text-decoration: none; border-radius: 8px;">Home</a>
				<a href="/detect" onclick={() => (mobileOpen = false)} style="padding: 10px 8px; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 15px; color: var(--color-text-secondary); text-decoration: none; border-radius: 8px;">Detect</a>
				<a href="/pricing" onclick={() => (mobileOpen = false)} style="padding: 10px 8px; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 15px; color: var(--color-text-secondary); text-decoration: none; border-radius: 8px;">Pricing</a>
			</div>
			<div style="display: flex; flex-direction: column; gap: 8px; padding-top: 16px; border-top: 1px solid var(--color-bg-border);">
				<a href="/login" style="display: block; padding: 11px 16px; text-align: center; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; font-weight: 600; color: var(--color-text-secondary); text-decoration: none; background: var(--color-bg-elevated); border-radius: 9px; box-shadow: inset 0 0 0 1px var(--color-bg-border);">Sign in</a>
				<a href="/register" style="display: block; padding: 11px 16px; text-align: center; font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; font-weight: 600; color: white; text-decoration: none; background: var(--color-brand); border-radius: 9px;">Get started</a>
			</div>
		</div>
	{/if}
</header>

<!-- Page content -->
{@render children()}

<!-- ── FOOTER ── -->
<footer style="
	background: var(--color-bg-base);
	border-top: 1px solid var(--color-bg-border);
	padding: 40px 48px;
">
	<div style="
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		flex-wrap: wrap;
	">
		<Logo size={22} onclick={() => goto('/')} />

		<div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
			<a href="/terms" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-text-muted); text-decoration: none;">Terms</a>
			<a href="/privacy" style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-text-muted); text-decoration: none;">Privacy</a>
			<span style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; color: var(--color-text-dim);">&copy; 2026 HumanizeAI</span>
		</div>
	</div>
</footer>

<style>
	@media (max-width: 768px) {
		.nav-links-desktop, .nav-ctas-desktop { display: none !important; }
		.hamburger { display: flex !important; }
	}
</style>
