# App Design & Architecture Document (ADR)
## AI Detector & Humanizer — Web Application

**Version:** 2.0  
**Date:** April 18, 2026  
**Stack:** SvelteKit · Stripe · Supabase · textaihumanizer.xyz API

---

## 1. Product Overview

### 1.1 App Name & Tagline
**HumanizeAI**  
*"Write like a human. Think like a machine."*

### 1.2 Problem Statement
AI-generated content is increasingly flagged by universities, employers, and publishers. **HumanizeAI** solves both sides of the problem:

1. **Detect** — Analyze text and determine the likelihood it was AI-written
2. **Humanize** — Rewrite AI-generated text so it reads naturally and authentically

### 1.3 Target Audience

| Segment | Use Case |
|---|---|
| Students | Check essays before submission; avoid false positives |
| Content marketers | Humanize bulk AI content for SEO |
| Educators | Scan student submissions |
| Freelance writers | Verify their work won't be flagged |
| Agencies | High-volume processing |

---

## 2. Core Features

### 2.1 MVP (v1.0)

| Feature | Description |
|---|---|
| **AI Detection** | Paste text → probability score + classification badge |
| **Humanizer** | Paste AI text → receive a human-sounding rewrite |
| **Character Counter** | Live counter enforcing API limits (50–10,000 chars) |
| **Detection History** | Logged-in users view past scans |
| **Usage Limits** | Free: 500 words/day · Pro: unlimited |
| **Stripe Subscriptions** | Monthly & yearly plans |
| **User Auth** | Email/password + Google OAuth via Supabase |

### 2.2 Future (v2.0+)
- Chrome Extension for inline detection
- Bulk file upload (PDF, DOCX)
- API key management for developers
- Team/agency accounts

---

## 3. Tech Stack

### 3.1 Frontend
| Layer | Choice |
|---|---|
| Framework | **SvelteKit** |
| Styling | **TailwindCSS v4** |
| UI Components | **shadcn-svelte** |
| Icons | **Lucide Svelte** |
| Fonts | **Instrument Serif** (display) + **DM Sans** (body) |
| Animations | **svelte/transition + CSS** |

### 3.2 Backend
| Layer | Choice |
|---|---|
| API Routes | **SvelteKit `+server.ts`** (server-side proxy) |
| Auth | **Supabase Auth** |
| Database | **Supabase (PostgreSQL)** |
| AI — Detection | **textaihumanizer.xyz `/detect`** (own fine-tuned model) |
| AI — Humanizer | **textaihumanizer.xyz `/humanize`** (own fine-tuned model) |
| Payments | **Stripe** |
| Rate Limiting | **Upstash Redis** |
| Email | **Resend** |

### 3.3 Infrastructure
| Layer | Choice |
|---|---|
| Hosting | **Vercel** (adapter-vercel) |
| Database | **Supabase** (managed PostgreSQL) |
| CI/CD | **GitHub Actions → Vercel** |

---

## 4. Security Architecture

### 4.1 The Proxy Pattern
The `PROXY_API_TOKEN` for `textaihumanizer.xyz` **never leaves the server**. The browser has zero knowledge of the real API URL or credentials.

```
Browser                    SvelteKit Server           textaihumanizer.xyz
  │                               │                          │
  │  POST /api/detect             │                          │
  │  { text: "..." }  ──────────▶ │                          │
  │  (no token)                   │  POST /detect            │
  │                               │  Bearer: PROXY_TOKEN ──▶ │
  │ ◀─────────────────────────── │ ◀──────────────────────  │
  │  { verdict, ai_probability }  │  { success, verdict... } │
  │  (clean — no token, no model) │                          │
```

### 4.2 Environment Variable Rules

```env
# ── SAFE for browser (PUBLIC_ prefix) ──────────────────────────
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
PUBLIC_STRIPE_PUBLISHABLE_KEY=
PUBLIC_APP_URL=

# ── SERVER ONLY — never exposed to client ───────────────────────
PROXY_API_TOKEN=           # Bearer token for textaihumanizer.xyz
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RESEND_API_KEY=
```

