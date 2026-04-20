<script lang="ts">
	let { data } = $props();
	let { humanization } = $derived(data);
	let profile = $derived(humanization.profiles as { id: string; email: string; full_name: string | null; plan: string });
	let detection = $derived(humanization.detections as { ai_probability: number | null; human_probability: number | null; verdict: string | null } | null);

	let aiPct = $derived(detection ? Math.round((detection.ai_probability ?? 0) * 100) : null);
	let humanPct = $derived(detection ? Math.round((detection.human_probability ?? 0) * 100) : null);

	function fmtDate(s: string) {
		return new Date(s).toLocaleString('en-US', {
			month: 'short', day: 'numeric', year: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}
</script>

<div style="display: flex; flex-direction: column; gap: 24px; max-width: 1000px;">
	<!-- Header -->
	<div style="display: flex; align-items: center; gap: 12px;">
		<a href="/admin/humanizations" style="font-size: 13px; color: var(--color-text-muted); text-decoration: none;">← Humanizations</a>
		<span style="color: var(--color-bg-border);">/</span>
		<h1 style="font-family: 'Instrument Serif', Georgia, serif; font-size: 22px; font-weight: 400; color: var(--color-text-primary); margin: 0;">Humanization Detail</h1>
	</div>

	<!-- Meta -->
	<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
		{#each [
			{ label: 'ID',         value: humanization.id,  link: null },
			{ label: 'Date',       value: fmtDate(humanization.created_at), link: null },
			{ label: 'User',       value: profile.email, link: `/admin/users/${profile.id}` },
			{ label: 'Plan',       value: profile.plan,  link: null },
			{ label: 'Word count', value: humanization.word_count?.toLocaleString() ?? '—', link: null },
		] as row}
			<div>
				<p style="font-family: 'Space Grotesk', system-ui; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-text-muted); margin: 0 0 3px;">{row.label}</p>
				{#if row.link}
					<a href={row.link} style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--color-brand); text-decoration: none;">{row.value}</a>
				{:else}
					<p style="font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--color-text-primary); margin: 0; word-break: break-all;">{row.value}</p>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Original detection scores (if linked) -->
	{#if detection && aiPct !== null && humanPct !== null}
		<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; padding: 24px;">
			<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 16px;">
				Original Detection Score <span style="font-weight: 400; color: var(--color-text-muted); font-size: 11px;">(before humanization)</span>
			</h2>
			<div style="display: flex; align-items: center; gap: 20px;">
				<span style="font-family: 'Instrument Serif', Georgia, serif; font-size: 36px; color: #ef4444; line-height: 1;">{detection.verdict ?? '—'}</span>
				<div style="flex: 1;">
					<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
						<span style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted); width: 60px;">AI</span>
						<div style="flex: 1; height: 10px; border-radius: 99px; background: var(--color-bg-elevated); overflow: hidden;">
							<div style="height: 100%; width: {aiPct}%; background: #ef4444; border-radius: 99px;"></div>
						</div>
						<span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: #ef4444; width: 40px; text-align: right;">{aiPct}%</span>
					</div>
					<div style="display: flex; align-items: center; gap: 10px;">
						<span style="font-family: 'Space Grotesk', system-ui; font-size: 12px; color: var(--color-text-muted); width: 60px;">Human</span>
						<div style="flex: 1; height: 10px; border-radius: 99px; background: var(--color-bg-elevated); overflow: hidden;">
							<div style="height: 100%; width: {humanPct}%; background: var(--color-brand); border-radius: 99px;"></div>
						</div>
						<span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; color: var(--color-brand); width: 40px; text-align: right;">{humanPct}%</span>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Before / After -->
	<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
		<!-- Before -->
		<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
			<div style="padding: 14px 20px; border-bottom: 1px solid var(--color-bg-border); background: #ef444410; display: flex; align-items: center; gap: 8px;">
				<span style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444; display: inline-block;"></span>
				<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: #ef4444; text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">Before</h2>
			</div>
			<div style="padding: 20px; max-height: 500px; overflow-y: auto;">
				<p style="font-family: 'Georgia', serif; font-size: 14px; line-height: 1.75; color: var(--color-text-primary); margin: 0; white-space: pre-wrap;">{humanization.input_text}</p>
			</div>
		</div>

		<!-- After -->
		<div style="background: var(--color-bg-surface); border: 1px solid var(--color-bg-border); border-radius: 12px; overflow: hidden;">
			<div style="padding: 14px 20px; border-bottom: 1px solid var(--color-bg-border); background: var(--color-brand-muted); display: flex; align-items: center; gap: 8px;">
				<span style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-brand); display: inline-block;"></span>
				<h2 style="font-family: 'Space Grotesk', system-ui; font-size: 13px; font-weight: 600; color: var(--color-brand); text-transform: uppercase; letter-spacing: 0.08em; margin: 0;">After</h2>
			</div>
			<div style="padding: 20px; max-height: 500px; overflow-y: auto;">
				<p style="font-family: 'Georgia', serif; font-size: 14px; line-height: 1.75; color: var(--color-text-primary); margin: 0; white-space: pre-wrap;">{humanization.output_text}</p>
			</div>
		</div>
	</div>
</div>
