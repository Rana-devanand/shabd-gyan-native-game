-- ================================================================
-- DOMAIN  : Puzzles
-- TABLE   : public.puzzles + public.user_solved_puzzles
-- FILE    : rpc/puzzles/02_get_puzzles.sql
--
-- PURPOSE : Three read functions for fetching puzzles:
--
--   get_puzzles_by_category : Fetch all puzzles in a category + mode,
--                             annotated with whether the caller solved them.
--                             Used by: PlayScreen, DifficultyScreen.
--
--   get_puzzle_by_id        : Fetch a single puzzle by its ID.
--
--   get_unsolved_puzzles    : Fetch puzzles the caller hasn't solved yet.
--                             Used by: HomeScreen daily challenge button.
--
-- AUTH    : Any authenticated user can read puzzles.
-- ================================================================

-- ── 1. GET PUZZLES BY CATEGORY + MODE ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_puzzles_by_category(
    p_category TEXT,
    p_mode     TEXT DEFAULT 'shabd'   -- 'shabd' | 'paheli'
)
RETURNS TABLE (
    id          TEXT,
    category    TEXT,
    clue        TEXT,
    answer      TEXT,
    decoys      TEXT[],
    hint        TEXT,
    difficulty  TEXT,
    mode        TEXT,
    is_solved   BOOLEAN   -- TRUE if the calling user has already solved this puzzle
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT
        p.id,
        p.category,
        p.clue,
        p.answer,
        p.decoys,
        p.hint,
        p.difficulty,
        p.mode,
        -- is_solved: check if this user has a row in user_solved_puzzles
        EXISTS (
            SELECT 1 FROM public.user_solved_puzzles usp
            WHERE usp.user_id = auth.uid() AND usp.puzzle_id = p.id
        ) AS is_solved
    FROM public.puzzles p
    WHERE p.category = p_category
      AND p.mode     = p_mode
    ORDER BY
        CASE p.difficulty
            WHEN 'Easy'       THEN 1
            WHEN 'Medium'     THEN 2
            WHEN 'Hard'       THEN 3
            WHEN 'Super Hard' THEN 4
        END;
$$;


-- ── 2. GET SINGLE PUZZLE BY ID ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_puzzle_by_id(
    p_puzzle_id TEXT
)
RETURNS TABLE (
    id          TEXT,
    category    TEXT,
    clue        TEXT,
    answer      TEXT,
    decoys      TEXT[],
    hint        TEXT,
    difficulty  TEXT,
    mode        TEXT,
    is_solved   BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT
        p.id,
        p.category,
        p.clue,
        p.answer,
        p.decoys,
        p.hint,
        p.difficulty,
        p.mode,
        EXISTS (
            SELECT 1 FROM public.user_solved_puzzles usp
            WHERE usp.user_id = auth.uid() AND usp.puzzle_id = p.id
        ) AS is_solved
    FROM public.puzzles p
    WHERE p.id = p_puzzle_id;
$$;


-- ── 3. GET UNSOLVED PUZZLES (for Daily Challenge / Next Puzzle) ──
CREATE OR REPLACE FUNCTION public.get_unsolved_puzzles(
    p_mode     TEXT    DEFAULT 'shabd',
    p_category TEXT    DEFAULT NULL,    -- NULL = all categories
    p_limit    INTEGER DEFAULT 10
)
RETURNS TABLE (
    id         TEXT,
    category   TEXT,
    clue       TEXT,
    answer     TEXT,
    decoys     TEXT[],
    hint       TEXT,
    difficulty TEXT,
    mode       TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT p.id, p.category, p.clue, p.answer, p.decoys, p.hint, p.difficulty, p.mode
    FROM public.puzzles p
    WHERE p.mode = p_mode
      AND (p_category IS NULL OR p.category = p_category)
      -- Exclude already-solved puzzles for this user
      AND NOT EXISTS (
          SELECT 1 FROM public.user_solved_puzzles usp
          WHERE usp.user_id = auth.uid() AND usp.puzzle_id = p.id
      )
    ORDER BY RANDOM()   -- Randomise so daily challenge feels fresh
    LIMIT p_limit;
$$;
