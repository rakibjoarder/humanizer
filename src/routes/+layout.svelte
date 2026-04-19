<script lang="ts">
	import '../app.css';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { goto, invalidate } from '$app/navigation';
	import type { AuthChangeEvent } from '@supabase/supabase-js';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import { loginModalOpen, loginModalRedirect, closeLoginModal, openLoginModal } from '$lib/stores/loginModal';

	let { data, children } = $props();
	let supabase = $derived(data.supabase);

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
			void goto(safe ?? (clean || '/'), { replaceState: true, noScroll: true });
			return;
		}

		openLoginModal(safe);
		void goto(clean || '/', { replaceState: true, noScroll: true });
	});

	onMount(() => {
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
