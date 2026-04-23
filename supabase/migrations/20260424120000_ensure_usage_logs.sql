-- Idempotent: creates usage_logs if the project never applied the full initial_schema migration.

CREATE TABLE IF NOT EXISTS public.usage_logs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
	date DATE NOT NULL DEFAULT (CURRENT_DATE),
	words_used INT NOT NULL DEFAULT 0,
	UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS usage_logs_user_date_idx
	ON public.usage_logs (user_id, date);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_logs: users can view own rows" ON public.usage_logs;
CREATE POLICY "usage_logs: users can view own rows"
	ON public.usage_logs FOR SELECT
	USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "usage_logs: users can insert own rows" ON public.usage_logs;
CREATE POLICY "usage_logs: users can insert own rows"
	ON public.usage_logs FOR INSERT
	WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "usage_logs: users can update own rows" ON public.usage_logs;
CREATE POLICY "usage_logs: users can update own rows"
	ON public.usage_logs FOR UPDATE
	USING (auth.uid() = user_id)
	WITH CHECK (auth.uid() = user_id);