SvelteKit enforces this via `$env/static/private` — the build will fail if a server-only env var is imported in client code.

### 4.3 Security Layers

| Layer | Implementation |
|---|---|
| Token isolation | `PROXY_API_TOKEN` imported only in `lib/server/api.ts` |
| Route protection | `hooks.server.ts` auth guard on `/dashboard`, `/detect`, `/humanize` |
| Input validation | Character limits enforced both client-side AND server-side |
| Rate limiting | Upstash Redis — 20 req/min detect, 5 req/min humanize (per IP) |
| Usage quota | Daily word limits checked in DB before any API call |
| CSP | Browser blocked from reaching `textaihumanizer.xyz` directly |
| Cookies | `httpOnly: true`, `secure: true`, `sameSite: lax` |
| Supabase | Row Level Security enabled on all tables |
| Stripe webhooks | `stripe-signature` header verified on every event |
| Error messages | Stack traces logged server-side only; generic messages to client |

---

## 5. Application Architecture

### 5.1 Project Structure

```
src/
├── routes/
│   ├── (marketing)/
│   │   └── +page.svelte             # Landing page
│   ├── (auth)/
│   │   ├── login/+page.svelte
│   │   └── register/+page.svelte
│   ├── (app)/
│   │   ├── +layout.svelte           # App shell (nav, sidebar)
│   │   ├── dashboard/+page.svelte   # Usage stats + history
│   │   ├── detect/+page.svelte      # Detection tool
│   │   ├── humanize/+page.svelte    # Humanizer tool
│   │   └── settings/+page.svelte    # Profile + billing
│   └── api/
│       ├── detect/+server.ts        # Secure proxy → /detect
│       ├── humanize/+server.ts      # Secure proxy → /humanize
│       └── stripe/
│           ├── checkout/+server.ts
│           └── webhook/+server.ts
├── lib/
│   ├── server/                      # ⚠️ Server-only — never import in .svelte
│   │   ├── api.ts                   # textaihumanizer.xyz wrapper (token lives here)
│   │   ├── auth.ts                  # Session helpers
│   │   ├── usage.ts                 # Quota tracking
│   │   ├── rateLimit.ts             # Upstash rate limiter
│   │   └── stripe.ts                # Stripe client
│   ├── client/
│   │   └── api.ts                   # Calls /api/* — no secrets, safe in browser
│   └── components/
│       ├── ui/                      # shadcn-svelte base components
│       ├── ScoreGauge.svelte        # SVG arc probability gauge
│       ├── ClassificationBadge.svelte
│       ├── TextEditor.svelte
│       └── PricingCard.svelte
├── hooks.server.ts                  # Auth guard + security headers
└── app.d.ts
```

### 5.2 Data Flow — Detection

```
User pastes text (client validates: min 50 chars)
  → POST /api/detect { text }
  → Server: rate limit check (Upstash)
  → Server: auth + quota check (Supabase)
  → Server: POST textaihumanizer.xyz/detect (Bearer token, server-only)
  → Server: strip model info, return clean payload
  → Client: render ScoreGauge + ClassificationBadge
  → Server (async): record usage in usage_logs
```

### 5.3 Data Flow — Humanizer

```
User pastes text (client validates: max 10,000 chars)
  → POST /api/humanize { text }
  → Server: rate limit check
  → Server: auth required (401 if not logged in)
  → Server: quota check
  → Server: POST textaihumanizer.xyz/humanize (timeout: 135s)
  → Server: return { humanized_text, word_count }
  → Client: show side-by-side diff + copy button
  → Client: offer "Re-check Detection" button
```

---

## 6. Database Schema

