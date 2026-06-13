-- ================================================================
-- TABLE 10: user_quests
-- Tracks daily quest attempts/completions (daily_warrior, decipher_scroll, high_score_hunt).
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_quests (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quest_type     TEXT        NOT NULL CHECK (quest_type IN ('daily_warrior', 'decipher_scroll', 'high_score_hunt')),
    status         TEXT        NOT NULL CHECK (status IN ('not_started', 'played', 'completed')),
    score_earned   INTEGER     DEFAULT 0 NOT NULL,
    played_date    DATE        DEFAULT CURRENT_DATE NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, quest_type, played_date)
);

-- Enable RLS
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/write their own quest logs
CREATE POLICY "quests_own" ON public.user_quests
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
