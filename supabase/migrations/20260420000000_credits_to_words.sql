-- ============================================================
-- Migration: rename tokens → words_balance, update plan values,
-- add word-based atomic RPC functions
-- ============================================================

-- 1. Rename the tokens column to words_balance
ALTER TABLE profiles
  RENAME COLUMN tokens TO words_balance;

-- 2. Drop old token RPC functions
DROP FUNCTION IF EXISTS deduct_token(UUID);
DROP FUNCTION IF EXISTS add_tokens(UUID, INTEGER);

-- 3. Atomically deduct words; returns new balance, or -1 if insufficient.
--    For unlimited plans (words_balance = -1), returns 0 immediately.
CREATE OR REPLACE FUNCTION deduct_words(p_user_id UUID, p_words INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE profiles
  SET words_balance = words_balance - p_words
  WHERE id = p_user_id AND words_balance >= p_words
  RETURNING words_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  RETURN v_new_balance;
END;
$$;

-- 4. Atomically add words (e.g. after a top-up purchase).
CREATE OR REPLACE FUNCTION add_words(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE profiles
  SET words_balance = words_balance + p_amount
  WHERE id = p_user_id
  RETURNING words_balance INTO v_new_balance;

  RETURN COALESCE(v_new_balance, 0);
END;
$$;
