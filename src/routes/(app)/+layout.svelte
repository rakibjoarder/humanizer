<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Logo from '$lib/components/Logo.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { wordsBalanceStore } from '$lib/stores/wordsBalance';

	let { data, children } = $props();
	let supabase = $derived(data.supabase);
	let profile = $derived(data.profile);
	let user = $derived(data.user);

	// Sidebar collapse state — persisted in localStorage
	let collapsed = $state(false);
	let mobileOpen = $state(false);
	let avatarMenuOpen = $state(false);

	onMount(() => {
		const saved = localStorage.getItem('sidebar-collapsed');
		if (saved !== null) collapsed = saved === 'true';
	});

	function toggleCollapse() {
		collapsed = !collapsed;
		if (browser) localStorage.setItem('sidebar-collapsed', String(collapsed));
	}

	const isPaid = $derived(
		profile?.plan === 'basic' || profile?.plan === 'pro' || profile?.plan === 'ultra'
	);

	const planLabel = $derived(
		profile?.plan === 'ultra' ? 'Ultra' :
		profile?.plan === 'pro' ? 'Pro' :
		profile?.plan === 'basic' ? 'Basic' : 'Free'
	);

	const PLAN_LIMITS: Record<string, number> = { free: 150, basic: 4500, pro: 12000, ultra: 35000 };

	// Keep store in sync whenever the server-loaded profile changes (navigation, refresh).
	$effect(() => {
		wordsBalanceStore.set(profile?.words_balance ?? 0);
	});
	const wordsBalance = $derived($wordsBalanceStore);
	const wordsLimit = $derived(PLAN_LIMITS[profile?.plan ?? 'free'] ?? 150);
	const wordsPct = $derived(
		wordsLimit > 0 ? Math.max(0, Math.min(100, (wordsBalance / wordsLimit) * 100)) : 0
	);
	const wordsBarColor = $derived(
		wordsPct <= 15 ? '#ef4444' : wordsPct <= 30 ? '#f59e0b' : 'var(--color-brand)'
	);

	function isActive(href: string) {
		const path = page.url.pathname;
		if (href === '/dashboard') return path === '/dashboard';
		if (href === '/plans') return path === '/plans';
		return path === href || path.startsWith(href + '/');
	}

	async function signOut() {
		await supabase.auth.signOut();
		window.location.href = '/';
	}

	const initials = $derived(user?.email ? user.email.slice(0, 2).toUpperCase() : '?');

	const navItems = [
		{
			href: '/humanize',
			label: 'Humanizer',
			icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'
		},
		{
			href: '/detect',
			label: 'AI Detector',
			icon: 'm12 14 4-4 M3.34 19a10 10 0 1 1 17.32 0'
		},
		{
			href: '/activity',
			label: 'History',
			icon: 'M12 8v4l3 3 M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5'
		},
		{
			href: '/dashboard',
			label: 'Dashboard',
			icon: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z'
		},
		{
			href: '/settings',
			label: 'Settings',
			icon: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'
		}
	];

	const activeNavLabel = $derived(
		navItems.find(item => isActive(item.href))?.label ?? ''
	);
</script>

