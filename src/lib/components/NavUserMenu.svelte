<script lang="ts">
	import { onMount } from 'svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';

	type Profile = {
		full_name: string | null;
	} | null;

	interface Props {
		supabase: SupabaseClient;
		user: { email?: string | null };
		profile?: Profile;
	}

	let { supabase, user, profile = null }: Props = $props();

	let open = $state(false);
	let wrapEl = $state<HTMLDivElement | null>(null);

	const avatarInitial = $derived(
		profile?.full_name
			? profile.full_name.charAt(0).toUpperCase()
			: (user?.email?.charAt(0).toUpperCase() ?? '?')
	);

	const displayName = $derived(profile?.full_name?.trim() || user?.email || 'Account');

	async function signOut() {
		open = false;
		await supabase.auth.signOut();
		window.location.href = '/';
	}

	function toggle() {
		open = !open;
	}

	onMount(() => {
		const onDocClick = (e: MouseEvent) => {
			if (!open || !wrapEl) return;
			if (!wrapEl.contains(e.target as Node)) open = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		document.addEventListener('click', onDocClick, true);
		window.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDocClick, true);
			window.removeEventListener('keydown', onKey);
		};
	});
</script>

<div bind:this={wrapEl} style="position: relative; flex-shrink: 0;">
	<button
		type="button"
		onclick={(e) => {
			e.stopPropagation();
			toggle();
		}}
		title="Account menu"
		aria-label="Account menu ({user.email})"
		aria-expanded={open}
		aria-haspopup="true"
		style="
			width: 32px;
			height: 32px;
			border-radius: 50%;
			background: var(--color-brand);
			color: white;
			border: none;
			cursor: pointer;
			font-family: 'Space Grotesk', system-ui, sans-serif;
			font-size: 13px;
			font-weight: 700;
			display: flex;
			align-items: center;
			justify-content: center;
			box-shadow: {open ? '0 0 0 2px var(--color-bg-base), 0 0 0 4px var(--color-brand)' : 'none'};
		"
	>{avatarInitial}</button>

	{#if open}
		<div
			style="
				position: absolute;
				top: calc(100% + 8px);
				right: 0;
				min-width: 200px;
				padding: 8px;
				background: var(--color-bg-surface);
				border: 1px solid var(--color-bg-border);
				border-radius: 10px;
				box-shadow: var(--shadow-dropdown);
				z-index: 60;
			"
		>
			<div
				style="
					padding: 8px 10px 10px;
					border-bottom: 1px solid var(--color-divider);
					margin-bottom: 6px;
				"
			>
				<div
					style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13px; font-weight: 600; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
				>
					{displayName}
				</div>
				{#if user.email}
					<div
						style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 11px; color: var(--color-text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
					>
						{user.email}
					</div>
				{/if}
			</div>
			<a
				href="/settings"
				onclick={() => (open = false)}
				style="
					display: block;
					padding: 9px 10px;
					border-radius: 7px;
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 13px;
					font-weight: 500;
					color: var(--color-text-secondary);
					text-decoration: none;
				"
				onmouseenter={(e) => {
					(e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-bg-elevated)';
					(e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-primary)';
				}}
				onmouseleave={(e) => {
					(e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
					(e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-secondary)';
				}}
			>Settings</a>
			<button
				type="button"
				onclick={() => signOut()}
				style="
					display: block;
					width: 100%;
					margin-top: 4px;
					padding: 9px 10px;
					border: none;
					border-radius: 7px;
					text-align: left;
					font-family: 'Space Grotesk', system-ui, sans-serif;
					font-size: 13px;
					font-weight: 500;
					color: var(--color-ai);
					background: transparent;
					cursor: pointer;
				"
				onmouseenter={(e) => {
					(e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-elevated)';
				}}
				onmouseleave={(e) => {
					(e.currentTarget as HTMLButtonElement).style.background = 'transparent';
				}}
			>Sign out</button>
		</div>
	{/if}
</div>