```sql
-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id),
  email              TEXT NOT NULL,
  full_name          TEXT,
  plan               TEXT DEFAULT 'free',   -- 'free' | 'pro' | 'agency'
  stripe_customer_id TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES profiles(id),
  stripe_sub_id       TEXT UNIQUE,
  stripe_price_id     TEXT,
  status              TEXT,                 -- 'active' | 'canceled' | 'past_due'
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Detection Results
CREATE TABLE detections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id),
  input_text        TEXT NOT NULL,
  word_count        INT,
  ai_probability    FLOAT,                  -- 0.0 – 1.0
  human_probability FLOAT,
  verdict           TEXT,                   -- 'ai' | 'human'
  classification    TEXT,                   -- 'LIKELY_AI' | 'POSSIBLY_AI' | etc.
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Humanizer Results
CREATE TABLE humanizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id),
  detection_id  UUID REFERENCES detections(id),
  input_text    TEXT NOT NULL,
  output_text   TEXT NOT NULL,
  word_count    INT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Usage
CREATE TABLE usage_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),
  date        DATE DEFAULT CURRENT_DATE,
  words_used  INT DEFAULT 0,
  UNIQUE(user_id, date)
);
```

---

## 7. Stripe Integration

### 7.1 Pricing Plans

| Plan | Monthly | Yearly | Words/day | Features |
|---|---|---|---|---|
| **Free** | $0 | $0 | 500 | Detection only |
| **Pro** | $12 | $99 | Unlimited | Detection + Humanizer + history |
| **Agency** | $49 | $399 | Unlimited | Everything + priority support |

### 7.2 Webhook Events

| Event | Action |
|---|---|
| `checkout.session.completed` | Activate subscription in DB |
| `customer.subscription.updated` | Update plan/status |
| `customer.subscription.deleted` | Downgrade to free |
| `invoice.payment_failed` | Email user, set `past_due` |

---

## 8. Own AI API Reference

Both AI features are powered by **textaihumanizer.xyz** — fine-tuned `gpt-4.1-mini` models. The SvelteKit server is the only caller; the browser never touches this API.

### 8.1 Detect Endpoint

```
POST https://www.textaihumanizer.xyz/detect
Authorization: Bearer PROXY_API_TOKEN
{ "text": "min 50 chars..." }

Response:
{
  "verdict": "ai",
  "ai_probability": 0.923,
  "human_probability": 0.077,
  "classification": "LIKELY_AI"
}
```

### 8.2 Humanize Endpoint

```
POST https://www.textaihumanizer.xyz/humanize
Authorization: Bearer PROXY_API_TOKEN
{ "text": "1–10,000 chars..." }

Response:
{
  "humanized_text": "...",
  "word_count": 42
}
```

### 8.3 Classification → UI Mapping

| classification | Condition | Color | Label |
|---|---|---|---|
| `LIKELY_AI` | ai_probability ≥ 0.70 | 🔴 Red | AI Generated |
| `POSSIBLY_AI` | ai_probability 0.40–0.69 | 🟠 Orange | Possibly AI |
| `POSSIBLY_HUMAN` | human_probability 0.31–0.69 | 🟡 Yellow | Uncertain |
| `LIKELY_HUMAN` | human_probability ≥ 0.70 | 🟢 Green | Human Written |

---

## 9. Design Guidelines

### 9.1 Design Direction

**Aesthetic:** Dark, editorial, precision-tool. Think a forensics lab crossed with a premium SaaS — sharp, serious, trustworthy. Not playful. Not corporate purple gradients. The product deals with truth vs. deception, so the UI must feel authoritative and accurate.

**One thing users will remember:** The detection gauge — a bold arc that fills red-to-green as you type, making the AI probability feel live and visceral.

---

### 9.2 Color Palette

```css
:root {
  /* Backgrounds */
  --color-bg-base:       #0a0a0f;   /* near-black, slightly blue */
  --color-bg-surface:    #111118;   /* card/panel background */
  --color-bg-elevated:   #1a1a24;   /* hover state, inputs */
  --color-bg-border:     #2a2a38;   /* subtle dividers */

  /* Brand */
  --color-brand:         #6366f1;   /* indigo — trust, tech */
  --color-brand-hover:   #818cf8;
  --color-brand-muted:   #6366f120;

  /* Semantic — Detection Results */
  --color-ai:            #ef4444;   /* red — AI detected */
  --color-ai-muted:      #ef444420;
  --color-possibly-ai:   #f97316;   /* orange */
  --color-uncertain:     #eab308;   /* yellow */
  --color-human:         #22c55e;   /* green — human */
  --color-human-muted:   #22c55e20;

  /* Text */
  --color-text-primary:  #f1f1f5;
  --color-text-secondary:#9898b0;
  --color-text-muted:    #55556a;

  /* Accents */
  --color-accent-glow:   #6366f140; /* soft indigo glow on focus */
}
```

