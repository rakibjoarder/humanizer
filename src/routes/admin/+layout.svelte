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

<div style="display: flex; min-height: 100vh; background: var(--color-bg-base);">
	<!-- Sidebar -->
	<aside style="
		width: 220px; flex-shrink: 0;
		background: var(--color-bg-surface);
		border-right: 1px solid var(--color-bg-border);
		padding: 24px 0;
		display: flex; flex-direction: column; gap: 4px;
	">
		<div style="padding: 0 20px 20px; border-bottom: 1px solid var(--color-bg-border); margin-bottom: 8px;">
			<span style="font-family: 'Instrument Serif', Georgia, serif; font-size: 18px; color: var(--color-text-primary);">Admin</span>
			<span style="font-family: 'Space Grotesk', system-ui; font-size: 10px; color: var(--color-brand); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; display: block;">HumanizeAIWrite</span>
		</div>

		{#each navLinks as link}
			<a
				href={link.href}
				style="
					display: block; padding: 9px 20px;
					font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 13.5px;
					text-decoration: none;
					border-radius: 0;
					background: {page.url.pathname === link.href ? 'var(--color-brand-muted)' : 'transparent'};
					color: {page.url.pathname === link.href ? 'var(--color-brand)' : 'var(--color-text-secondary)'};
					font-weight: {page.url.pathname === link.href ? '600' : '400'};
					border-left: 2px solid {page.url.pathname === link.href ? 'var(--color-brand)' : 'transparent'};
				"
			>{link.label}</a>
		{/each}

		<div style="margin-top: auto; padding: 16px 20px; border-top: 1px solid var(--color-bg-border);">
			<a href="/dashboard" style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted); text-decoration: none;">← Back to app</a>
		</div>
	</aside>

	<!-- Main content -->
	<main style="flex: 1; padding: 32px; overflow-y: auto;">
		{@render children()}
	</main>
</div>
