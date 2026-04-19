<svelte:head>
	<title>Privacy Policy · HumanizeAIWrite</title>
	<meta name="description" content="Privacy Policy for HumanizeAIWrite — how we handle your account and text." />
</svelte:head>

<div class="legal-page">
	<div class="legal-inner">
		<p class="legal-meta">
			<a href="/" class="legal-back">← Home</a>
			<span class="legal-dot" aria-hidden="true">·</span>
			<span>Last updated: April 19, 2026</span>
		</p>

		<h1 class="legal-h1">Privacy Policy</h1>
		<p class="legal-lead">
			This policy explains how HumanizeAIWrite (“we,” “us”) collects, uses, and shares information when you use
			our website and services (AI detection and humanizing). If you do not agree, please do not use the service.
		</p>

		<section class="legal-section">
			<h2>1. Information we collect</h2>
			<p><strong>Account data.</strong> If you create an account, we may collect your email, name (if provided), and authentication identifiers from our auth provider.</p>
			<p>
				<strong>Usage and billing.</strong> We may process plan type, usage counts, and payment-related metadata
				through our payment processor (e.g. Stripe). We do not store full card numbers on our servers.
			</p>
			<p>
				<strong>Text you submit.</strong> To run detection or humanization, your text is sent to our systems and
				any upstream providers we use to perform those operations. See section 3.
			</p>
			<p>
				<strong>Technical data.</strong> We may collect IP address, device/browser type, and cookies or similar
				technologies needed to operate sessions, security, and basic analytics.
			</p>
		</section>

		<section class="legal-section">
			<h2>2. How we use information</h2>
			<ul>
				<li>Provide, secure, and improve the service.</li>
				<li>Authenticate users, enforce limits, and prevent abuse.</li>
				<li>Process subscriptions and communicate about your account.</li>
				<li>Comply with law and protect rights and safety.</li>
			</ul>
		</section>

		<section class="legal-section">
			<h2>3. Text processing and AI</h2>
			<p>
				We process your submissions to return detection or humanization results. We do not sell your text to third
				parties or use it to train public foundation models for our general offering, as described in product
				marketing; if we ever change that in a material way, we will update this policy and, where required,
				seek consent.
			</p>
			<p>
				Text may be held only as long as needed to complete the request and for minimal operational logs, unless
				you use features that explicitly save history to your account (e.g. activity), in which case we store
				what those features require.
			</p>
		</section>

		<section class="legal-section">
			<h2>4. Service providers</h2>
			<p>
				We use vendors for hosting, authentication (e.g. Supabase), payments (e.g. Stripe), and AI inference.
				They process data under contractual terms and only as needed to provide the service.
			</p>
		</section>

		<section class="legal-section">
			<h2>5. Cookies</h2>
			<p>
				We use cookies and similar technologies for session management, preferences, and security. You can control
				cookies through your browser; disabling them may limit functionality.
			</p>
		</section>

		<section class="legal-section">
			<h2>6. Retention</h2>
			<p>
				We retain account and billing records as needed for legal, tax, and operational purposes. Detection and
				humanization text is not kept longer than necessary for the purposes above unless a feature you use
				persists it to your account history.
			</p>
		</section>

		<section class="legal-section">
			<h2>7. Your rights</h2>
			<p>
				Depending on where you live, you may have rights to access, correct, delete, or export personal data,
				or to object to certain processing. Contact us to make a request. You may also unsubscribe from
				marketing emails via the link in those emails.
			</p>
		</section>

		<section class="legal-section">
			<h2>8. Children</h2>
			<p>
				The service is not directed at children under 13 (or the age required in your jurisdiction). We do not
				knowingly collect personal information from children.
			</p>
		</section>

		<section class="legal-section">
			<h2>9. International transfers</h2>
			<p>
				If you access the service from outside the country where we operate servers, your information may be
				processed in other countries with different data protection laws.
			</p>
		</section>

		<section class="legal-section">
			<h2>10. Changes</h2>
			<p>
				We may update this policy. We will post the new version here and change the “Last updated” date. Material
				changes may require additional notice where the law requires.
			</p>
		</section>

		<section class="legal-section">
			<h2>11. Contact</h2>
			<p>
				For privacy questions or requests, use the contact method we publish on the site (e.g. support email in
				the footer when available).
			</p>
		</section>

		<p class="legal-note">
			This policy is a template for development and is not legal advice. Align it with your actual data flows,
			vendors (Supabase, Stripe, AI provider), regions served, and counsel review.
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

	.legal-section strong {
		color: var(--color-text-primary);
		font-weight: 600;
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