---

### 9.3 Typography

```css
/* Display — page titles, hero headings */
font-family: 'Instrument Serif', Georgia, serif;
/* Use for: h1, hero taglines, large score numbers */
/* Feel: editorial, authoritative, slightly literary */

/* Body — all UI text */
font-family: 'DM Sans', system-ui, sans-serif;
/* Use for: body copy, labels, buttons, inputs */
/* Feel: clean, geometric, readable at small sizes */

/* Mono — character counters, model info, code */
font-family: 'JetBrains Mono', monospace;
```

**Type Scale:**
```
Hero title:      56px / Instrument Serif / weight 400
Section heading: 32px / Instrument Serif / weight 400
Card heading:    20px / DM Sans / weight 600
Body:            15px / DM Sans / weight 400
Label/Caption:   12px / DM Sans / weight 500 / letter-spacing 0.08em / uppercase
Counter/Mono:    13px / JetBrains Mono
```

---

### 9.4 Layout & Spacing

- Base unit: `4px`. All spacing in multiples of 4.
- Max content width: `1200px`
- Tool pages (detect/humanize): two-column split — `50% / 50%` on desktop, stacked on mobile
- Cards: `border-radius: 12px`, `border: 1px solid var(--color-bg-border)`
- Page padding: `24px` on mobile, `48px` on desktop

---

### 9.5 Key Components

**Score Gauge (Detection Result)**
- SVG arc, 240° sweep
- Fills from green (0%) to red (100%) based on `ai_probability`
- Large number in center: e.g. `92%` in `Instrument Serif 64px`
- Label below: classification string in `DM Sans 12px` uppercase
- Animates from 0 to result on load (CSS stroke-dashoffset transition, 800ms ease-out)

**Classification Badge**
```
Background: var(--color-ai-muted)   Border: var(--color-ai)
Text: "AI GENERATED"  12px DM Sans uppercase letter-spacing 0.1em
Dot indicator: 8px circle, pulsing animation when LIKELY_AI
```

**Text Editor (Input Area)**
```
Background: var(--color-bg-elevated)
Border: 1px solid var(--color-bg-border)
Focus border: 1px solid var(--color-brand)
Focus box-shadow: 0 0 0 3px var(--color-accent-glow)
Font: DM Sans 15px
Padding: 16px
Resize: vertical, min-height 200px
```

**Primary Button**
```
Background: var(--color-brand)
Hover: var(--color-brand-hover)
Border-radius: 8px
Padding: 12px 24px
Font: DM Sans 14px weight 600
Transition: background 150ms, transform 100ms
Active: transform scale(0.98)
Disabled: opacity 0.4, cursor not-allowed
```

**Character Counter**
```
Position: bottom-right of textarea
Font: JetBrains Mono 12px
Color: var(--color-text-muted) → var(--color-uncertain) at 80% → var(--color-ai) at 100%
Format: "4,231 / 10,000"
```

---

### 9.6 Page-by-Page Design

**Landing Page (`/`)**
- Dark hero, full viewport height
- `Instrument Serif` headline split across two lines with a color-highlighted word
- Live demo embedded directly — paste text, see score, no login required
- Score gauge animates on demo interaction
- Pricing cards: glass-morphism style on dark background
- No stock photos. Abstract SVG background — diagonal grid of dots, very subtle

**Detect Page (`/detect`)**
- Two-column layout: textarea left, results right
- Results panel empty/placeholder state until first run: "Paste text and click Analyze"
- On result: gauge animates in, classification badge fades in with 100ms delay
- "Humanize This" CTA appears below result if `classification` is `LIKELY_AI` or `POSSIBLY_AI`

