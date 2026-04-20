-- Free users now start with 150 words to try the product.
-- Also update any existing free users with 0 balance to 150.

-- 1. Update trigger so new signups get 150 words
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
    150
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Give existing free users with 0 balance their 150-word starter pack
UPDATE public.profiles
SET words_balance = 150
WHERE plan = 'free' AND words_balance = 0;
