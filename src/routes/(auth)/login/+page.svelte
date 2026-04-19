<script lang="ts">
	import { page } from '$app/state';
	import LoginModal from '$lib/components/LoginModal.svelte';

	let { data } = $props();

	let supabase = $derived(data.supabase);
	let redirectAfter = $derived(page.url.searchParams.get('redirect') ?? '/');
</script>

<LoginModal {supabase} variant="page" {redirectAfter} />