**Humanize Page (`/humanize`)**
- Two-column: input left, output right
- Output panel shows skeleton loader during the ~130s wait
- Progress indicator: animated dots or a subtle shimmer, NOT a spinner (too uncertain on time)
- On complete: output fades in, word count shown, "Copy" and "Re-check" buttons appear
- Diff highlighting (optional v2): words changed highlighted in `var(--color-brand-muted)`

**Dashboard (`/dashboard`)**
- Usage ring: circular progress showing words used / daily limit
- Recent activity: minimal table — date, type (detect/humanize), word count, result badge
- No data state: illustrated empty state with a CTA to the detect tool

---

### 9.7 Motion & Animation

| Element | Animation | Duration |
|---|---|---|
| Score gauge fill | CSS stroke-dashoffset | 800ms ease-out |
| Classification badge | Fade in + translate Y 8px → 0 | 300ms |
| Result panel reveal | Fade in | 200ms |
| Button press | Scale 0.98 | 100ms |
| LIKELY_AI dot pulse | CSS keyframe scale 1→1.4→1 | 1.5s infinite |
| Page transitions | Fade (SvelteKit `+layout`) | 150ms |
| Skeleton loader | Shimmer gradient sweep | 1.5s infinite |

**Rule:** No animation should exceed 800ms. Nothing loops unless it's a deliberate waiting indicator.

---

### 9.8 Responsive Breakpoints

```
Mobile:  < 768px  → single column, stacked panels
Tablet:  768–1024px → side-by-side but compressed
Desktop: > 1024px → full two-column, max-width 1200px centered
```

---

### 9.9 Dark Mode Only

The app ships **dark mode only** for v1.0. The forensics/precision aesthetic only works on dark backgrounds. Light mode can be added in v2.0 via CSS variables swap.

---

## 10. Key UX Rules

1. **Validate before calling the API.** Character limits enforced client-side so users get instant feedback — no waiting 3s for a server error.
2. **The humanizer is slow (~130s).** Show a clear loading state from the first second. Never leave the user wondering if it crashed.
3. **Free-tier limits are visible.** The usage meter is always on the dashboard and shown as a banner on tool pages when >80% consumed.
4. **One primary action per page.** Detect page → Analyze button. Humanize page → Humanize button. No competing CTAs.
5. **Error messages are human.** Never show raw API errors. Map every error code to a friendly, actionable sentence.

---

## 11. Development Phases

### Phase 1 — Foundation (Week 1–2)
- [ ] SvelteKit scaffold + Tailwind + shadcn-svelte
- [ ] Supabase project + Auth (email + Google)
- [ ] DB schema + RLS policies
- [ ] Landing page

### Phase 2 — Core Tools (Week 3–4)
- [ ] Secure proxy routes `/api/detect` and `/api/humanize`
- [ ] Detection UI — gauge, badge, character counter
- [ ] Humanizer UI — panels, skeleton loader, copy button
- [ ] Usage tracking + quota gates

### Phase 3 — Monetization (Week 5)
- [ ] Stripe products + pricing page
- [ ] Checkout flow + webhook handler
- [ ] Upgrade prompt when free limit hit

### Phase 4 — Polish & Launch (Week 6–7)
- [ ] Dashboard (usage ring + history)
- [ ] Settings (profile + billing portal)
- [ ] Email notifications (Resend)
- [ ] Rate limiting (Upstash)
- [ ] SEO + analytics
- [ ] Deploy to Vercel

---

## 12. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Humanizer slow response (~130s) | High | Long timeout + skeleton loading state |
| Own API goes down | Medium | Retry once (2s delay) → friendly error message |
| `PROXY_API_TOKEN` leaked | Low | Server-only env var; CSP blocks browser access |
| Free-tier abuse | High | IP rate limiting (Upstash) + daily word quota |
| Stripe webhook spoofing | Low | Always verify `stripe-signature` header |
| Legal: academic fraud misuse | Medium | ToS prohibition + disclaimer on humanize page |

---

*End of ADR — HumanizeAI v2.0*
