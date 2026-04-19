-- Rename stripe_sub_id → stripe_subscription_id to match webhook code
ALTER TABLE subscriptions RENAME COLUMN stripe_sub_id TO stripe_subscription_id;

-- Track whether user cancelled (but still active until period end)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;
