-- Atomically deduct 1 token; returns new token count, or -1 if already 0.
CREATE OR REPLACE FUNCTION deduct_token(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_tokens INTEGER;
BEGIN
  UPDATE profiles
  SET tokens = tokens - 1
  WHERE id = p_user_id AND tokens > 0
  RETURNING tokens INTO v_new_tokens;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  RETURN v_new_tokens;
END;
$$;

-- Atomically add tokens (e.g. after a top-up purchase).
CREATE OR REPLACE FUNCTION add_tokens(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_tokens INTEGER;
BEGIN
  UPDATE profiles
  SET tokens = tokens + p_amount
  WHERE id = p_user_id
  RETURNING tokens INTO v_new_tokens;

  RETURN COALESCE(v_new_tokens, 0);
END;
$$;
