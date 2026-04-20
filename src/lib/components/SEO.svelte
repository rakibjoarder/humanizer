<script lang="ts">
	interface Props {
		title?: string;
		description?: string;
		canonical?: string;
		ogImage?: string;
		/** 'website' for home/marketing, 'article' for blog-style pages */
		ogType?: 'website' | 'article';
		noindex?: boolean;
		jsonLd?: object | null;
	}

	const SITE_NAME = 'HumanizeAIWrite';
	const SITE_URL = 'https://humanizeaiwrite.com';
	const DEFAULT_OG = `https://www.humanizeaiwrite.com/og-default.png`;
	const DEFAULT_DESCRIPTION =
		'Instantly humanize AI-generated text. Bypass GPTZero, Turnitin, and other AI detectors. Free to try — no account needed.';

	let {
		title = 'HumanizeAIWrite — Bypass AI Detection',
		description = DEFAULT_DESCRIPTION,
		canonical,
		ogImage = DEFAULT_OG,
		ogType = 'website',
		noindex = false,
		jsonLd = null
	}: Props = $props();

	let fullTitle = $derived(
		title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
	);
	let canonicalUrl = $derived(canonical ?? SITE_URL);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={canonicalUrl} />
	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{:else}
		<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
	{/if}

	<!-- Open Graph -->
	<meta property="og:type" content={ogType} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:locale" content="en_US" />

	<!-- Twitter / X -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={ogImage} />

	<!-- Extra search signals -->
	<meta name="author" content={SITE_NAME} />
	<meta name="theme-color" content="#5b21b6" />

	{#if jsonLd}
		{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>`}
	{/if}
</svelte:head>
