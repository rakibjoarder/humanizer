<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import { trackEvent } from '$lib/client/analytics';

	let name    = $state('');
	let email   = $state('');
	let subject = $state('');
	let message = $state('');
	let loading = $state(false);
	let success = $state(false);
	let error   = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const res = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, subject, message })
			});
			const json = await res.json();
			if (!res.ok) {
				error = json.error ?? 'Something went wrong. Please try again.';
				return;
			}
			trackEvent('contact_submit');
			success = true;
		} catch {
			error = 'Network error. Please check your connection.';
		} finally {
			loading = false;
		}
	}
</script>

<SEO
	title="Contact Us — HumanizeAIWrite"
	description="Get in touch with the HumanizeAIWrite team. We're here to help with any questions about our AI humanizer and detector tools."
	canonical="https://humanizeaiwrite.com/contact"
/>

<div style="max-width:640px;margin:0 auto;padding:clamp(40px,8vw,80px) clamp(16px,4vw,24px) 80px;">

	<div style="margin-bottom:40px;">
		<h1 style="font-family:'Newsreader',Georgia,serif;font-size:clamp(32px,5vw,48px);font-weight:400;color:var(--color-text-primary);margin:0 0 12px;letter-spacing:-0.02em;">Get in touch</h1>
		<p style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:16px;color:var(--color-text-secondary);margin:0;line-height:1.6;">
			Have a question, feedback, or need help? Fill out the form and we'll get back to you as soon as possible.
		</p>
	</div>

	{#if success}
		<div style="background:var(--color-bg-surface);border-radius:16px;box-shadow:inset 0 0 0 1px var(--color-bg-border);padding:40px 32px;text-align:center;">
			<div style="width:52px;height:52px;border-radius:50%;background:#05966915;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M20 6 9 17l-5-5"/>
				</svg>
			</div>
			<h2 style="font-family:'Newsreader',Georgia,serif;font-size:24px;font-weight:400;color:var(--color-text-primary);margin:0 0 8px;">Message sent!</h2>
			<p style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:15px;color:var(--color-text-secondary);margin:0;">
				Thanks for reaching out. We'll reply to <strong>{email}</strong> within 24 hours.
			</p>
		</div>
	{:else}
		<form onsubmit={handleSubmit} style="background:var(--color-bg-surface);border-radius:16px;box-shadow:inset 0 0 0 1px var(--color-bg-border);padding:32px;">

			<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
				<div>
					<label style="display:block;font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:600;color:var(--color-text-secondary);margin-bottom:6px;" for="contact-name">Name</label>
					<input
						id="contact-name"
						type="text"
						bind:value={name}
						required
						placeholder="Your name"
						style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--color-bg-border);background:var(--color-bg-elevated);color:var(--color-text-primary);font-family:'Space Grotesk',system-ui,sans-serif;font-size:14px;outline:none;box-sizing:border-box;"
					/>
				</div>
				<div>
					<label style="display:block;font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:600;color:var(--color-text-secondary);margin-bottom:6px;" for="contact-email">Email</label>
					<input
						id="contact-email"
						type="email"
						bind:value={email}
						required
						placeholder="you@example.com"
						style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--color-bg-border);background:var(--color-bg-elevated);color:var(--color-text-primary);font-family:'Space Grotesk',system-ui,sans-serif;font-size:14px;outline:none;box-sizing:border-box;"
					/>
				</div>
			</div>

			<div style="margin-bottom:16px;">
				<label style="display:block;font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:600;color:var(--color-text-secondary);margin-bottom:6px;" for="contact-subject">Subject</label>
				<input
					id="contact-subject"
					type="text"
					bind:value={subject}
					required
					placeholder="What's this about?"
					style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--color-bg-border);background:var(--color-bg-elevated);color:var(--color-text-primary);font-family:'Space Grotesk',system-ui,sans-serif;font-size:14px;outline:none;box-sizing:border-box;"
				/>
			</div>

			<div style="margin-bottom:24px;">
				<label style="display:block;font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:600;color:var(--color-text-secondary);margin-bottom:6px;" for="contact-message">Message</label>
				<textarea
					id="contact-message"
					bind:value={message}
					required
					rows="6"
					placeholder="Tell us how we can help..."
					style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--color-bg-border);background:var(--color-bg-elevated);color:var(--color-text-primary);font-family:'Space Grotesk',system-ui,sans-serif;font-size:14px;outline:none;resize:vertical;box-sizing:border-box;line-height:1.5;"
				></textarea>
			</div>

			{#if error}
				<div style="margin-bottom:16px;padding:10px 14px;border-radius:8px;background:#ef444415;border:1px solid #ef444440;font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;color:#ef4444;">
					{error}
				</div>
			{/if}

			<button
				type="submit"
				disabled={loading}
				style="width:100%;padding:12px;border-radius:10px;background:var(--color-brand);color:#fff;border:none;font-family:'Space Grotesk',system-ui,sans-serif;font-size:15px;font-weight:600;cursor:{loading ? 'not-allowed' : 'pointer'};opacity:{loading ? 0.7 : 1};transition:opacity 150ms;"
			>
				{loading ? 'Sending…' : 'Send message'}
			</button>
		</form>
	{/if}

	<!-- Alternate contact -->
	<div style="margin-top:32px;padding:20px 24px;border-radius:12px;background:var(--color-bg-surface);box-shadow:inset 0 0 0 1px var(--color-bg-border);display:flex;align-items:center;gap:16px;">
		<div style="width:36px;height:36px;border-radius:50%;background:var(--color-brand)15;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
				<rect width="20" height="16" x="2" y="4" rx="2"/>
				<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
			</svg>
		</div>
		<div>
			<p style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:600;color:var(--color-text-primary);margin:0 0 2px;">Prefer email?</p>
			<a href="mailto:info@droidappbd.com" style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;color:var(--color-brand);text-decoration:none;">info@droidappbd.com</a>
		</div>
	</div>

</div>
