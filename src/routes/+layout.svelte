<script lang="ts">
	import '../app.css';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import type { AuthChangeEvent } from '@supabase/supabase-js';

	let { data, children } = $props();
	let supabase = $derived(data.supabase);

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
