-- ── word_credits: track every words-balance top-up ────────────────────────────
CREATE TABLE IF NOT EXISTS word_credits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      INT         NOT NULL,          -- words added (always positive)
  source      TEXT        NOT NULL,          -- 'subscription' | 'subscription_renewal' | 'word_pack' | 'admin_credit'
  description TEXT,                          -- human-readable label shown in UI
  stripe_ref  TEXT,                          -- stripe invoice/session ID if applicable
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS word_credits_user_created_idx
  ON word_credits (user_id, created_at DESC);

ALTER TABLE word_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "word_credits: users can view own rows" ON public.word_credits;
CREATE POLICY "word_credits: users can view own rows"
  ON public.word_credits FOR SELECT
  USING (auth.uid() = user_id);
