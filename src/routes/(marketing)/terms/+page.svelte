<svelte:head>
	<title>Terms of Service · HumanizeAIWrite</title>
	<meta name="description" content="Terms of Service for HumanizeAIWrite — AI detection and humanizing tools." />
</svelte:head>

<div class="legal-page">
	<div class="legal-inner">
		<p class="legal-meta">
			<a href="/" class="legal-back">← Home</a>
			<span class="legal-dot" aria-hidden="true">·</span>
			<span>Last updated: April 19, 2026</span>
		</p>

		<h1 class="legal-h1">Terms of Service</h1>
		<p class="legal-lead">
			These Terms govern your use of HumanizeAIWrite (“we,” “us,” or “our”) website and services, including AI
			detection and text humanization features. By accessing or using the service, you agree to these Terms.
		</p>

		<section class="legal-section">
			<h2>1. The service</h2>
			<p>
				HumanizeAIWrite provides tools to analyze text for AI-like patterns and to rewrite text to read more
				naturally. Features, limits, and availability may change; we describe current plans on our
				<a href="/pricing">Pricing</a> page.
			</p>
		</section>

		<section class="legal-section">
			<h2>2. Accounts</h2>
			<p>
				You may need an account to use certain features. You are responsible for safeguarding your credentials
				and for activity under your account. You must provide accurate information and keep it up to date.
			</p>
		</section>

		<section class="legal-section">
			<h2>3. Acceptable use</h2>
			<p>You agree not to:</p>
			<ul>
				<li>Use the service for unlawful purposes or in violation of applicable laws or third-party rights.</li>
				<li>
					Use detection or humanization to facilitate academic dishonesty, fraud, impersonation, harassment, or
					harm.
				</li>
				<li>Attempt to probe, disrupt, or overload our systems, or circumvent security or usage limits.</li>
				<li>Reverse engineer or scrape the service except as allowed by law.</li>
			</ul>
			<p>
				We may suspend or terminate access for violations. You are responsible for your use of outputs and for
				complying with policies of schools, employers, or platforms where you submit text.
			</p>
		</section>

		<section class="legal-section">
			<h2>4. Subscriptions and payment</h2>
			<p>
				Paid plans are billed through our payment processor (e.g. Stripe). Fees, renewal, cancellation, and
				refunds are described at checkout and in communications from us or Stripe. Taxes may apply based on your
				location.
			</p>
		</section>

		<section class="legal-section">
			<h2>5. Intellectual property</h2>
			<p>
				The service, branding, and our materials are owned by us or our licensors. We do not claim ownership of
				text you submit; you retain your rights subject to the license needed to operate the service (see our
				<a href="/privacy">Privacy Policy</a>).
			</p>
		</section>

		<section class="legal-section">
			<h2>6. Disclaimers</h2>
			<p>
				The service is provided “as is.” AI detection and humanization are probabilistic and may be wrong or
				incomplete. We do not guarantee specific outcomes, accuracy, or fitness for a particular purpose. You use
				outputs at your own risk.
			</p>
		</section>

		<section class="legal-section">
			<h2>7. Limitation of liability</h2>
			<p>
				To the maximum extent permitted by law, we are not liable for indirect, incidental, special,
				consequential, or punitive damages, or for loss of profits, data, or goodwill. Our total liability for
				claims relating to the service is limited to the greater of (a) amounts you paid us in the twelve months
				before the claim or (b) fifty U.S. dollars, except where prohibited by law.
			</p>
		</section>

		<section class="legal-section">
			<h2>8. Changes</h2>
			<p>
				We may update these Terms. We will post the revised Terms on this page and update the “Last updated”
				date. Continued use after changes constitutes acceptance of the updated Terms, to the extent permitted by
				law.
			</p>
		</section>

		<section class="legal-section">
			<h2>9. Contact</h2>
			<p>
				Questions about these Terms: contact us using the email or form we provide for support (see our site
				footer or <a href="/">home page</a>).
			</p>
		</section>

		<p class="legal-note">
			This page is a practical template for a small SaaS product and is not legal advice. Have qualified counsel
			review and adapt it for your entity, jurisdiction, and Stripe/Supabase setup.
		</p>
	</div>
</div>

<style>
	.legal-page {
		min-height: 60vh;
		padding: 48px 24px 96px;
		background: var(--color-bg-base);
	}

	.legal-inner {
		max-width: 720px;
		margin: 0 auto;
	}

	.legal-meta {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0 0 24px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}

	.legal-back {
		color: var(--color-brand);
		font-weight: 600;
		text-decoration: none;
	}

	.legal-back:hover {
		text-decoration: underline;
	}

	.legal-dot {
		opacity: 0.5;
	}

	.legal-h1 {
		font-family: 'Newsreader', Georgia, serif;
		font-size: clamp(2rem, 4vw, 2.75rem);
		font-weight: 400;
		color: var(--color-text-primary);
		margin: 0 0 16px;
		letter-spacing: -0.02em;
		line-height: 1.15;
	}

	.legal-lead {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 16px;
		line-height: 1.65;
		color: var(--color-text-secondary);
		margin: 0 0 40px;
	}

	.legal-section {
		margin-bottom: 28px;
	}

	.legal-section h2 {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 15px;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 10px;
		letter-spacing: -0.01em;
	}

	.legal-section p,
	.legal-section li {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 14px;
		line-height: 1.65;
		color: var(--color-text-secondary);
		margin: 0 0 12px;
	}

	.legal-section ul {
		margin: 0 0 12px;
		padding-left: 1.25rem;
	}

	.legal-section li {
		margin-bottom: 8px;
	}

	.legal-section a {
		color: var(--color-brand);
		font-weight: 600;
		text-decoration: none;
	}

	.legal-section a:hover {
		text-decoration: underline;
	}

	.legal-note {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 12px;
		line-height: 1.55;
		color: var(--color-text-dim);
		margin: 48px 0 0;
		padding-top: 24px;
		border-top: 1px solid var(--color-bg-border);
	}
</style>
