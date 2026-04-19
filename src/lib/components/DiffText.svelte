<script lang="ts">
	interface Props {
		text: string;
		flags: Set<string>;
		color: string;
		mono?: boolean;
	}

	let { text, flags, color, mono = false }: Props = $props();

	// Split on whitespace, preserving the whitespace tokens between words
	const tokens = $derived(text.split(/(\s+)/));

	function isHighlighted(word: string): boolean {
		if (flags.has(word)) return true;
		const stripped = word.replace(/[.,;:!?"']+$/, '');
		return flags.has(stripped);
	}
</script>

<span
	style="
		font-family: {mono ? "'JetBrains Mono', monospace" : "'Space Grotesk', system-ui, sans-serif"};
		font-size: 15px;
		line-height: 1.75;
		white-space: pre-wrap;
		word-break: break-word;
	"
>{#each tokens as token}{#if /^\s+$/.test(token)}{token}{:else if isHighlighted(token)}<mark style="
			background: {color}1f;
			color: {color};
			padding: 1px 4px;
			border-radius: 4px;
			box-shadow: inset 0 -1px 0 {color}55;
			font-family: inherit;
			font-size: inherit;
		">{token}</mark>{:else}{token}{/if}{/each}</span>
