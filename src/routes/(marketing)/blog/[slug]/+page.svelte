<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';

	let { data } = $props();
	let post = $derived(data.post);

	function formatDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: post.title,
		description: post.description,
		datePublished: post.date,
		author: { '@type': 'Organization', name: 'HumanizeAIWrite' },
		publisher: {
			'@type': 'Organization',
			name: 'HumanizeAIWrite',
			url: 'https://humanizeaiwrite.com'
		},
		mainEntityOfPage: `https://humanizeaiwrite.com/blog/${post.slug}`
	});
</script>

<SEO
	title={post.title}
	description={post.description}
	canonical="https://humanizeaiwrite.com/blog/{post.slug}"
	ogType="article"
	{jsonLd}
/>

<main style="max-width: 720px; margin: 0 auto; padding: 56px 24px 96px;">
	<!-- Back link -->
	<a
		href="/blog"
		style="
			display: inline-flex;
			align-items: center;
			gap: 6px;
			font-family: 'Space Grotesk', sans-serif;
			font-size: 13px;
			font-weight: 500;
			color: var(--color-text-muted);
			text-decoration: none;
			margin-bottom: 40px;
			transition: color 120ms;
		"
		onmouseenter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-brand)')}
		onmouseleave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-muted)')}
	>
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M19 12H5M12 5l-7 7 7 7"/>
		</svg>
		All posts
	</a>

	<!-- Article header -->
	<header style="margin-bottom: 40px;">
		<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
			<span style="font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-brand); background: var(--color-brand-muted); padding: 2px 8px; border-radius: 4px;">
				{post.category}
			</span>
			<span style="font-family: 'Space Grotesk', sans-serif; font-size: 12px; color: var(--color-text-muted);">
				{formatDate(post.date)} · {post.readMin} min read
			</span>
		</div>
		<h1 style="font-family: 'Newsreader', Georgia, serif; font-size: clamp(26px, 5vw, 40px); font-weight: 600; color: var(--color-text-primary); margin: 0 0 16px; line-height: 1.2; letter-spacing: -0.02em;">
			{post.title}
		</h1>
		<p style="font-family: 'Space Grotesk', sans-serif; font-size: 17px; color: var(--color-text-secondary); margin: 0; line-height: 1.6; font-style: italic;">
			{post.description}
		</p>
	</header>

	<hr style="border: none; border-top: 1px solid var(--color-bg-border); margin: 0 0 40px;" />

	<!-- Article body -->
	<article class="blog-body">
		{@html post.content}
	</article>

	<!-- CTA -->
	<div style="
		margin-top: 64px;
		padding: 32px;
		border-radius: 16px;
		background: var(--color-brand-muted);
		border: 1px solid var(--color-brand);
		text-align: center;
	">
		<p style="font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-brand); margin: 0 0 10px;">
			Try it free
		</p>
		<h2 style="font-family: 'Newsreader', Georgia, serif; font-size: 26px; font-weight: 600; color: var(--color-text-primary); margin: 0 0 10px; letter-spacing: -0.01em;">
			Ready to make your writing undetectable?
		</h2>
		<p style="font-family: 'Space Grotesk', sans-serif; font-size: 15px; color: var(--color-text-secondary); margin: 0 0 24px;">
			Paste your text and get human-sounding output in seconds. No account needed to start.
		</p>
		<div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
			<a
				href="/humanize"
				style="
					display: inline-block;
					padding: 12px 28px;
					border-radius: 999px;
					background: var(--color-brand);
					color: white;
					font-family: 'Space Grotesk', sans-serif;
					font-size: 15px;
					font-weight: 600;
					text-decoration: none;
				"
			>Humanize my text</a>
			<a
				href="/detect"
				style="
					display: inline-block;
					padding: 12px 28px;
					border-radius: 999px;
					background: var(--color-bg-surface);
					color: var(--color-text-primary);
					font-family: 'Space Grotesk', sans-serif;
					font-size: 15px;
					font-weight: 600;
					text-decoration: none;
					box-shadow: inset 0 0 0 1px var(--color-bg-border);
				"
			>Check my score</a>
		</div>
	</div>
</main>

<style>
	:global(.blog-body h2) {
		font-family: 'Newsreader', Georgia, serif;
		font-size: 24px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 40px 0 14px;
		letter-spacing: -0.01em;
		line-height: 1.3;
	}
	:global(.blog-body h3) {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 17px;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 28px 0 10px;
	}
	:global(.blog-body p) {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 16px;
		line-height: 1.75;
		color: var(--color-text-secondary);
		margin: 0 0 18px;
	}
	:global(.blog-body ul, .blog-body ol) {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 16px;
		line-height: 1.75;
		color: var(--color-text-secondary);
		margin: 0 0 18px;
		padding-left: 24px;
	}
	:global(.blog-body li) {
		margin-bottom: 6px;
	}
	:global(.blog-body strong) {
		color: var(--color-text-primary);
		font-weight: 600;
	}
	:global(.blog-body a) {
		color: var(--color-brand);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	:global(.blog-body a:hover) {
		text-decoration: none;
	}
	:global(.blog-body blockquote) {
		border-left: 3px solid var(--color-brand);
		margin: 24px 0;
		padding: 12px 20px;
		background: var(--color-bg-elevated);
		border-radius: 0 8px 8px 0;
	}
	:global(.blog-body blockquote p) {
		margin: 0;
		font-style: italic;
	}
</style>
