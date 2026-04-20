ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id   TEXT,
  ADD COLUMN IF NOT EXISTS plan                 TEXT NOT NULL DEFAULT 'pro',
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
