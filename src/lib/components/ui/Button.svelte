<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		variant?: Variant;
		size?: Size;
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		icon?: string;
		iconRight?: string;
		onclick?: (e: MouseEvent) => void;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		type = 'button',
		icon,
		iconRight,
		onclick,
		children
	}: Props = $props();

	const isDisabled = $derived(disabled || loading);

	let pressed = $state(false);

	const variantStyle = $derived(() => {
		switch (variant) {
			case 'primary':
				return `background:var(--color-brand);color:#fff;box-shadow:0 1px 0 rgba(255,255,255,0.15) inset,0 -1px 0 rgba(0,0,0,0.15) inset,0 8px 24px -10px var(--color-brand);`;
			case 'secondary':
				return `background:var(--color-bg-elevated);color:var(--color-text-primary);box-shadow:inset 0 0 0 1px var(--color-bg-border);`;
			case 'ghost':
				return `background:transparent;color:var(--color-text-secondary);box-shadow:none;`;
			case 'danger':
				return `background:var(--color-ai-muted);color:var(--color-ai);box-shadow:inset 0 0 0 1px rgba(239,68,68,0.4);`;
		}
	});

	const sizeStyle = $derived(() => {
		switch (size) {
			case 'sm':
				return `padding:7px 12px;font-size:12.5px;`;
			case 'md':
				return `padding:10px 18px;font-size:13.5px;`;
			case 'lg':
				return `padding:14px 24px;font-size:14.5px;`;
		}
	});

	function handleClick(e: MouseEvent) {
		if (isDisabled) { e.preventDefault(); return; }
		onclick?.(e);
	}
</script>

<button
	{type}
	disabled={isDisabled}
	aria-disabled={isDisabled}
	aria-busy={loading}
	onclick={handleClick}
	onmousedown={() => { pressed = true; }}
	onmouseup={() => { pressed = false; }}
	onmouseleave={() => { pressed = false; }}
	style="
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		border: none;
		border-radius: 9px;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-weight: 600;
		letter-spacing: -0.005em;
		cursor: {isDisabled ? 'not-allowed' : 'pointer'};
		opacity: {isDisabled ? 0.45 : 1};
		transform: {pressed && !isDisabled ? 'scale(0.985)' : 'scale(1)'};
		transition: opacity 150ms ease, transform 80ms ease, box-shadow 150ms ease, background 150ms ease;
		white-space: nowrap;
		user-select: none;
		{variantStyle()}
		{sizeStyle()}
	"
>
	{#if loading}
		<span style="display:inline-flex;align-items:center;gap:3px;" aria-hidden="true">
			<span style="width:5px;height:5px;border-radius:50%;background:currentColor;animation:hai-dots 1.2s 0ms infinite;"></span>
			<span style="width:5px;height:5px;border-radius:50%;background:currentColor;animation:hai-dots 1.2s 160ms infinite;"></span>
			<span style="width:5px;height:5px;border-radius:50%;background:currentColor;animation:hai-dots 1.2s 320ms infinite;"></span>
		</span>
		<span style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">Loading…</span>
	{:else}
		{#if icon}
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d={icon} />
			</svg>
		{/if}
		{#if children}{@render children()}{/if}
		{#if iconRight}
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d={iconRight} />
			</svg>
		{/if}
	{/if}
</button>
