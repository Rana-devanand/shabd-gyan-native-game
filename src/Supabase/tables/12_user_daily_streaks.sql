-- ================================================================
-- TABLE 12: user_daily_streaks
-- Logs daily login check-ins to track calendar streak consistency.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_daily_streaks (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    login_date     DATE        DEFAULT CURRENT_DATE NOT NULL,
    streak_count   INTEGER     NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, login_date)
);

-- Enable RLS
ALTER TABLE public.user_daily_streaks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/insert their own login check-ins
CREATE POLICY "streaks_own" ON public.user_daily_streaks
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
