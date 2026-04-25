<script lang="ts">
	import '../app.css';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { goto, invalidate } from '$app/navigation';
	import type { AuthChangeEvent } from '@supabase/supabase-js';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import RegisterModal from '$lib/components/RegisterModal.svelte';
	import { loginModalOpen, loginModalRedirect, closeLoginModal, openLoginModal } from '$lib/stores/loginModal';
	import { registerModalOpen, registerModalRedirect, closeRegisterModal } from '$lib/stores/registerModal';
	import { PUBLIC_GA_MEASUREMENT_ID } from '$env/static/public';

	let { data, children } = $props();
	let supabase = $derived(data.supabase);

	// Inject GA4 once and track page views on navigation
	let gaLoaded = false;
	$effect(() => {
		if (!browser || !PUBLIC_GA_MEASUREMENT_ID) return;
		if (!gaLoaded) {
			gaLoaded = true;
			window.dataLayer = window.dataLayer || [];
			window.gtag = function gtag() { window.dataLayer!.push(arguments as unknown); };
			window.gtag('js', new Date());
			window.gtag('config', PUBLIC_GA_MEASUREMENT_ID, { send_page_view: false });
			const s = document.createElement('script');
			s.src = `https://www.googletagmanager.com/gtag/js?id=${PUBLIC_GA_MEASUREMENT_ID}`;
			s.async = true;
			document.head.appendChild(s);
		}
		// Track page view on each navigation
		window.gtag?.('event', 'page_view', { page_path: page.url.pathname });
	});

	/** Server auth gates redirect here with `?login=1&redirect=…` instead of `/login` so we can use the modal */
	$effect(() => {
		if (!browser) return;
		if (page.url.searchParams.get('login') !== '1') return;

		const u = new URL(page.url.href);
		const r = u.searchParams.get('redirect');
		const safe = r && r.startsWith('/') && !r.startsWith('//') ? r : null;

		u.searchParams.delete('login');
		u.searchParams.delete('redirect');
		const clean = `${u.pathname}${u.search}${u.hash}`;

		if (data.user) {
			void goto(safe ?? '/humanize', { replaceState: true, noScroll: true });
			return;
		}

		openLoginModal(safe ?? '/humanize');
		void goto(clean || '/', { replaceState: true, noScroll: true });
	});

	onMount(() => {
		// Check for pending checkout (from PromoFloater)
		if (data.user) {
			const pending = localStorage.getItem('pending-checkout');
			if (pending) {
				try {
					const { variantId, billingCycle, discountCode } = JSON.parse(pending);
					localStorage.removeItem('pending-checkout');
					
					// Trigger checkout immediately
					setTimeout(async () => {
						try {
							const res = await fetch('/api/lemonsqueezy/checkout', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ variantId, billingCycle, discountCode })
							});

							const json = await res.json();

							if (res.ok && json.url) {
								window.location.href = json.url;
							}
						} catch {
							// Silently fail - user can retry from promo banner
						}
					}, 300);
				} catch {
					localStorage.removeItem('pending-checkout');
				}
			}
		}

		let debounce: ReturnType<typeof setTimeout> | null = null;
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
			// invalidateAll() refetched every load on the site (including token refresh) — very slow.
			// Root +layout.ts uses depends('supabase:auth'); only those loads need to re-run.
			if (event === 'INITIAL_SESSION') return;
			// Coalesce rapid TOKEN_REFRESHED / tab-focus bursts so GoTrue's storage lock is not hammered.
			if (debounce) clearTimeout(debounce);
			debounce = setTimeout(() => {
				debounce = null;
				invalidate('supabase:auth');
			}, 120);
		});
		return () => {
			subscription.unsubscribe();
			if (debounce) clearTimeout(debounce);
		};
	});
</script>

<div transition:fade={{ duration: 150 }}>
	{@render children()}
</div>

{#if $loginModalOpen}
	<LoginModal
		{supabase}
		variant="modal"
		redirectAfter={$loginModalRedirect}
		onClose={closeLoginModal}
	/>
{/if}

{#if $registerModalOpen}
	<RegisterModal
		{supabase}
		redirectAfter={$registerModalRedirect}
		onClose={closeRegisterModal}
	/>
{/if}
