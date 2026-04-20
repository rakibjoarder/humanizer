-- Revert: new signups default back to 'free' with 0 words balance.
-- Plan is only upgraded when the user subscribes via Stripe.

ALTER TABLE profiles
  ALTER COLUMN plan SET DEFAULT 'free',
  ALTER COLUMN words_balance SET DEFAULT 0;

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
