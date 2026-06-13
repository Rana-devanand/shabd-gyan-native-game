-- ================================================================
-- TABLE 11: user_played_quizzes
-- Tracks detailed logs of every puzzle/quiz played by the user.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_played_quizzes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    puzzle_id       TEXT        NOT NULL, -- Can be local ID or Groq generated dynamic ID
    category        TEXT        NOT NULL,
    difficulty      TEXT        NOT NULL,
    mode            TEXT        NOT NULL, -- 'shabd', 'paheli', 'quests', or 'story'
    question        TEXT        NOT NULL, -- Clue or Story prompt
    answer          TEXT        NOT NULL, -- Correct word solution
    used_hint       BOOLEAN     DEFAULT FALSE NOT NULL,
    revealed_answer BOOLEAN     DEFAULT FALSE NOT NULL,
    coins_earned    INTEGER     DEFAULT 0 NOT NULL,
    user_answer     TEXT,
    played_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_played_quizzes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/insert their own quiz history
CREATE POLICY "quizzes_own" ON public.user_played_quizzes
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
