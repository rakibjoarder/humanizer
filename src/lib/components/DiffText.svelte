<script lang="ts">
	interface Props {
		text: string;
		flags: Set<string>;
		color: string;
		mono?: boolean;
		phrases?: string[];
	}

	let { text, flags, color, mono = false, phrases = [] }: Props = $props();

	interface Segment { t: string; hi: boolean }

	function buildSegments(text: string, flags: Set<string>, phrases: string[]): Segment[] {
		if (!text) return [];

		const all = phrases.filter(Boolean);
		if (all.length === 0) {
			return text.split(/(\s+)/).map(tok => ({
				t: tok,
				hi: !/^\s+$/.test(tok) && (flags.has(tok) || flags.has(tok.replace(/[.,;:!?"']+$/, '')))
			}));
		}

		const escaped = all.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		escaped.sort((a, b) => b.length - a.length);
		const re = new RegExp(`(${escaped.join('|')})`, 'gi');

		const result: Segment[] = [];
		let last = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(text)) !== null) {
			if (m.index > last) result.push({ t: text.slice(last, m.index), hi: false });
			result.push({ t: m[0], hi: true });
			last = m.index + m[0].length;
		}
		if (last < text.length) result.push({ t: text.slice(last), hi: false });
		return result;
	}

	const segments = $derived(buildSegments(text, flags, phrases));
</script>

<span
	style="
		font-family: {mono ? "'JetBrains Mono', monospace" : "'Space Grotesk', system-ui, sans-serif"};
		font-size: 15px;
		line-height: 1.75;
		white-space: pre-wrap;
		word-break: break-word;
	"
>{#each segments as seg}{#if seg.hi}<mark style="
			background: {color}1f;
			color: {color};
			padding: 1px 4px;
			border-radius: 4px;
			box-shadow: inset 0 -1px 0 {color}55;
			font-family: inherit;
			font-size: inherit;
		">{seg.t}</mark>{:else}{seg.t}{/if}{/each}</span>
