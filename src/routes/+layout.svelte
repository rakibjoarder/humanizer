<script lang="ts">
	import '../app.css';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let { data, children } = $props();
	let supabase = $derived(data.supabase);

	onMount(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
			invalidateAll();
		});
		return () => subscription.unsubscribe();
	});
</script>

<div transition:fade={{ duration: 150 }}>
	{@render children()}
</div>
