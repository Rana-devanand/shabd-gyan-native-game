-- ================================================================
-- TABLE 14: user_story_chapters
-- Dynamic, AI-generated chapters for Shabdgyan's Story Mode.
-- Stores 50 unique chapters/questions generated per user per language.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_story_chapters (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    chapter_id        INTEGER     NOT NULL, -- Chapter number from 1 to 50
    title             TEXT        NOT NULL, -- Chapter title
    hindi_title       TEXT        NOT NULL, -- Hindi/Narrative chapter title
    narrative         TEXT        NOT NULL, -- AI-generated story narrative
    puzzle_id         TEXT        NOT NULL, -- e.g., 'story_ch_X'
    category          TEXT        NOT NULL, -- Theme category
    difficulty        TEXT        NOT NULL, -- Theme difficulty
    question          TEXT        NOT NULL, -- AI-generated trick question
    answer            TEXT        NOT NULL, -- UPPERCASE answer
    hint              TEXT        NOT NULL, -- AI-generated hint
    language          TEXT        NOT NULL, -- Language game setting when generated
    solved            BOOLEAN     DEFAULT FALSE NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, chapter_id)
);

ALTER TABLE public.user_story_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_chapters_own" ON public.user_story_chapters
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_story_chapters_user_id ON public.user_story_chapters(user_id);
