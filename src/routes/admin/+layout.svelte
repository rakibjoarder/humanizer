<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();

	const navLinks = [
		{ href: '/admin', label: 'Overview' },
		{ href: '/admin/users', label: 'Users' },
		{ href: '/admin/subscriptions', label: 'Subscriptions' },
		{ href: '/admin/detections', label: 'Detections' },
		{ href: '/admin/humanizations', label: 'Humanizations' }
	];
</script>

<div class="admin-shell">
	<!-- Sidebar -->
	<aside class="admin-sidebar">
		<div class="admin-sidebar-header">
			<span style="font-family: 'Instrument Serif', Georgia, serif; font-size: 18px; color: var(--color-text-primary);">Admin</span>
			<span style="font-family: 'Space Grotesk', system-ui; font-size: 10px; color: var(--color-brand); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; display: block;">HumanizeAIWrite</span>
		</div>

		{#each navLinks as link}
			<a
				href={link.href}
				class="admin-nav-link"
				class:active={page.url.pathname === link.href}
			>{link.label}</a>
		{/each}

		<div class="admin-sidebar-footer">
			<a href="/dashboard" style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted); text-decoration: none;">← Back to app</a>
		</div>
	</aside>

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

	.admin-sidebar {
		width: 220px;
		flex-shrink: 0;
		background: var(--color-bg-surface);
		border-right: 1px solid var(--color-bg-border);
		padding: 24px 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.admin-sidebar-header {
		padding: 0 20px 20px;
		border-bottom: 1px solid var(--color-bg-border);
		margin-bottom: 8px;
	}

	.admin-nav-link {
		display: block;
		padding: 9px 20px;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 13.5px;
		text-decoration: none;
		border-radius: 0;
		background: transparent;
		color: var(--color-text-secondary);
		font-weight: 400;
		border-left: 2px solid transparent;
		white-space: nowrap;
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

	.admin-main {
		flex: 1;
		padding: 32px;
		overflow-y: auto;
		min-width: 0; /* allow children to shrink */
	}

	/* Mobile: turn sidebar into top nav */
	@media (max-width: 860px) {
		.admin-shell {
			flex-direction: column;
		}
		.admin-sidebar {
			width: 100%;
			border-right: none;
			border-bottom: 1px solid var(--color-bg-border);
			padding: 14px 0;
		}
		.admin-sidebar-header {
			padding: 0 16px 12px;
			margin-bottom: 8px;
		}
		.admin-sidebar-footer {
			display: none;
		}
		.admin-sidebar :global(a.admin-nav-link) {
			display: inline-flex;
			padding: 10px 14px;
			border-left: none;
			border-bottom: 2px solid transparent;
		}
		.admin-sidebar :global(a.admin-nav-link.active) {
			border-bottom-color: var(--color-brand);
		}
		.admin-sidebar {
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			white-space: nowrap;
		}
		.admin-main {
			padding: 18px 16px 28px;
		}
	}
	@media (max-width: 520px) {
		.admin-main {
			padding: 14px 12px 24px;
		}
	}
</style>
