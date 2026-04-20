-- Change default plan for new signups from 'free' to 'pro'
-- and give them 50,000 words balance by default.

-- 1. Update column defaults
ALTER TABLE profiles
  ALTER COLUMN plan SET DEFAULT 'pro',
  ALTER COLUMN words_balance SET DEFAULT 50000;

-- 2. Update the new-user trigger to insert with plan='pro' and 50,000 words
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
    'pro',
    50000
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
