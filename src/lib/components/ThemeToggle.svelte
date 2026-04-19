<script lang="ts">
	import { onMount } from 'svelte';
	import { applyTheme, getDocumentTheme, THEME_STORAGE_KEY, type ThemeMode } from '$lib/theme';

	let mode = $state<ThemeMode>('dark');

	onMount(() => {
		mode = getDocumentTheme();
		const onStorage = (e: StorageEvent) => {
			if (e.key !== THEME_STORAGE_KEY) return;
			const next: ThemeMode = e.newValue === 'light' ? 'light' : 'dark';
			applyTheme(next);
			mode = next;
		};
		window.addEventListener('storage', onStorage);
		return () => window.removeEventListener('storage', onStorage);
	});

	function onClick() {
		const next = mode === 'dark' ? 'light' : 'dark';
		applyTheme(next);
		mode = next;
	}

	const sunIcon =
		'M12 3v1 M12 20v1 M4.22 4.22l.7.7 M18.36 18.36l.7.7 M1 12h1 M22 12h1 M4.22 19.78l.7-.7 M18.36 5.64l.7-.7 M8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0';
	const moonIcon = 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z';
</script>

<button
	type="button"
	class="nav-theme-toggle"
	onclick={onClick}
	title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	style="
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		border-radius: 9px;
		border: 1px solid var(--color-bg-border);
		background: var(--color-bg-elevated);
		color: var(--color-text-secondary);
		cursor: pointer;
		flex-shrink: 0;
		transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
	"
	onmouseenter={(e) => {
		const el = e.currentTarget as HTMLButtonElement;
		el.style.background = 'var(--color-bg-border)';
		el.style.color = 'var(--color-text-primary)';
	}}
	onmouseleave={(e) => {
		const el = e.currentTarget as HTMLButtonElement;
		el.style.background = 'var(--color-bg-elevated)';
		el.style.color = 'var(--color-text-secondary)';
	}}
>
	{#if mode === 'dark'}
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d={sunIcon} />
		</svg>
	{:else}
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d={moonIcon} />
		</svg>
	{/if}
</button>
