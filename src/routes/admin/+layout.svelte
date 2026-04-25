<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();

	let mobileNavOpen = $state(false);

	const navLinks = [
		{ href: '/admin', label: 'Overview' },
		{ href: '/admin/users', label: 'Users' },
		{ href: '/admin/subscriptions', label: 'Subscriptions' },
		{ href: '/admin/detections', label: 'Detections' },
		{ href: '/admin/humanizations', label: 'Humanizations' },
		{ href: '/admin/messages', label: 'Messages' }
	];

	function isActive(href: string) {
		return page.url.pathname === href || (href !== '/admin' && page.url.pathname.startsWith(href));
	}
</script>

<div class="admin-shell">
	<!-- Sidebar (desktop) / Top bar (mobile) -->
	<aside class="admin-sidebar" class:mobile-open={mobileNavOpen}>
		<div class="admin-sidebar-header">
			<div class="admin-brand">
				<span class="admin-brand-title">Admin</span>
				<span class="admin-brand-sub">HumanizeAIWrite</span>
			</div>
			<!-- Mobile hamburger -->
			<button
				type="button"
				class="admin-hamburger"
				onclick={() => (mobileNavOpen = !mobileNavOpen)}
				aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
				aria-expanded={mobileNavOpen}
			>
				{#if mobileNavOpen}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				{:else}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
				{/if}
			</button>
		</div>

		<!-- Nav links -->
		<nav class="admin-nav" class:nav-visible={mobileNavOpen}>
			{#each navLinks as link}
				<a
					href={link.href}
					class="admin-nav-link"
					class:active={isActive(link.href)}
					onclick={() => (mobileNavOpen = false)}
				>{link.label}</a>
			{/each}

			<div class="admin-sidebar-footer">
				<a href="/dashboard" class="admin-back-link">← Back to app</a>
			</div>
		</nav>
	</aside>

	<!-- Backdrop for mobile -->
	{#if mobileNavOpen}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<div class="admin-backdrop" role="presentation" onclick={() => (mobileNavOpen = false)}></div>
	{/if}

	<!-- Main content -->
	<main class="admin-main">
		{@render children()}
	</main>
</div>

<style>
	.admin-shell {
		display: flex;
		min-height: 100vh;
		background: var(--color-bg-base);
	}

	/* ── Sidebar ─────────────────────────────────────────── */
	.admin-sidebar {
		width: 220px;
		flex-shrink: 0;
		background: var(--color-bg-surface);
		border-right: 1px solid var(--color-bg-border);
		display: flex;
		flex-direction: column;
	}

	.admin-sidebar-header {
		padding: 20px 20px 16px;
		border-bottom: 1px solid var(--color-bg-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.admin-brand { display: flex; flex-direction: column; gap: 2px; }
	.admin-brand-title {
		font-family: 'Instrument Serif', Georgia, serif;
		font-size: 18px;
		color: var(--color-text-primary);
		line-height: 1;
	}
	.admin-brand-sub {
		font-family: 'Space Grotesk', system-ui;
		font-size: 10px;
		color: var(--color-brand);
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.admin-hamburger {
		display: none;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border: 1px solid var(--color-bg-border);
		border-radius: 8px;
		background: var(--color-bg-elevated);
		color: var(--color-text-secondary);
		cursor: pointer;
		flex-shrink: 0;
	}

	.admin-nav {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px 0;
		flex: 1;
	}

	.admin-nav-link {
		display: block;
		padding: 9px 20px;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13.5px;
		text-decoration: none;
		color: var(--color-text-secondary);
		font-weight: 400;
		border-left: 2px solid transparent;
		white-space: nowrap;
		transition: background 120ms, color 120ms;
	}
	.admin-nav-link:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.admin-nav-link.active {
		background: var(--color-brand-muted);
		color: var(--color-brand);
		font-weight: 600;
		border-left-color: var(--color-brand);
	}

	.admin-sidebar-footer {
		margin-top: auto;
		padding: 16px 20px;
		border-top: 1px solid var(--color-bg-border);
	}
	.admin-back-link {
		font-family: 'Space Grotesk', system-ui;
		font-size: 12px;
		color: var(--color-text-muted);
		text-decoration: none;
	}
	.admin-back-link:hover { color: var(--color-text-primary); }

	/* ── Main ─────────────────────────────────────────────── */
	.admin-main {
		flex: 1;
		padding: 32px;
		overflow-y: auto;
		min-width: 0;
	}

	.admin-backdrop { display: none; }

	/* ── Mobile ───────────────────────────────────────────── */
	@media (max-width: 768px) {
		.admin-shell { flex-direction: column; }

		.admin-sidebar {
			width: 100%;
			border-right: none;
			border-bottom: 1px solid var(--color-bg-border);
			position: relative;
			z-index: 50;
		}

		.admin-hamburger { display: flex; }

		/* Nav hidden by default on mobile */
		.admin-nav {
			display: none;
			padding: 8px 0 12px;
			border-top: 1px solid var(--color-bg-border);
		}
		.admin-nav.nav-visible { display: flex; }

		.admin-nav-link {
			border-left: none;
			border-radius: 0;
			padding: 11px 20px;
		}
		.admin-nav-link.active {
			border-left: none;
			border-left: 3px solid var(--color-brand);
		}

		.admin-sidebar-footer {
			border-top: 1px solid var(--color-bg-border);
			padding: 12px 20px;
		}

		.admin-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 40;
			background: rgba(0, 0, 0, 0.3);
		}

		.admin-main { padding: 18px 16px 32px; }
	}

	@media (max-width: 480px) {
		.admin-main { padding: 14px 12px 28px; }
	}
</style>
