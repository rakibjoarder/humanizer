-- ============================================================
-- HumanizeAI — Full database schema + RLS policies
-- Run against your Supabase project via the SQL Editor or CLI
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT        NOT NULL,
  full_name         TEXT,
  plan              TEXT        NOT NULL DEFAULT 'free',
  words_balance     INTEGER     NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_sub_id        TEXT        UNIQUE,
  stripe_price_id      TEXT,
  status               TEXT,
  current_period_end   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS detections (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  input_text       TEXT        NOT NULL,
  word_count       INT,
  ai_probability   FLOAT,
  human_probability FLOAT,
  verdict          TEXT,
  classification   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS humanizations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  detection_id  UUID        REFERENCES detections(id) ON DELETE SET NULL,
  input_text    TEXT        NOT NULL,
  output_text   TEXT        NOT NULL,
  word_count    INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date       DATE  NOT NULL DEFAULT CURRENT_DATE,
  words_used INT   NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS usage_logs_user_date_idx
  ON usage_logs (user_id, date);

CREATE INDEX IF NOT EXISTS detections_user_created_idx
  ON detections (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS humanizations_user_created_idx
  ON humanizations (user_id, created_at DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE detections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE humanizations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs     ENABLE ROW LEVEL SECURITY;

-- profiles

CREATE POLICY "profiles: users can view own row"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: users can update own row"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- subscriptions

CREATE POLICY "subscriptions: users can view own rows"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "subscriptions: users can insert own rows"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions: users can update own rows"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- detections

CREATE POLICY "detections: users can view own rows"
  ON detections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "detections: users can insert own rows"
  ON detections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "detections: users can update own rows"
  ON detections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "detections: users can delete own rows"
  ON detections FOR DELETE
  USING (auth.uid() = user_id);

-- humanizations

CREATE POLICY "humanizations: users can view own rows"
  ON humanizations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "humanizations: users can insert own rows"
  ON humanizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "humanizations: users can update own rows"
  ON humanizations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "humanizations: users can delete own rows"
  ON humanizations FOR DELETE
  USING (auth.uid() = user_id);

-- usage_logs

CREATE POLICY "usage_logs: users can view own rows"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "usage_logs: users can insert own rows"
  ON usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usage_logs: users can update own rows"
  ON usage_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Auto-create profile on signup ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, plan, words_balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'free',
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop trigger if it already exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
