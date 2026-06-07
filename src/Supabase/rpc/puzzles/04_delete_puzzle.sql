-- ================================================================
-- DOMAIN  : Puzzles
-- TABLE   : public.puzzles
-- FILE    : rpc/puzzles/04_delete_puzzle.sql
--
-- PURPOSE : Permanently delete a puzzle from the database.
--           ADMIN-ONLY. This also cascade-deletes all related
--           user_solved_puzzles rows for that puzzle_id.
--
-- AUTH    : ADMIN role only.
--
-- USAGE   :
--   SELECT delete_puzzle(p_puzzle_id := 'food_1');
-- ================================================================

CREATE OR REPLACE FUNCTION public.delete_puzzle(
    p_puzzle_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- ── AUTH CHECK — ADMIN ONLY ───────────────────────────────
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

    IF v_role IS DISTINCT FROM 'ADMIN' THEN
        RAISE EXCEPTION 'Access denied: only admins can delete puzzles';
    END IF;
    -- ─────────────────────────────────────────────────────────

    DELETE FROM public.puzzles WHERE id = p_puzzle_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Puzzle % not found', p_puzzle_id;
    END IF;

    -- Cascade in schema handles user_solved_puzzles cleanup automatically
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
