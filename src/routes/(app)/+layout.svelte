<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import Logo from '$lib/components/Logo.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import NavUserMenu from '$lib/components/NavUserMenu.svelte';
	import { openLoginModal } from '$lib/stores/loginModal';
	import { wordsBalanceStore } from '$lib/stores/wordsBalance';

	let { data, children } = $props();
	let supabase = $derived(data.supabase);
	let profile = $derived(data.profile);
	let user = $derived(data.user);
	let wordPacks = $derived(data.wordPacks ?? []);

	// Guest content pages (blog/privacy/terms) — render marketing layout instead of app shell
	const isGuestContentPage = $derived(
		!user && (
			page.url.pathname === '/blog' ||
			page.url.pathname.startsWith('/blog/') ||
			page.url.pathname === '/privacy' ||
			page.url.pathname === '/terms'
		)
	);

	let mkScrollY = $state(0);
	let mkMobileOpen = $state(false);

	const mkNavLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'AI Humanizer', href: '/humanize' },
		{ label: 'AI Detector', href: '/detect' },
		{ label: 'Blog', href: '/blog' },
		{ label: 'Pricing', href: '/pricing' }
	];

	function mkIsActive(href: string) {
		const p = page.url.pathname;
		if (href === '/') return p === '/';
		return p === href || p.startsWith(href + '/');
	}

	function onGuestAppLink(e: MouseEvent, href: string) {
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

	$effect(() => {
		if (!browser || !isGuestContentPage) return;
		const onScroll = () => { mkScrollY = window.scrollY; };
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	// Sidebar collapse state — persisted in localStorage
	let collapsed = $state(false);
	let mobileOpen = $state(false);
	let avatarMenuOpen = $state(false);
	let topupOpen = $state(false);
	let wordBuyLoading = $state<string | null>(null);

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

	async function buyWordPack(priceId: string) {
		wordBuyLoading = priceId;
		try {
			const res = await fetch('/api/stripe/tokens', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ priceId })
			});
			const json = await res.json();
			if (json.url) {
				window.location.href = json.url;
			} else {
				alert(json.error ?? 'Could not start purchase. Please try again.');
			}
		} catch {
			alert('Failed to reach payment service.');
		} finally {
			wordBuyLoading = null;
		}
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

	const extraLabels: Record<string, string> = {
		'/blog': 'Blog',
		'/privacy': 'Privacy Policy',
		'/terms': 'Terms of Service'
	};

	const activeNavLabel = $derived(
		navItems.find(item => isActive(item.href))?.label ??
		(page.url.pathname.startsWith('/blog/') ? 'Blog' : (extraLabels[page.url.pathname] ?? ''))
	);
</script>

{#if isGuestContentPage}

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- MARKETING LAYOUT — guests on blog / privacy / terms                    -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->
<header
	style="position:sticky;top:0;left:0;right:0;z-index:40;background:var(--nav-bg-light,var(--color-bg-base));border-bottom:1px solid var(--color-divider);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:{mkScrollY>10?'var(--nav-scroll-shadow)':'none'};transition:box-shadow 200ms ease;"
>
	<nav class="mk-nav">
		<Logo size={26} onclick={() => goto('/')} />

		<div class="mk-nav-links">
			{#each mkNavLinks as link}
				{@const active = mkIsActive(link.href)}
				<a
					href={link.href}
					onclick={(e) => onGuestAppLink(e, link.href)}
					style="display:inline-flex;align-items:center;padding:6px 12px;border-radius:7px;font-family:'Space Grotesk',system-ui,sans-serif;font-size:13.5px;font-weight:{active?'600':'500'};color:{active?'var(--color-brand)':'var(--color-text-secondary)'};background:{active?'var(--color-brand-muted)':'transparent'};text-decoration:none;transition:background 150ms,color 150ms;"
					onmouseenter={(e) => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background='var(--color-bg-elevated)'; (e.currentTarget as HTMLAnchorElement).style.color='var(--color-text-primary)'; } }}
					onmouseleave={(e) => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background='transparent'; (e.currentTarget as HTMLAnchorElement).style.color='var(--color-text-secondary)'; } }}
				>{link.label}</a>
			{/each}
		</div>

		<div class="mk-nav-right">
			<ThemeToggle />
			<Button variant="ghost" size="sm" onclick={() => openLoginModal()}>Sign in</Button>
			<Button variant="primary" size="sm" onclick={() => goto('/register')}>Get started</Button>
			<button
				class="mk-hamburger"
				type="button"
				onclick={() => (mkMobileOpen = !mkMobileOpen)}
				aria-label="Toggle menu"
				aria-expanded={mkMobileOpen}
			>
				<span style="display:block;width:20px;height:2px;background:var(--color-text-primary);border-radius:2px;transition:transform 200ms,opacity 200ms;transform:{mkMobileOpen?'translateY(7px) rotate(45deg)':'none'};"></span>
				<span style="display:block;width:20px;height:2px;background:var(--color-text-primary);border-radius:2px;opacity:{mkMobileOpen?0:1};transition:opacity 200ms;"></span>
				<span style="display:block;width:20px;height:2px;background:var(--color-text-primary);border-radius:2px;transition:transform 200ms;transform:{mkMobileOpen?'translateY(-7px) rotate(-45deg)':'none'};"></span>
			</button>
		</div>
	</nav>

	{#if mkMobileOpen}
		<div style="background:var(--color-bg-surface);border-top:1px solid var(--color-bg-border);padding:12px 16px 20px;">
			{#each mkNavLinks as link}
				{@const active = mkIsActive(link.href)}
				<a
					href={link.href}
					onclick={(e) => { onGuestAppLink(e, link.href); mkMobileOpen = false; }}
					style="display:block;padding:10px 12px;border-radius:8px;font-family:'Space Grotesk',system-ui,sans-serif;font-size:14px;font-weight:{active?'600':'500'};color:{active?'var(--color-brand)':'var(--color-text-secondary)'};background:{active?'var(--color-brand-muted)':'transparent'};text-decoration:none;margin-bottom:2px;"
				>{link.label}</a>
			{/each}
			<div style="display:flex;flex-direction:column;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid var(--color-bg-border);">
				<button type="button" onclick={() => { mkMobileOpen = false; openLoginModal(); }} style="display:block;width:100%;padding:11px 16px;text-align:center;font-family:'Space Grotesk',system-ui,sans-serif;font-size:14px;font-weight:600;color:var(--color-text-secondary);background:var(--color-bg-elevated);border-radius:9px;box-shadow:inset 0 0 0 1px var(--color-bg-border);border:none;cursor:pointer;">Sign in</button>
				<a href="/register" onclick={() => (mkMobileOpen = false)} style="display:block;padding:11px 16px;text-align:center;font-family:'Space Grotesk',system-ui,sans-serif;font-size:14px;font-weight:600;color:white;text-decoration:none;background:var(--color-brand);border-radius:9px;">Get started</a>
			</div>
		</div>
	{/if}
</header>

{@render children()}

<footer class="mk-footer">
	<div class="mk-footer-grid">
		<div>
			<Logo size={24} onclick={() => goto('/')} />
			<p style="margin:14px 0 0;max-width:280px;font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;line-height:1.55;color:var(--color-text-secondary);">AI detection and humanizing — built for drafts you stand behind.</p>
		</div>
		<div>
			<h3 class="mk-footer-heading">Product</h3>
			<nav class="mk-footer-nav"><a href="/detect">AI Detector</a><a href="/humanize" onclick={(e) => onGuestAppLink(e, '/humanize')}>AI Humanizer</a><a href="/pricing">Pricing</a><a href="/">Home</a></nav>
		</div>
		<div>
			<h3 class="mk-footer-heading">Resources</h3>
			<nav class="mk-footer-nav"><a href="/blog">Blog</a><a href="/blog/how-to-bypass-gptzero">Bypass GPTZero</a><a href="/blog/does-turnitin-detect-chatgpt">Turnitin & ChatGPT</a></nav>
		</div>
		<div>
			<h3 class="mk-footer-heading">Legal</h3>
			<nav class="mk-footer-nav"><a href="/terms">Terms of Service</a><a href="/privacy">Privacy Policy</a></nav>
		</div>
	</div>
	<div class="mk-footer-bottom">
		<span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;color:var(--color-text-muted);">&copy; {new Date().getFullYear()} HumanizeAIWrite</span>
		<span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;color:var(--color-text-secondary);">Detection and humanizing only — we don't sell your text.</span>
	</div>
</footer>

{:else}

<div class="shell">

	<!-- ═══ SIDEBAR (desktop) ══════════════════════════════════════════════ -->
	{#if user}
	<aside class="sidebar" class:collapsed>
		<!-- Logo + collapse toggle -->
		<div class="sidebar-header">
			{#if collapsed}
				<!-- Collapsed: icon shown by default, expand arrow shown on hover -->
				<button
					class="sidebar-logo-toggle"
					onclick={toggleCollapse}
					aria-label="Expand sidebar"
					title="Expand sidebar"
				>
					<span class="logo-default">
						<img src="/assets/icon-dark.svg" width="22" height="22" alt="" aria-hidden="true" class="app-icon app-icon-dark" style="border-radius: 22%;" />
						<img src="/assets/icon-light.svg" width="22" height="22" alt="" aria-hidden="true" class="app-icon app-icon-light" style="border-radius: 22%;" />
					</span>
					<span class="logo-hover">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
						<button onclick={() => (topupOpen = true)} class="bottom-cta topup">
							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
							Get more words
						</button>
					{:else}
						<p class="words-sub">150 words free trial</p>
						<a href="/plans" class="bottom-cta subscribe">
							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
							Subscribe for more
						</a>
					{/if}
					<nav class="shell-legal" aria-label="Legal and resources">
						<a href="/blog">Blog</a>
						<span class="shell-legal-sep" aria-hidden="true">·</span>
						<a href="/privacy">Privacy</a>
						<span class="shell-legal-sep" aria-hidden="true">·</span>
						<a href="/terms">Terms</a>
					</nav>
				</div>
			{:else}
				<!-- Collapsed: icon CTA with colour-coded dot -->
				{#if isPaid}
					<button onclick={() => (topupOpen = true)} class="icon-cta" title="{wordsBalance.toLocaleString()} words remaining">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="{wordsBarColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M12 5v14M5 12h14"/>
						</svg>
					</button>
				{:else}
					<a href="/plans" class="icon-cta" title="{wordsBalance.toLocaleString()} words remaining">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="{wordsBarColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<path d="M12 5v14M5 12h14"/>
						</svg>
					</a>
				{/if}
				<nav class="shell-legal shell-legal--collapsed" aria-label="Legal and resources">
					<a href="/blog" class="shell-legal-icon" title="Blog" aria-label="Blog">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>
					</a>
					<a href="/privacy" class="shell-legal-icon" title="Privacy Policy" aria-label="Privacy Policy">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
					</a>
					<a href="/terms" class="shell-legal-icon" title="Terms of Service" aria-label="Terms of Service">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
					</a>
				</nav>
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
						<button onclick={() => { mobileOpen = false; topupOpen = true; }} class="bottom-cta topup">
							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
							Get more words
						</button>
					{:else}
						<p class="words-sub">150 words free trial</p>
						<a href="/plans" class="bottom-cta subscribe" onclick={() => (mobileOpen = false)}>
							<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
							Subscribe for more
						</a>
					{/if}
					<nav class="shell-legal" aria-label="Legal and resources">
						<a href="/blog" onclick={() => (mobileOpen = false)}>Blog</a>
						<span class="shell-legal-sep" aria-hidden="true">·</span>
						<a href="/privacy" onclick={() => (mobileOpen = false)}>Privacy</a>
						<span class="shell-legal-sep" aria-hidden="true">·</span>
						<a href="/terms" onclick={() => (mobileOpen = false)}>Terms</a>
					</nav>
				</div>
			</div>
		</aside>
	{/if}

	<!-- ═══ TOPUP MODAL ══════════════════════════════════════════════════════ -->
	{#if topupOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={() => (topupOpen = false)}></div>
		<div class="topup-modal" role="dialog" aria-modal="true" aria-label="Buy word packs">
			<div class="topup-modal-header">
				<div>
					<h3 class="topup-modal-title">Top up words</h3>
					<p class="topup-modal-sub">{wordsBalance.toLocaleString()} words remaining</p>
				</div>
				<button class="topup-modal-close" onclick={() => (topupOpen = false)} aria-label="Close">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
				</button>
			</div>
			<div class="topup-packs">
				{#each wordPacks as pack}
					<button
						class="topup-pack"
						onclick={() => buyWordPack(pack.priceId)}
						disabled={wordBuyLoading !== null}
					>
						<span class="topup-pack-words">{wordBuyLoading === pack.priceId ? '…' : `+${(pack.words / 1000).toFixed(0)}K`}</span>
						<span class="topup-pack-label">words</span>
						<span class="topup-pack-price">${pack.price}</span>
					</button>
				{/each}
			</div>
			<p class="topup-modal-note">One-time purchase. Words never expire.</p>
		</div>
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
								<a href="/blog" class="avatar-menu-item" role="menuitem" onclick={() => (avatarMenuOpen = false)}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>
									Blog
								</a>
								<a href="/privacy" class="avatar-menu-item" role="menuitem" onclick={() => (avatarMenuOpen = false)}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
									Privacy Policy
								</a>
								<a href="/terms" class="avatar-menu-item" role="menuitem" onclick={() => (avatarMenuOpen = false)}>
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
									Terms of Service
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

{/if}

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
.app-icon-light { display: none; }
:global(html[data-theme='light']) .app-icon-dark { display: none; }
:global(html[data-theme='light']) .app-icon-light { display: block; }
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
	cursor: pointer;
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

.shell-legal {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: 4px 2px;
	margin-top: 10px;
	padding-top: 10px;
	border-top: 1px solid var(--color-bg-border);
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 11px;
	font-weight: 500;
	line-height: 1.3;
}
.shell-legal a {
	color: var(--color-text-muted);
	text-decoration: none;
	transition: color 120ms ease;
}
.shell-legal a:hover {
	color: var(--color-brand);
}
.shell-legal-sep {
	color: var(--color-text-dim);
	user-select: none;
	padding: 0 2px;
}

.shell-legal--collapsed {
	flex-direction: column;
	gap: 6px;
	margin-top: 8px;
	padding-top: 8px;
	border-top: 1px solid var(--color-bg-border);
}
.shell-legal-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 8px;
	color: var(--color-text-muted);
	text-decoration: none;
	transition: background 120ms ease, color 120ms ease;
}
.shell-legal-icon:hover {
	background: var(--color-bg-elevated);
	color: var(--color-brand);
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

/* ── Topup modal ─────────────────────────────────────────────────────────── */
.modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(0,0,0,0.45);
	z-index: 60;
	cursor: pointer;
}

.topup-modal {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	z-index: 61;
	width: min(360px, calc(100vw - 32px));
	background: var(--color-bg-surface);
	border: 1px solid var(--color-bg-border);
	border-radius: 16px;
	box-shadow: 0 24px 64px rgba(0,0,0,0.24), 0 4px 16px rgba(0,0,0,0.12);
	padding: 20px;
}

.topup-modal-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 16px;
}

.topup-modal-title {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 15px;
	font-weight: 700;
	color: var(--color-text-primary);
	margin: 0 0 3px;
}

.topup-modal-sub {
	font-family: 'JetBrains Mono', monospace;
	font-size: 11px;
	color: var(--color-text-muted);
	margin: 0;
}

.topup-modal-close {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 8px;
	background: none;
	border: 1px solid var(--color-bg-border);
	color: var(--color-text-muted);
	cursor: pointer;
	flex-shrink: 0;
	transition: background 120ms, color 120ms;
}
.topup-modal-close:hover {
	background: var(--color-bg-elevated);
	color: var(--color-text-primary);
}

.topup-packs {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 8px;
	margin-bottom: 14px;
}

.topup-pack {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	padding: 12px 8px;
	border-radius: 10px;
	background: var(--color-bg-elevated);
	border: 1px solid var(--color-bg-border);
	cursor: pointer;
	transition: border-color 150ms, background 150ms;
}
.topup-pack:hover:not(:disabled) {
	border-color: var(--color-brand);
	background: var(--color-brand-muted);
}
.topup-pack:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.topup-pack-words {
	font-family: 'JetBrains Mono', monospace;
	font-size: 15px;
	font-weight: 700;
	color: var(--color-text-primary);
}

.topup-pack-label {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 10px;
	color: var(--color-text-muted);
}

.topup-pack-price {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 13px;
	font-weight: 700;
	color: var(--color-brand);
	margin-top: 4px;
}

.topup-modal-note {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 11px;
	color: var(--color-text-muted);
	text-align: center;
	margin: 0;
}

/* ── Guest content page: marketing layout ───────────────────────────────── */
.mk-nav {
	max-width: 1280px;
	margin: 0 auto;
	padding: 0 clamp(12px, 4vw, 24px);
	min-height: 56px;
	display: flex;
	align-items: center;
	gap: clamp(8px, 2vw, 24px);
	min-width: 0;
}

.mk-nav-links {
	display: flex;
	align-items: center;
	gap: 4px;
	flex: 1;
	min-width: 0;
}

.mk-nav-right {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 10px;
	margin-left: auto;
	flex-shrink: 0;
}

.mk-hamburger {
	display: none;
	flex-direction: column;
	gap: 5px;
	background: none;
	border: none;
	padding: 4px;
	cursor: pointer;
}

.mk-footer {
	background: var(--color-brand-muted);
	border-top: 1px solid rgba(16,185,129,0.3);
	padding: 48px 24px 28px;
}

.mk-footer-grid {
	max-width: 1200px;
	margin: 0 auto;
	display: grid;
	grid-template-columns: 1.4fr repeat(3, 1fr);
	gap: 32px 40px;
	align-items: start;
}

.mk-footer-heading {
	margin: 0 0 12px;
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--color-text-muted);
}

.mk-footer-nav {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.mk-footer-nav a {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 13px;
	font-weight: 500;
	color: var(--color-text-primary);
	text-decoration: none;
	transition: color 120ms ease;
}

.mk-footer-nav a:hover { color: var(--color-brand); }

.mk-footer-bottom {
	max-width: 1200px;
	margin: 40px auto 0;
	padding-top: 24px;
	border-top: 1px solid rgba(16,185,129,0.2);
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px 24px;
}

@media (max-width: 900px) {
	.mk-footer-grid { grid-template-columns: 1fr 1fr; }
	.mk-footer-grid > :first-child { grid-column: 1 / -1; }
}

@media (max-width: 768px) {
	.mk-nav-links { display: none !important; }
	.mk-nav-right > :not(.mk-hamburger) { display: none !important; }
	.mk-hamburger { display: flex !important; }
}

@media (max-width: 520px) {
	.mk-footer-grid { grid-template-columns: 1fr; }
}
</style>
