<script lang="ts">
	import { page } from '$app/state';
	import SEO from '$lib/components/SEO.svelte';
	import { onMount } from 'svelte';
	import { trackPageVisit, trackWordPackClick } from '$lib/client/analytics';

	onMount(() => trackPageVisit('dashboard'));

	interface Profile {
		plan: 'free' | 'basic' | 'pro' | 'ultra';
		full_name: string | null;
		email: string;
		ls_customer_id: string | null;
	}

	interface WordPack {
		variantId: string;
		words: number;
		price: number;
		label: string;
	}

	interface WordCredit {
		id: string;
		amount: number;
		source: string;
		description: string | null;
		created_at: string;
	}

	interface Props {
		data: {
			profile: Profile;
			wordsBalance: number;
			planWordsLimit: number;
			wordPacks: WordPack[];
			totalDetections: number;
			totalHumanizations: number;
			wordsAnalyzed: number;
			avgAiProbability: number | null;
			sparklines: { detections: number[]; humanizations: number[]; words: number[]; avgAi: number[] };
			wordCredits: WordCredit[];
		};
	}

	let { data }: Props = $props();

	const isPaid = $derived(
		data.profile.plan === 'basic' || data.profile.plan === 'pro' || data.profile.plan === 'ultra'
	);

	const planLabel = $derived(
		data.profile.plan === 'ultra' ? 'Ultra' :
		data.profile.plan === 'pro'   ? 'Pro'   :
		data.profile.plan === 'basic' ? 'Basic' : 'Free'
	);

	const showUpgradedBanner = $derived(page.url.searchParams.get('upgraded') === 'true');

	const wordsLimit   = $derived(data.planWordsLimit);
	const wordsPct     = $derived(wordsLimit > 0 ? Math.max(0, Math.min(100, (data.wordsBalance / wordsLimit) * 100)) : 0);
	const wordsBarColor = $derived(
		wordsPct <= 15 ? '#ef4444' : wordsPct <= 30 ? '#f59e0b' : 'var(--color-brand)'
	);

	const greeting = $derived(
		data.profile.full_name?.split(' ')[0]
			? `Hi, ${data.profile.full_name!.split(' ')[0]}.`
			: 'Dashboard'
	);

	function formatWords(n: number): string {
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
		if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
		return n.toLocaleString();
	}

	function sparklinePath(values: number[], w = 80, h = 28): string {
		const max = Math.max(...values, 1);
		const pts = values.map((v, i) => ({
			x: (i / (values.length - 1)) * w,
			y: h - (v / max) * h * 0.8 - h * 0.1
		}));
		if (pts.length < 2) return '';
		let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
		for (let i = 1; i < pts.length; i++) {
			const cpx = pts[i-1].x + (pts[i].x - pts[i-1].x) * 0.5;
			d += ` C ${cpx.toFixed(1)} ${pts[i-1].y.toFixed(1)}, ${cpx.toFixed(1)} ${pts[i].y.toFixed(1)}, ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
		}
		return d;
	}

	let wordBuyLoading = $state<string | null>(null);

	// ── Billing history ───────────────────────────────────────────────────────
	type Invoice = {
		id: string; number: string | null; status: string | null;
		amount_paid: number; currency: string; created: number;
		hosted_invoice_url: string | null; billing_reason: string | null; description: string | null;
	};
	type Cancellation = { id: string; canceled_at: number | null; ended_at: number | null; plan: string | null; };
	type TimelineEntry = ({ kind: 'invoice' } & Invoice) | ({ kind: 'cancellation' } & Cancellation);
	let invoices = $state<Invoice[]>([]);
	let cancellations = $state<Cancellation[]>([]);
	const timeline = $derived<TimelineEntry[]>(
		[
			...invoices.map(i => ({ kind: 'invoice' as const, ...i })),
			...cancellations.map(c => ({ kind: 'cancellation' as const, ...c }))
		].sort((a, b) => {
			const ta = a.kind === 'invoice' ? a.created : (a.canceled_at ?? 0);
			const tb = b.kind === 'invoice' ? b.created : (b.canceled_at ?? 0);
			return tb - ta;
		})
	);
	let invoicesLoading = $state(false);
	let invoicesLoaded = $state(false);
	let invoicesError = $state<string | null>(null);

	$effect(() => {
		if (data.profile.ls_customer_id) loadInvoices();
	});

	async function loadInvoices() {
		if (invoicesLoaded) return;
		invoicesLoading = true;
		invoicesError = null;
		try {
			const res = await fetch('/api/billing/history');
			const body = await res.json();
			if (body.error) { invoicesError = body.error; } else {
				invoices = body.invoices ?? [];
				cancellations = body.cancellations ?? [];
			}
		} catch { invoicesError = 'Failed to load invoices.'; } finally {
			invoicesLoading = false;
			invoicesLoaded = true;
		}
	}

	function fmtCurrency(amount: number, currency: string) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
	}
	function fmtDate(ts: number) {
		return new Date(ts * 1000).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
	}
	function fmtCreditDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}
	const sourceLabel: Record<string, string> = {
		subscription: 'Plan activated', subscription_renewal: 'Plan renewal',
		word_pack: 'Word pack', admin_credit: 'Admin credit', admin_debit: 'Admin removed'
	};

	const WC_PAGE_SIZE = 5;
	let wcPage = $state(1);
	const wcPageCount = $derived(Math.max(1, Math.ceil(data.wordCredits.length / WC_PAGE_SIZE)));
	const wcVisible = $derived(data.wordCredits.slice((wcPage - 1) * WC_PAGE_SIZE, wcPage * WC_PAGE_SIZE));

	async function buyWords(priceId: string) {
		wordBuyLoading = priceId;
		trackWordPackClick(priceId, 'dashboard');
		try {
			const res = await fetch('/api/lemonsqueezy/tokens', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ variantId: priceId })
			});
			const json = await res.json();
			if (json.url) window.location.href = json.url;
			else alert(json.error ?? 'Could not start purchase.');
		} catch {
			alert('Network error.');
		} finally {
			wordBuyLoading = null;
		}
	}
</script>

<SEO
	title="Dashboard | HumanizeAIWrite"
	description="Your HumanizeAIWrite dashboard — usage stats, word balance, and quick actions."
	canonical="https://humanizeaiwrite.com/dashboard"
/>

<div style="max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; display: flex; flex-direction: column; gap: 28px;">

	<!-- ── Upgraded banner ── -->
	{#if showUpgradedBanner}
		<div style="
			display: flex; align-items: center; gap: 10px;
			padding: 12px 16px;
			background: var(--color-human-muted);
			border-radius: 10px;
			box-shadow: inset 0 0 0 1px var(--color-human);
			font-family: 'Space Grotesk', system-ui, sans-serif;
			font-size: 14px; color: var(--color-human);
		" class="animate-fade-up" role="alert">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
			You're now on the {planLabel} plan. Enjoy your upgraded words!
		</div>
	{/if}

	<!-- ── Page header ── -->
	<div>
		<h1 style="font-family: 'Newsreader', Georgia, serif; font-size: 34px; font-weight: 400; color: var(--color-text-primary); margin: 0 0 6px; letter-spacing: -0.02em;">{greeting}</h1>
		<p style="font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 14px; color: var(--color-text-secondary); margin: 0;">Here's an overview of your usage.</p>
	</div>

	<!-- ── 4 stat cards ── -->
	<div class="stat-row">
		{#each [
			{ label: 'Detections Run',  value: data.totalDetections.toLocaleString(),                               sub: 'all time',     sparkData: data.sparklines.detections,    icon: 'm12 14 4-4 M3.34 19a10 10 0 1 1 17.32 0',                                                                                                             accent: 'var(--color-ai)' },
			{ label: 'Texts Humanized', value: data.totalHumanizations.toLocaleString(),                            sub: 'all time',     sparkData: data.sparklines.humanizations, icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',                                                                                    accent: 'var(--color-brand)' },
			{ label: 'Words Processed', value: formatWords(data.wordsAnalyzed),                                     sub: 'all time',     sparkData: data.sparklines.words,         icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',                                                   accent: '#8b5cf6' },
			{ label: 'Avg. AI Score',   value: data.avgAiProbability !== null ? `${data.avgAiProbability}%` : '—', sub: 'across scans', sparkData: data.sparklines.avgAi,         icon: 'M22 12h-4l-3 9L9 3l-3 9H2',                                                                                                                          accent: '#f59e0b' },
		] as stat}
			<div class="stat-card">
				<!-- Label row: small icon left of label -->
				<div style="display:flex;align-items:center;gap:7px;margin-bottom:10px;">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="{stat.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={stat.icon}/></svg>
					<span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:11px;font-weight:600;color:var(--color-text-muted);letter-spacing:0.08em;text-transform:uppercase;">{stat.label}</span>
				</div>
				<!-- Value -->
				<p style="font-family:'Newsreader',Georgia,serif;font-size:38px;font-weight:400;color:var(--color-text-primary);margin:0;line-height:1;">{stat.value}</p>
				<p style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--color-text-dim);margin:5px 0 12px;">{stat.sub}</p>
				<!-- Real sparkline -->
				<svg width="100%" height="30" viewBox="0 0 80 30" preserveAspectRatio="none" aria-hidden="true" style="display:block;">
					{#if stat.sparkData.some(v => v > 0)}
						<path d={sparklinePath(stat.sparkData)} fill="none" stroke="{stat.accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
					{:else}
						<line x1="0" y1="22" x2="80" y2="22" stroke="{stat.accent}" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.4"/>
					{/if}
				</svg>
			</div>
		{/each}
	</div>

	<!-- ── Bottom row: words card + quick actions ── -->
	<div class="bottom-row">

		<!-- Words card -->
		<div class="words-card">
			<!-- Header row -->
			<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
				<span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:11px;font-weight:600;color:var(--color-text-muted);letter-spacing:0.12em;text-transform:uppercase;">Words Remaining</span>
				<span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:3px 9px;border-radius:5px;background:{isPaid?'var(--color-brand-muted)':'var(--color-bg-elevated)'};color:{isPaid?'var(--color-brand)':'var(--color-text-muted)'};box-shadow:inset 0 0 0 1px {isPaid?'var(--color-brand)':'var(--color-bg-border)'};">{planLabel}</span>
			</div>

			<!-- Big number -->
			<p style="font-family:'Newsreader',Georgia,serif;font-size:56px;line-height:1;color:var(--color-text-primary);margin:0;">{data.wordsBalance.toLocaleString()}</p>
			<p style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;color:var(--color-text-muted);margin:6px 0 18px;">of {wordsLimit.toLocaleString()} words{isPaid?' free trial':' free trial'}</p>

			<!-- Progress bar -->
			<div style="margin-bottom:18px;">
				<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
					<span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:10px;font-weight:600;color:var(--color-text-muted);letter-spacing:0.1em;text-transform:uppercase;">Balance</span>
					<span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;font-weight:600;color:{wordsBarColor};">{Math.round(wordsPct)}% remaining</span>
				</div>
				<div style="width:100%;height:8px;border-radius:99px;background:var(--color-bg-border);overflow:hidden;">
					<div style="height:100%;border-radius:99px;width:{wordsPct}%;background:{wordsBarColor};transition:width 600ms ease;"></div>
				</div>
			</div>

			{#if isPaid}
				<!-- Top-up word packs -->
				<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
					<span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:10px;font-weight:600;color:var(--color-text-muted);letter-spacing:0.1em;text-transform:uppercase;">Top up words</span>
					<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
						{#each data.wordPacks as pack}
							<button onclick={() => buyWords(pack.variantId)} disabled={wordBuyLoading !== null} style="display:flex;flex-direction:column;align-items:center;padding:10px 6px;border-radius:10px;cursor:pointer;background:var(--color-bg-elevated);border:1px solid var(--color-bg-border);transition:border-color 150ms,background 150ms;opacity:{wordBuyLoading!==null?0.6:1};">
								<span style="font-family:'Newsreader',Georgia,serif;font-size:18px;color:var(--color-text-primary);">{wordBuyLoading===pack.variantId?'…':`+${(pack.words/1000).toFixed(0)}K`}</span>
								<span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--color-text-muted);margin-top:2px;">words</span>
								<span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:11px;font-weight:700;color:var(--color-brand);margin-top:5px;">${pack.price}</span>
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<!-- Free plan upgrade box — matches screenshot: gift icon + text + button -->
				<div style="display:flex;gap:12px;align-items:flex-start;padding:14px 16px;background:var(--color-brand-muted);border-radius:10px;border:1px solid color-mix(in srgb, var(--color-brand) 30%, transparent);margin-bottom:16px;">
					<div style="width:32px;height:32px;border-radius:8px;background:var(--color-bg-surface);border:1px solid var(--color-bg-border);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
					</div>
					<div style="flex:1;min-width:0;">
						<p style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;color:var(--color-text-primary);margin:0 0 10px;line-height:1.5;">You're on the free trial — 150 words to explore. Upgrade for thousands more each month.</p>
						<a href="/plans" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;background:var(--color-brand);color:white;font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:700;text-decoration:none;">
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
							See plans
						</a>
					</div>
				</div>
			{/if}

			<!-- Manage billing link -->
			<a href="/settings" style="display:inline-flex;align-items:center;gap:6px;font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:600;color:var(--color-text-secondary);text-decoration:none;padding:10px 0;border-top:1px solid var(--color-bg-border);">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>
				Manage plan &amp; billing
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:auto;" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
			</a>
		</div>

		<!-- Quick actions -->
		<div class="words-card">
			<p style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:11px;font-weight:600;color:var(--color-text-muted);letter-spacing:0.12em;text-transform:uppercase;margin:0 0 12px;">Quick Actions</p>

			{#each [
				{ href: '/humanize', label: 'Humanize text',    desc: 'Rewrite AI content to sound natural',  icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',                                                                                                                                      accent: 'var(--color-brand)' },
				{ href: '/detect',   label: 'Detect AI writing', desc: 'Check if text was written by AI',     icon: 'm12 14 4-4 M3.34 19a10 10 0 1 1 17.32 0',                                                                                                                                                           accent: 'var(--color-ai)' },
				{ href: '/activity', label: 'View history',     desc: 'Browse past detections and rewrites',  icon: 'M12 8v4l3 3 M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5',                                                                                                                                                    accent: '#8b5cf6' },
				{ href: '/settings', label: 'Account settings', desc: 'Plan, billing, and profile',           icon: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', accent: 'var(--color-text-muted)' },
			] as action}
				<a href={action.href} class="action-card">
					<!-- Icon only — no background box -->
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{action.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;" aria-hidden="true"><path d={action.icon}/></svg>
					<div style="flex:1;min-width:0;">
						<p style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:14px;font-weight:600;color:var(--color-text-primary);margin:0;">{action.label}</p>
						<p style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;color:var(--color-text-muted);margin:3px 0 0;">{action.desc}</p>
					</div>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-dim)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
				</a>
			{/each}
		</div>
	</div>

	<!-- ── Word Balance History ── -->
	{#if data.wordCredits.length > 0}
	<div class="hist-card">
		<!-- Card header -->
		<div class="hist-card-header">
			<div class="hist-card-icon" style="background: var(--color-brand-muted);">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 7l-9.5 9.5-5-5L1 18"/><path d="M15 7h7v7"/></svg>
			</div>
			<div>
				<h2 class="hist-card-title">Word Balance History</h2>
				<p class="hist-card-sub">A summary of all word credits and plan activity.</p>
			</div>
		</div>

		<!-- Rows -->
		{#each wcVisible as credit, i}
			{@const isPos = credit.amount >= 0}
			{@const isAdmin = credit.source === 'admin_credit' || credit.source === 'admin_debit'}
			{@const isPlan = credit.source === 'subscription' || credit.source === 'subscription_renewal'}
			{@const badgeBg = isPlan ? 'var(--color-brand-muted)' : isAdmin ? '#7c3aed18' : '#3b82f618'}
			{@const badgeColor = isPlan ? 'var(--color-brand)' : isAdmin ? '#7c3aed' : '#3b82f6'}
			{#if i > 0}<div class="hist-divider"></div>{/if}
			<div class="hist-row">
				<!-- Row icon -->
				<div class="hist-row-icon" style="background:{isPos ? 'var(--color-brand-muted)' : '#ef444418'}; color:{isPos ? 'var(--color-brand)' : '#ef4444'};">
					{#if isPlan}
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
					{:else if isPos}
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
					{:else}
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
					{/if}
				</div>
				<!-- Badge + description -->
				<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
					<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
						<span style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:2px 7px;border-radius:4px;flex-shrink:0;background:{badgeBg};color:{badgeColor};">{sourceLabel[credit.source] ?? credit.source}</span>
						<span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;color:var(--color-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{credit.description ?? ''}</span>
					</div>
				</div>
				<!-- Amount + date -->
				<div style="display:flex;align-items:center;gap:20px;flex-shrink:0;">
					<span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:{isPos ? 'var(--color-brand)' : '#ef4444'};">{isPos ? '+' : ''}{credit.amount.toLocaleString()} words</span>
					<span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;color:var(--color-text-muted);min-width:80px;text-align:right;">{fmtCreditDate(credit.created_at)}</span>
				</div>
			</div>
		{/each}

		<!-- Pagination -->
		{#if wcPageCount > 1}
			<div class="hist-footer">
				<button
					class="wc-page-btn"
					onclick={() => wcPage--}
					disabled={wcPage === 1}
					aria-label="Previous page"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
				</button>
				<span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;color:var(--color-text-muted);">
					Page {wcPage} of {wcPageCount}
				</span>
				<button
					class="wc-page-btn"
					onclick={() => wcPage++}
					disabled={wcPage === wcPageCount}
					aria-label="Next page"
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
				</button>
			</div>
		{/if}
	</div>
	{/if}

	<!-- ── Payment Timeline ── -->
	{#if data.profile.ls_customer_id}
	<div class="hist-card">
		<!-- Card header -->
		<div class="hist-card-header">
			<div class="hist-card-icon" style="background: var(--color-brand-muted);">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
			</div>
			<div>
				<h2 class="hist-card-title">Payment Timeline</h2>
				<p class="hist-card-sub">Your recent payment and subscription activity.</p>
			</div>
			{#if invoicesLoading}
				<span style="margin-left:auto;font-family:'Space Grotesk',system-ui,sans-serif;font-size:12px;color:var(--color-text-muted);">Loading…</span>
			{/if}
		</div>

		{#if invoicesError}
			<p style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;color:#ef4444;padding:0 0 4px;">{invoicesError}</p>
		{:else if invoicesLoaded && timeline.length === 0}
			<p style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;color:var(--color-text-muted);padding:0 0 4px;">No billing history found.</p>
		{:else if invoicesLoaded}
			{#each timeline as entry, i}
				{@const isCancelled = entry.kind === 'cancellation'}
				{@const isPaid = !isCancelled && entry.status === 'paid'}
				{@const dotColor = isCancelled ? '#dc2626' : isPaid ? '#16a34a' : '#d97706'}
				{@const badgeBg = isCancelled ? '#dc262618' : isPaid ? '#16a34a18' : '#d9780618'}
				{@const badgeColor = isCancelled ? '#dc2626' : isPaid ? '#16a34a' : '#d97806'}
				{@const badgeLabel = isCancelled ? 'Cancelled' : isPaid ? 'Paid' : (entry.status ?? 'Unknown')}
				{@const description = isCancelled ? 'Subscription cancelled' : (entry.description ?? entry.number ?? 'Invoice')}
				{@const dateStr = isCancelled ? (entry.canceled_at ? fmtDate(entry.canceled_at) : '—') : fmtDate(entry.created)}
				{#if i > 0}<div class="hist-divider"></div>{/if}
				<div class="hist-row">
					<!-- Dot -->
					<div style="width:11px;height:11px;border-radius:50%;flex-shrink:0;margin-top:2px;background:{dotColor};border:2px solid var(--color-bg-surface);box-shadow:0 0 0 1.5px {dotColor};"></div>
					<!-- Content -->
					<div style="flex:1;min-width:0;">
						<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
							<span style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:2px 7px;border-radius:4px;flex-shrink:0;background:{badgeBg};color:{badgeColor};">{badgeLabel}</span>
							<span style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:13px;font-weight:500;color:var(--color-text-primary);">{description}</span>
						</div>
						<p style="font-family:'Space Grotesk',system-ui,sans-serif;font-size:11px;color:var(--color-text-muted);margin:3px 0 0;">{dateStr}</p>
					</div>
					<!-- Amount + receipt -->
					{#if !isCancelled}
						<div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
							<span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:#16a34a;">{fmtCurrency(entry.amount_paid, entry.currency)}</span>
							{#if entry.hosted_invoice_url}
								<a href={entry.hosted_invoice_url} target="_blank" rel="noopener noreferrer" class="receipt-btn">
									<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
									Receipt
								</a>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
	{/if}

</div>

<style>
.stat-row {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 14px;
}

.stat-card {
	background: var(--color-bg-surface);
	border-radius: 14px;
	box-shadow: inset 0 0 0 1px var(--color-bg-border);
	padding: 20px 18px;
}

.bottom-row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 20px;
	align-items: stretch;
}

.words-card {
	background: var(--color-bg-surface);
	border-radius: 14px;
	box-shadow: inset 0 0 0 1px var(--color-bg-border);
	padding: 24px;
	display: flex;
	flex-direction: column;
}

.action-card {
	display: flex;
	align-items: center;
	gap: 14px;
	padding: 14px 16px;
	border-radius: 10px;
	text-decoration: none;
	background: var(--color-bg-surface);
	border: 1px solid var(--color-bg-border);
	box-shadow: 0 1px 3px rgba(0,0,0,0.04);
	transition: background 120ms, border-color 120ms, box-shadow 120ms;
	margin-bottom: 8px;
}
.action-card:last-child {
	margin-bottom: 0;
}
.action-card:hover {
	background: var(--color-bg-elevated);
	border-color: var(--color-brand);
	box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}

/* ── History cards ────────────────────────────────────────────────────── */
.hist-card {
	background: var(--color-bg-surface);
	border-radius: 14px;
	box-shadow: inset 0 0 0 1px var(--color-bg-border);
	padding: 20px 24px;
	display: flex;
	flex-direction: column;
}

.hist-card-header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 16px;
}

.hist-card-icon {
	width: 38px;
	height: 38px;
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.hist-card-title {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 15px;
	font-weight: 700;
	color: var(--color-text-primary);
	margin: 0;
	line-height: 1.2;
}

.hist-card-sub {
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 12px;
	color: var(--color-text-muted);
	margin: 2px 0 0;
}

.hist-row {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 11px 0;
}

.hist-row-icon {
	width: 30px;
	height: 30px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.hist-divider {
	height: 1px;
	background: var(--color-bg-border);
}

.hist-footer {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	padding-top: 14px;
	margin-top: 4px;
	border-top: 1px solid var(--color-bg-border);
}

.wc-page-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	border-radius: 7px;
	background: var(--color-bg-elevated);
	border: 1px solid var(--color-bg-border);
	color: var(--color-text-secondary);
	cursor: pointer;
	transition: background 120ms, color 120ms;
}
.wc-page-btn:hover:not(:disabled) {
	background: var(--color-brand-muted);
	color: var(--color-brand);
	border-color: var(--color-brand);
}
.wc-page-btn:disabled {
	opacity: 0.35;
	cursor: not-allowed;
}


.receipt-btn {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 5px 10px;
	border-radius: 6px;
	border: 1px solid var(--color-brand);
	font-family: 'Space Grotesk', system-ui, sans-serif;
	font-size: 11px;
	font-weight: 600;
	color: var(--color-brand);
	text-decoration: none;
	white-space: nowrap;
	transition: background 150ms;
}
.receipt-btn:hover {
	background: var(--color-brand-muted);
}

@media (max-width: 900px) {
	.stat-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 700px) {
	.bottom-row { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
	.stat-row { grid-template-columns: 1fr 1fr; }
}
</style>
