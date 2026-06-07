-- ================================================================
-- DOMAIN  : Puzzles
-- TABLE   : public.puzzles
-- FILE    : rpc/puzzles/01_create_puzzle.sql
--
-- PURPOSE : Insert a new puzzle (Shabd or Paheli) into the database.
--           This is an ADMIN-ONLY operation — players cannot add puzzles.
--           In production, run this via Supabase Dashboard SQL Editor
--           or a protected admin panel.
--
-- AUTH    : ADMIN role only (checked via profiles.role = 'ADMIN').
--
-- USAGE   :
--   SELECT * FROM create_puzzle(
--     p_id         := 'food_5',
--     p_category   := 'Fruits & Food',
--     p_clue       := 'Gol gol lal phal jo doctor ko door rakhta hai',
--     p_answer     := 'APPLE',
--     p_decoys     := ARRAY['Z','Q','W'],
--     p_hint       := 'Starts with A (5 letters)',
--     p_difficulty := 'Easy',
--     p_mode       := 'shabd'
--   );
-- ================================================================

CREATE OR REPLACE FUNCTION public.create_puzzle(
    p_id         TEXT,
    p_category   TEXT,
    p_clue       TEXT,
    p_answer     TEXT,
    p_decoys     TEXT[],
    p_hint       TEXT,
    p_difficulty TEXT DEFAULT 'Easy',
    p_mode       TEXT DEFAULT 'shabd'
)
RETURNS public.puzzles AS $$
DECLARE
    v_role      TEXT;
    new_puzzle  public.puzzles;
BEGIN
    -- ── AUTH CHECK — ADMIN ONLY ───────────────────────────────
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

    IF v_role IS DISTINCT FROM 'ADMIN' THEN
        RAISE EXCEPTION 'Access denied: only admins can create puzzles';
    END IF;
    -- ─────────────────────────────────────────────────────────

    INSERT INTO public.puzzles
        (id, category, clue, answer, decoys, hint, difficulty, mode)
    VALUES
        (p_id, p_category, p_clue, upper(p_answer), p_decoys, p_hint, p_difficulty, p_mode)
    RETURNING * INTO new_puzzle;

    RETURN new_puzzle;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