<div class="shell">

	<!-- ═══ SIDEBAR (desktop) ══════════════════════════════════════════════ -->
	{#if user}
	<aside class="sidebar" class:collapsed>
		<!-- Logo + collapse toggle -->
		<div class="sidebar-header">
			{#if collapsed}
				<!-- Collapsed: logo shown by default, expand arrow shown on hover -->
				<button
					class="sidebar-logo-toggle"
					onclick={toggleCollapse}
					aria-label="Expand sidebar"
					title="Expand sidebar"
				>
					<span class="logo-default"><Logo size={18} /></span>
					<span class="logo-hover">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M9 18l6-6-6-6"/>
						</svg>
					</span>
				</button>
			{:else}
				<Logo size={20} onclick={() => goto('/humanize')} />
				<button
					class="collapse-btn"
					onclick={toggleCollapse}
					aria-label="Collapse sidebar"
					title="Collapse"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M15 18l-6-6 6-6"/>
					</svg>
				</button>
			{/if}
		</div>

		<!-- Nav items -->
		<nav class="sidebar-nav">
			{#each navItems as item}
				{@const active = isActive(item.href)}
				<a
					href={item.href}
					class="nav-link"
					class:active
					class:icon-only={collapsed}
					title={collapsed ? item.label : ''}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-icon" aria-hidden="true">
						<path d={item.icon}/>
					</svg>
					{#if !collapsed}
						<span class="nav-label">{item.label}</span>
					{/if}
				</a>
			{/each}
		</nav>

		<!-- Bottom: words balance -->
		<div class="sidebar-bottom">
			{#if !collapsed}
				<div class="words-widget">
					<div class="words-header">
						<span class="words-label">Words remaining</span>
						<span class="words-count" style="color:{wordsBarColor}">
							{wordsBalance.toLocaleString()}
						</span>
					</div>
					<div class="words-track">
						<div class="words-fill" style="width:{wordsPct}%;background:{wordsBarColor};"></div>
					</div>
					{#if isPaid}
						<p class="words-sub">{wordsLimit.toLocaleString()} / mo · resets monthly</p>
						<a href="/settings#topup" class="bottom-cta topup">
							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
							Get more words
						</a>
					{:else}
						<p class="words-sub">150 words free trial</p>
						<a href="/plans" class="bottom-cta subscribe">
							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
							Subscribe for more
						</a>
					{/if}
				</div>
			{:else}
				<!-- Collapsed: icon CTA with colour-coded dot -->
				<a href={isPaid ? '/settings#topup' : '/plans'} class="icon-cta" title="{wordsBalance.toLocaleString()} words remaining">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="{wordsBarColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 5v14M5 12h14"/>
					</svg>
				</a>
			{/if}
		</div>
	</aside>
	{/if}

	<!-- ═══ MOBILE OVERLAY ════════════════════════════════════════════════ -->
	{#if mobileOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="overlay" onclick={() => (mobileOpen = false)}></div>
		<aside class="sidebar sidebar-mobile">
			<div class="sidebar-header">
				<Logo size={20} onclick={() => { goto('/humanize'); mobileOpen = false; }} />
			</div>
			<nav class="sidebar-nav">
				{#each navItems as item}
					{@const active = isActive(item.href)}
					<a href={item.href} class="nav-link" class:active onclick={() => (mobileOpen = false)}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nav-icon" aria-hidden="true">
							<path d={item.icon}/>
						</svg>
						<span class="nav-label">{item.label}</span>
					</a>
				{/each}
			</nav>
			<div class="sidebar-bottom">
				<div class="words-widget">
					<div class="words-header">
						<span class="words-label">Words remaining</span>
						<span class="words-count" style="color:{wordsBarColor}">{wordsBalance.toLocaleString()}</span>
					</div>
					<div class="words-track"><div class="words-fill" style="width:{wordsPct}%;background:{wordsBarColor};"></div></div>
					{#if isPaid}
						<p class="words-sub">{wordsLimit.toLocaleString()} / mo</p>
						<a href="/settings#topup" class="bottom-cta topup" onclick={() => (mobileOpen = false)}>
							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
							Get more words
						</a>
					{:else}
						<p class="words-sub">150 words free trial</p>
						<a href="/plans" class="bottom-cta subscribe" onclick={() => (mobileOpen = false)}>
							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
							Subscribe for more
						</a>
					{/if}
				</div>
			</div>
		</aside>
	{/if}

	<!-- ═══ MAIN AREA ══════════════════════════════════════════════════════ -->
	<div class="main" class:with-sidebar={!!user} class:sidebar-collapsed={collapsed && !!user}>

		<!-- Top bar -->
		<header class="topbar">
			<div class="topbar-left">
				{#if user}
					<button class="hamburger" onclick={() => (mobileOpen = !mobileOpen)} aria-label="Toggle menu">
						<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
					</button>
					{#if activeNavLabel}
						<span class="topbar-page-title">{activeNavLabel}</span>
					{/if}
				{/if}
				{#if !user}
					<Logo size={22} onclick={() => goto('/')} />
				{/if}
			</div>

			<div class="topbar-right">
				<ThemeToggle />
				{#if user}
					{#if !isPaid}
						<a href="/plans" class="upgrade-pill">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
							Upgrade plan
						</a>
					{:else}
						<a href="/settings" class="plan-badge plan-{profile?.plan}" title="Manage subscription">
							{planLabel}
						</a>
					{/if}

					<div class="avatar-wrap">
						<button
							class="avatar"
							onclick={() => (avatarMenuOpen = !avatarMenuOpen)}
							title={user.email}
							aria-label="Account menu"
							aria-expanded={avatarMenuOpen}
							aria-haspopup="true"
						>{initials}</button>

						{#if avatarMenuOpen}
							<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
							<div class="avatar-backdrop" onclick={() => (avatarMenuOpen = false)}></div>
							<div class="avatar-menu" role="menu">
								<div class="avatar-menu-header">
									<span class="avatar-menu-email">{user.email}</span>
									<span class="avatar-menu-plan plan-{profile?.plan}">{planLabel}</span>
								</div>
								<div class="avatar-menu-divider"></div>
								<a href="/settings" class="avatar-menu-item" role="menuitem" onclick={() => (avatarMenuOpen = false)}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>
									Settings
								</a>
								<a href="/plans" class="avatar-menu-item" role="menuitem" onclick={() => (avatarMenuOpen = false)}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
									{isPaid ? 'Change plan' : 'Upgrade plan'}
								</a>
								<div class="avatar-menu-divider"></div>
								<button class="avatar-menu-item avatar-menu-signout" role="menuitem" onclick={signOut}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9"/></svg>
									Sign out
								</button>
							</div>
						{/if}
					</div>
				{:else}
					<a href="/plans" class="upgrade-pill">View plans</a>
					<a href="/register" class="ghost-pill">Get started</a>
				{/if}
			</div>
		</header>

		<!-- Page -->
		<main class="content">
			{@render children()}
		</main>
	</div>
</div>

<style>
/* ── Shell ──────────────────────────────────────────────────────────────── */
.shell {
	display: flex;
	min-height: 100vh;
	background: var(--color-bg-base);
}

/* ── Sidebar ────────────────────────────────────────────────────────────── */
.sidebar {
	width: 224px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	background: var(--color-bg-surface);
	border-right: 1px solid var(--color-bg-border);
	position: sticky;
	top: 0;
	height: 100vh;
	overflow-y: auto;
	overflow-x: hidden;
	transition: width 200ms ease;
	z-index: 30;
}
.sidebar.collapsed {
	width: 56px;
}

/* ── Sidebar header ─────────────────────────────────────────────────────── */
.sidebar-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 12px 8px;
	min-height: 52px;
}
.sidebar.collapsed .sidebar-header {
	justify-content: center;
}

.collapse-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	border-radius: 6px;
	background: none;
	border: 1px solid var(--color-bg-border);
	color: var(--color-text-muted);
	cursor: pointer;
	flex-shrink: 0;
	transition: background 120ms, color 120ms;
}
.collapse-btn:hover {
	background: var(--color-bg-elevated);
	color: var(--color-text-primary);
}

/* Collapsed sidebar: logo → expand arrow on hover */
.sidebar-logo-toggle {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 8px;
	background: none;
	border: none;
	cursor: pointer;
	margin: 0 auto;
	transition: background 150ms;
	position: relative;
}
.sidebar-logo-toggle:hover {
	background: var(--color-bg-elevated);
}
.logo-default {
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
}
.logo-hover {
	display: none;
	align-items: center;
	justify-content: center;
	color: var(--color-brand);
	pointer-events: none;
}
.sidebar-logo-toggle:hover .logo-default {
	display: none;
}
.sidebar-logo-toggle:hover .logo-hover {
	display: flex;
}

/* ── Nav ────────────────────────────────────────────────────────────────── */
.sidebar-nav {
	flex: 1;
	padding: 6px 8px;
	display: flex;
	flex-direction: column;
	gap: 1px;
}

.nav-link {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 9px 10px;
	border-radius: 8px;
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 13.5px;
	font-weight: 500;
	color: var(--color-text-secondary);
	text-decoration: none;
	white-space: nowrap;
	transition: background 120ms, color 120ms;
}
.nav-link:hover {
	background: var(--color-bg-elevated);
	color: var(--color-text-primary);
}
.nav-link.active {
	background: var(--color-brand-muted);
	color: var(--color-brand);
	font-weight: 600;
}
.nav-link.icon-only {
	justify-content: center;
	padding: 10px;
}

.nav-icon {
	flex-shrink: 0;
}

/* ── Sidebar bottom ─────────────────────────────────────────────────────── */
.sidebar-bottom {
	padding: 12px 10px 18px;
	border-top: 1px solid var(--color-bg-border);
}

.words-widget {
	display: flex;
	flex-direction: column;
	gap: 5px;
}
.words-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.words-label {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 10px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--color-text-muted);
}
.words-count {
	font-family: 'JetBrains Mono', monospace;
	font-size: 12px;
	font-weight: 700;
}
.words-track {
	height: 4px;
	border-radius: 99px;
	background: var(--color-bg-elevated);
	overflow: hidden;
}
.words-fill {
	height: 100%;
	border-radius: 99px;
	transition: width 600ms ease;
}
.words-sub {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 10px;
	color: var(--color-text-muted);
	margin: 0;
}

.subscribe-widget {
	display: flex;
	flex-direction: column;
	gap: 7px;
}
.subscribe-copy {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 11px;
	color: var(--color-text-muted);
	margin: 0;
	line-height: 1.4;
}

.bottom-cta {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 5px;
	margin-top: 4px;
	padding: 8px 10px;
	border-radius: 8px;
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 12px;
	font-weight: 700;
	text-decoration: none;
	transition: background 150ms;
	width: 100%;
}
.bottom-cta.topup {
	color: var(--color-brand);
	background: var(--color-brand-muted);
	border: 1px solid var(--color-brand);
}
.bottom-cta.topup:hover {
	background: color-mix(in srgb, var(--color-brand) 18%, transparent);
}
.bottom-cta.subscribe {
	color: #fff;
	background: var(--color-brand);
	border: none;
}
.bottom-cta.subscribe:hover {
	background: var(--color-brand-hover, #059669);
}

.icon-cta {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 8px;
	background: var(--color-bg-elevated);
	text-decoration: none;
	margin: 0 auto;
	transition: background 150ms;
}
.icon-cta:hover {
	background: var(--color-bg-border);
}

/* ── Main area ──────────────────────────────────────────────────────────── */
.main {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

/* ── Topbar ─────────────────────────────────────────────────────────────── */
.topbar {
	position: sticky;
	top: 0;
	z-index: 20;
	height: 52px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 20px;
	background: var(--color-bg-surface);
	border-bottom: 1px solid var(--color-bg-border);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	gap: 12px;
}

.topbar-left {
	display: flex;
	align-items: center;
	gap: 10px;
}

.topbar-page-title {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 14px;
	font-weight: 600;
	color: var(--color-text-primary);
	letter-spacing: -0.01em;
}

.topbar-right {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-left: auto;
}

.hamburger {
	display: none;
	align-items: center;
	justify-content: center;
	background: none;
	border: none;
	cursor: pointer;
	padding: 6px;
	border-radius: 7px;
	color: var(--color-text-secondary);
	transition: background 120ms;
}
.hamburger:hover {
	background: var(--color-bg-elevated);
}

.upgrade-pill {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 6px 13px;
	border-radius: 8px;
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 12px;
	font-weight: 700;
	color: #fff;
	background: var(--color-brand);
	text-decoration: none;
	white-space: nowrap;
	transition: background 150ms;
}
.upgrade-pill:hover {
	background: var(--color-brand-hover, #059669);
}

.ghost-pill {
	display: inline-flex;
	align-items: center;
	padding: 6px 13px;
	border-radius: 8px;
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 12px;
	font-weight: 600;
	color: var(--color-text-secondary);
	background: var(--color-bg-elevated);
	border: 1px solid var(--color-bg-border);
	text-decoration: none;
}

.plan-badge {
	font-family: 'JetBrains Mono', monospace;
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	padding: 4px 9px;
	border-radius: 6px;
	text-decoration: none;
	transition: opacity 150ms;
}
.plan-badge:hover { opacity: 0.8; }
.plan-badge.plan-basic { background: #3b82f620; color: #3b82f6; box-shadow: inset 0 0 0 1px #3b82f640; }
.plan-badge.plan-pro   { background: var(--color-brand-muted); color: var(--color-brand); box-shadow: inset 0 0 0 1px var(--color-brand); }
.plan-badge.plan-ultra { background: #7c3aed20; color: #7c3aed; box-shadow: inset 0 0 0 1px #7c3aed40; }
.plan-badge.plan-free  { background: var(--color-bg-elevated); color: var(--color-text-muted); box-shadow: inset 0 0 0 1px var(--color-bg-border); }

.avatar-wrap {
	position: relative;
	flex-shrink: 0;
}

.avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: var(--color-brand);
	color: #fff;
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 12px;
	font-weight: 700;
	border: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: opacity 150ms;
}
.avatar:hover { opacity: 0.82; }

.avatar-backdrop {
	position: fixed;
	inset: 0;
	z-index: 39;
}

.avatar-menu {
	position: absolute;
	top: calc(100% + 8px);
	right: 0;
	z-index: 40;
	min-width: 210px;
	background: var(--color-bg-surface);
	border: 1px solid var(--color-bg-border);
	border-radius: 12px;
	box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1);
	overflow: hidden;
}

.avatar-menu-header {
	padding: 12px 14px 10px;
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.avatar-menu-email {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 12px;
	color: var(--color-text-secondary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 180px;
}

.avatar-menu-plan {
	font-family: 'JetBrains Mono', monospace;
	font-size: 10px;
	font-weight: 700;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	padding: 2px 7px;
	border-radius: 4px;
	align-self: flex-start;
}
.avatar-menu-plan.plan-basic { background: #3b82f620; color: #3b82f6; }
.avatar-menu-plan.plan-pro   { background: var(--color-brand-muted); color: var(--color-brand); }
.avatar-menu-plan.plan-ultra { background: #7c3aed20; color: #7c3aed; }
.avatar-menu-plan.plan-free  { background: var(--color-bg-elevated); color: var(--color-text-muted); }

.avatar-menu-divider {
	height: 1px;
	background: var(--color-bg-border);
	margin: 2px 0;
}

.avatar-menu-item {
	display: flex;
	align-items: center;
	gap: 9px;
	width: 100%;
	padding: 9px 14px;
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 13px;
	font-weight: 500;
	color: var(--color-text-secondary);
	background: none;
	border: none;
	cursor: pointer;
	text-decoration: none;
	text-align: left;
	transition: background 120ms, color 120ms;
}
.avatar-menu-item:hover {
	background: var(--color-bg-elevated);
	color: var(--color-text-primary);
}

.avatar-menu-signout {
	color: #ef4444;
}
.avatar-menu-signout:hover {
	background: #ef444412;
	color: #ef4444;
}

/* ── Content ────────────────────────────────────────────────────────────── */
.content {
	flex: 1;
	padding: 28px 32px;
	overflow-y: auto;
}

/* ── Mobile overlay + mobile sidebar ───────────────────────────────────── */
.overlay {
	position: fixed;
	inset: 0;
	background: rgba(0,0,0,0.45);
	z-index: 40;
	cursor: pointer;
}
.sidebar-mobile {
	position: fixed;
	left: 0;
	top: 0;
	height: 100vh;
	width: 240px;
	z-index: 50;
	box-shadow: 4px 0 28px rgba(0,0,0,0.2);
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
	.sidebar:not(.sidebar-mobile) { display: none; }
	.hamburger                    { display: flex; }
	.content                      { padding: 18px 16px; }
}
@media (min-width: 769px) {
	.sidebar-mobile { display: none !important; }
	.overlay        { display: none !important; }
}
</style>
