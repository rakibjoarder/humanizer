<script lang="ts">
	interface Props {
		size?: number;
		onclick?: () => void;
	}

	let { size = 32, onclick }: Props = $props();

	const wordmarkSize = $derived(size * 0.5625);
</script>

<button
	type="button"
	class="logo-btn"
	style="gap: {size * 0.375}px;"
	onclick={onclick}
	aria-label="HumanizeAIWrite home"
>
	<img
		class="logo-icon logo-dark"
		src="/assets/icon-dark.svg"
		width={size}
		height={size}
		alt=""
		aria-hidden="true"
	/>
	<img
		class="logo-icon logo-light"
		src="/assets/icon-light.svg"
		width={size}
		height={size}
		alt=""
		aria-hidden="true"
	/>

	<span
		class="logo-wordmark"
		style="font-size: {wordmarkSize}px;"
	>Humanize<span class="logo-ai">AI</span>Write</span>
</button>

<style>
	.logo-btn {
		display: inline-flex;
		align-items: center;
		background: none;
		border: none;
		padding: 0;
		cursor: var(--logo-cursor, default);
		user-select: none;
	}

	.logo-icon {
		border-radius: 22%;
		flex-shrink: 0;
	}

	/* theme switching */
	.logo-light { display: none; }

	:global(html[data-theme='light']) .logo-dark { display: none; }
	:global(html[data-theme='light']) .logo-light { display: block; }

	.logo-wordmark {
		font-family: 'Newsreader', Georgia, serif;
		font-weight: 500;
		color: var(--color-text-primary);
		letter-spacing: -0.02em;
		line-height: 1;
		white-space: nowrap;
	}

	.logo-ai {
		color: var(--color-brand);
		font-style: italic;
	}
</style>
