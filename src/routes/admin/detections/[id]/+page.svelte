<script lang="ts">
	let { data } = $props();
	let { detection } = $derived(data);
	let profile = $derived(detection.profiles as { id: string; email: string; full_name: string | null; plan: string });

	let aiPct = $derived(Math.round((detection.ai_probability ?? 0) * 100));
	let humanPct = $derived(Math.round((detection.human_probability ?? 0) * 100));

	function fmtDate(s: string) {
		return new Date(s).toLocaleString('en-US', {
			month: 'short', day: 'numeric', year: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}

	function verdictColor(v: string | null) {
		if (v === 'AI') return '#ef4444';
		if (v === 'Human') return 'var(--color-brand)';
		if (v === 'Mixed') return '#f59e0b';
		return 'var(--color-text-muted)';
	}
</script>

<div style="display: flex; flex-direction: column; gap: 24px; max-width: 860px;">
	<!-- Header -->
	<div style="display: flex; align-items: center; gap: 12px;">
		<a href="/admin/detections" style="font-size: 13px; color: var(--color-text-muted); text-decoration: none;">← Detections</a>
		<span style="color: var(--color-bg-border);">/</span>
		<h1 style="font-family: 'Instrument Serif', Georgia, serif; font-size: 22px; font-weight: 400; color: var(--color-text-primary); margin: 0;">Detection Detail</h1>
	</div>

	<!-- Meta -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
		{#each [
			{ label: 'ID',          value: detection.id },
			{ label: 'Date',        value: fmtDate(detection.created_at) },
			{ label: 'User',        value: profile.email },
			{ label: 'Plan',        value: profile.plan },
			{ label: 'Word count',  value: detection.word_count?.toLocaleString() ?? '—' },
			{ label: 'Classification', value: detection.classification ?? '—' },
		] as row}
			<div>
				<p style="font-family: 'Space Grotesk', system-ui; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 3px;">{row.label}</p>
				{#if row.label === 'User'}
					<a href={`/admin/users/${profile.id}`} style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--color-brand); text-decoration: none;">{row.value}</a>
				{:else}
					<p style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--color-text-primary); margin: 0; word-break: break-all;">{row.value}</p>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Score card -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; padding: 24px;">
		<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 20px;">Scores</h2>

		<div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
			<span style="font-family: 'Instrument Serif', Georgia, serif; font-size: 52px; font-weight: 400; color: {verdictColor(detection.verdict)}; line-height: 1;">
				{detection.verdict ?? '—'}
			</span>
			<div style="flex: 1;">
				<!-- AI bar -->
				<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
					<span style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted); width: 60px;">AI</span>
					<div style="flex: 1; height: 10px; border-radius: 99px; background: var(--color-bg-elevated); overflow: hidden;">
						<div style="height: 100%; width: {aiPct}%; background: #ef4444; border-radius: 99px; transition: width 0.3s;"></div>
					</div>
					<span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: #ef4444; width: 40px; text-align: right;">{aiPct}%</span>
				</div>
				<!-- Human bar -->
				<div style="display: flex; align-items: center; gap: 10px;">
					<span style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted); width: 60px;">Human</span>
					<div style="flex: 1; height: 10px; border-radius: 99px; background: var(--color-bg-elevated); overflow: hidden;">
						<div style="height: 100%; width: {humanPct}%; background: var(--color-brand); border-radius: 99px; transition: width 0.3s;"></div>
					</div>
					<span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: var(--color-brand); width: 40px; text-align: right;">{humanPct}%</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Input text -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
		<div style="padding: 14px 20px; border-bottom: 1px solid var(--color-bg-border); background: var(--color-bg-elevated);">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">Submitted Text</h2>
		</div>
		<div style="padding: 20px; max-height: 400px; overflow-y: auto;">
			<p style="font-family: 'Georgia', serif; font-size: 15px; line-height: 1.7; color: var(--color-text-primary); margin: 0; white-space: pre-wrap;">{detection.input_text}</p>
		</div>
	</div>
</div>
