<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		delay?: number;
	}

	let { children, delay = 0 }: Props = $props();

	let el = $state<HTMLDivElement | null>(null);
	let inView = $state(false);

	onMount(() => {
		const io = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					inView = true;
					io.disconnect();
				}
			},
			{ threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
		);
		if (el) io.observe(el);
		return () => io.disconnect();
	});
</script>

<div
	bind:this={el}
	class="hai-reveal {inView ? 'is-in' : ''}"
	style={inView ? `animation-delay:${delay}ms` : ''}
>
	{@render children()}
</div>
