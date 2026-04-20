<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';

	let { data } = $props();

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}
</script>

<SEO
	title="Blog — AI Detection & Humanizing Guides"
	description="Guides, comparisons, and tips for bypassing AI detection tools like GPTZero and Turnitin. Learn how to make AI-generated text undetectable."
	canonical="https://humanizeaiwrite.com/blog"
/>

<main style="max-width: 860px; margin: 0 auto; padding: 64px 24px 96px;">
	<header style="margin-bottom: 56px;">
		<p style="font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-brand); margin: 0 0 12px;">
			Blog
		</p>
		<h1 style="font-family: 'Newsreader', Georgia, serif; font-size: clamp(32px, 5vw, 48px); font-weight: 600; color: var(--color-text-primary); margin: 0 0 16px; line-height: 1.15; letter-spacing: -0.02em;">
			Guides & Insights
		</h1>
		<p style="font-family: 'Space Grotesk', sans-serif; font-size: 17px; color: var(--color-text-secondary); margin: 0; max-width: 520px; line-height: 1.6;">
			Everything you need to know about AI detection — how it works, why it flags human writing, and how to make your text pass every time.
		</p>
	</header>

	<div style="display: flex; flex-direction: column; gap: 2px;">
		{#each data.posts as post}
			<a
				href="/blog/{post.slug}"
				style="
					display: block;
					padding: 28px 0;
					border-bottom: 1px solid var(--color-bg-border);
					text-decoration: none;
					transition: none;
				"
				onmouseenter={(e) => {
					(e.currentTarget as HTMLAnchorElement).style.paddingLeft = '8px';
					(e.currentTarget as HTMLAnchorElement).style.transition = 'padding 150ms ease';
				}}
				onmouseleave={(e) => {
					(e.currentTarget as HTMLAnchorElement).style.paddingLeft = '0';
				}}
			>
				<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
					<span style="font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-brand); background: var(--color-brand-muted); padding: 2px 8px; border-radius: 4px;">
						{post.category}
					</span>
					<span style="font-family: 'Space Grotesk', sans-serif; font-size: 12px; color: var(--color-text-muted);">
						{formatDate(post.date)} · {post.readMin} min read
					</span>
				</div>
				<h2 style="font-family: 'Newsreader', Georgia, serif; font-size: clamp(18px, 3vw, 22px); font-weight: 600; color: var(--color-text-primary); margin: 0 0 8px; line-height: 1.3; letter-spacing: -0.01em;">
					{post.title}
				</h2>
				<p style="font-family: 'Space Grotesk', sans-serif; font-size: 15px; color: var(--color-text-secondary); margin: 0; line-height: 1.6; max-width: 640px;">
					{post.description}
				</p>
			</a>
		{/each}
	</div>
</main>
