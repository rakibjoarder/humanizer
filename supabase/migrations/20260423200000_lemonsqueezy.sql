-- Add LemonSqueezy IDs to profiles and subscriptions
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ls_customer_id TEXT;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS ls_subscription_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS profiles_ls_customer_id_idx
  ON profiles (ls_customer_id);
