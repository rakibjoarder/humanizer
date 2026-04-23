<script lang="ts">
	let { data } = $props();
	const { stats, recentUsers } = data;

	function fmt(n: number) { return n.toLocaleString(); }
	function fmtDate(s: string) {
		return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function planColor(plan: string) {
		if (plan === 'ultra') return { bg: '#7c3aed20', color: '#7c3aed' };
		if (plan === 'pro') return { bg: 'var(--color-brand-muted)', color: 'var(--color-brand)' };
		if (plan === 'basic') return { bg: '#3b82f620', color: '#3b82f6' };
		return { bg: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' };
	}
</script>

<div style="display: flex; flex-direction: column; gap: 28px; max-width: 1000px;">
	<div>
		<h1 style="font-family: 'Instrument Serif', Georgia, serif; font-size: 28px; font-weight: 400; color: var(--color-text-primary); margin: 0 0 4px;">Overview</h1>
		<p style="font-family: 'Space Grotesk', system-ui; font-size: 13px; color: var(--color-text-muted); margin: 0;">Platform stats at a glance.</p>
	</div>

	<!-- Stat cards -->
	<div class="admin-stats-grid">
		{#each [
			{ label: 'Total Users',     value: fmt(stats.totalUsers) },
			{ label: 'Basic Users',     value: fmt(stats.basicUsers) },
			{ label: 'Pro Users',       value: fmt(stats.proUsers) },
			{ label: 'Ultra Users',     value: fmt(stats.ultraUsers) },
			{ label: 'Free (no plan)',  value: fmt(stats.freeUsers) },
			{ label: 'Detections',      value: fmt(stats.totalDetections) },
			{ label: 'Humanizations',   value: fmt(stats.totalHumanizations) }
		] as s}
			<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; padding: 18px 16px;">
				<p style="font-family: 'Space Grotesk', system-ui; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 6px;">{s.label}</p>
				<p style="font-family: 'Newsreader', Georgia, serif; font-size: 30px; color: var(--color-text-primary); margin: 0;">{s.value}</p>
			</div>
		{/each}
	</div>

	<!-- Recent signups -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden; overflow-x: auto;">
		<div style="padding: 14px 20px; border-bottom: 1px solid var(--color-bg-border); display: flex; justify-content: space-between; align-items: center;">
			<span style="font-family: 'Space Grotesk', system-ui; font-size: 12px; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.08em; text-transform: uppercase;">Recent signups</span>
			<a href="/admin/users" style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-brand); text-decoration: none; font-weight: 600;">View all →</a>
		</div>
		<table style="width: 100%; border-collapse: collapse; font-family: 'Space Grotesk', system-ui; font-size: 13px;">
			<thead>
				<tr style="border-bottom: 1px solid var(--color-bg-border);">
					<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">Email</th>
					<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">Plan</th>
					<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">Words</th>
					<th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em;">Joined</th>
				</tr>
			</thead>
			<tbody>
				{#each recentUsers as u}
					<tr style="border-bottom: 1px solid var(--color-bg-border);">
						<td style="padding: 10px 16px; color: var(--color-text-primary);">
							<a href={`/admin/users/${u.id}`} style="color: var(--color-brand); text-decoration: none;">{u.email}</a>
						</td>
						<td style="padding: 10px 16px;">
							<span style="
								font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px;
								background: {planColor(u.plan).bg};
								color: {planColor(u.plan).color};
							">{u.plan}</span>
						</td>
						<td style="padding: 10px 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-text-secondary);">
							{u.words_balance === -1 ? '∞' : (u.words_balance ?? 0).toLocaleString()}
						</td>
						<td style="padding: 10px 16px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--color-text-muted);">{fmtDate(u.created_at)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.admin-stats-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 14px;
	}

	@media (max-width: 980px) {
		.admin-stats-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 520px) {
		.admin-stats-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
