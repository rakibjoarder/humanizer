<script lang="ts">
	import { countWords, trimToMaxWords } from '$lib/limits';

	interface Props {
		value?: string;
		placeholder?: string;
		minChars?: number;
		maxChars?: number;
		/** When set, trims pasted/typed text to this many words (Free tier scans). */
		maxWords?: number;
		label?: string;
		readonly?: boolean;
		/** Stable DOM id for imperative updates (e.g. clear / paste sample while focused). */
		elementId?: string;
	}

	let {
		value = $bindable(''),
		placeholder = 'Paste or type your text here…',
		minChars,
		maxChars,
		maxWords,
		label,
		readonly = false,
		elementId = 'text-editor'
	}: Props = $props();

	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let focused = $state(false);

	// Svelte 5's bind:value has a focus guard that skips DOM updates when the element is
	// focused. This explicit effect ensures the DOM always reflects the reactive state
	// (e.g. when parent calls clear() or pasteSample() while the textarea is focused).
	$effect(() => {
		if (textareaEl && textareaEl.value !== value) {
			textareaEl.value = value;
		}
	});

	const charCount = $derived(value.length);
	const wordCount = $derived(countWords(value));

	const counterColor = $derived(
		maxWords != null
			? wordCount / maxWords >= 1
				? 'var(--color-ai)'
				: wordCount / maxWords >= 0.9
					? 'var(--color-uncertain)'
					: 'var(--color-text-muted)'
			: !maxChars
				? 'var(--color-text-muted)'
				: charCount / maxChars >= 1
					? 'var(--color-ai)'
					: charCount / maxChars >= 0.8
						? 'var(--color-uncertain)'
						: 'var(--color-text-muted)'
	);

	const belowMin = $derived(!!minChars && charCount > 0 && charCount < minChars);

	function formatNumber(n: number): string {
		return n.toLocaleString('en-US');
	}

	const counterText = $derived(
		maxWords != null
			? `${formatNumber(wordCount)} / ${formatNumber(maxWords)} words`
			: maxChars
				? `${formatNumber(charCount)} / ${formatNumber(maxChars)}`
				: formatNumber(charCount)
	);

	function handleInput(e: Event) {
		const target = e.currentTarget as HTMLTextAreaElement;
		let newVal = target.value;
		if (maxWords != null) {
			const trimmed = trimToMaxWords(newVal, maxWords);
			if (trimmed !== newVal) {
				newVal = trimmed;
				target.value = newVal;
			}
		}
		if (maxChars && newVal.length > maxChars) {
			newVal = newVal.slice(0, maxChars);
			target.value = newVal;
		}
		value = newVal;
	}

	const containerShadow = $derived(
		focused
			? 'inset 0 0 0 1px var(--color-brand), 0 0 0 3px var(--color-brand-glow)'
			: 'inset 0 0 0 1px var(--color-bg-border)'
	);
</script>

<div style="display:flex;flex-direction:column;gap:8px;width:100%;">
	{#if label}
		<label
			for="text-editor"
			style="
				font-family:'Space Grotesk',system-ui,sans-serif;
				font-size:13px;
				font-weight:500;
				color:var(--color-text-secondary);
				letter-spacing:0.02em;
			"
		>{label}</label>
	{/if}

	<div
		style="
			position:relative;
			display:flex;
			flex-direction:column;
			border-radius:12px;
			background:var(--color-bg-elevated);
			box-shadow:{containerShadow};
			transition:box-shadow 150ms ease;
			overflow:hidden;
		"
	>
		<textarea
			id={elementId}
			bind:this={textareaEl}
			bind:value
			{placeholder}
			{readonly}
			oninput={handleInput}
			onfocus={() => { focused = true; }}
			onblur={() => { focused = false; }}
			spellcheck="true"
			aria-label={label ?? 'Text input'}
			aria-describedby={belowMin ? 'min-chars-warning' : undefined}
			style="
				font-family:'Space Grotesk',system-ui,sans-serif;
				font-size:15px;
				line-height:1.65;
				color:var(--color-text-primary);
				background:transparent;
				border:none;
				outline:none;
				padding:18px 20px 44px;
				min-height:200px;
				resize:vertical;
				width:100%;
				caret-color:var(--color-brand);
			"
		></textarea>

		<!-- Counter row: absolute over textarea bottom -->
		<div
			style="
				position:absolute;
				bottom:0;
				left:0;
				right:0;
				display:flex;
				align-items:center;
				justify-content:space-between;
				padding:8px 16px;
				pointer-events:none;
			"
		>
			{#if belowMin}
				<span
					id="min-chars-warning"
					role="alert"
					style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;color:var(--color-uncertain);"
				>Minimum {minChars} characters required</span>
			{:else}
				<span></span>
			{/if}

			<span
				style="
					font-family:'JetBrains Mono',monospace;
					font-size:12px;
					color:{counterColor};
					transition:color 200ms ease;
				"
			>{counterText}</span>
		</div>
	</div>
</div>

<style>
	textarea::placeholder {
		color: var(--color-text-muted);
	}
	textarea:read-only {
		cursor: default;
		color: var(--color-text-secondary);
	}
</style>
