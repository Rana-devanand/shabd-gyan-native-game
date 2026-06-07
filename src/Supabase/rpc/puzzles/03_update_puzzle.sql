    -- ================================================================
    -- DOMAIN  : Puzzles
    -- TABLE   : public.puzzles
    -- FILE    : rpc/puzzles/03_update_puzzle.sql
    --
    -- PURPOSE : Edit an existing puzzle's fields.
    --           ADMIN-ONLY — players cannot modify puzzle data.
    --
    -- AUTH    : ADMIN role only.
    --
    -- USAGE   :
    --   SELECT * FROM update_puzzle(
    --     p_puzzle_id  := 'food_1',
    --     p_clue       := 'Updated Hinglish clue here',
    --     p_difficulty := 'Medium'
    --   );
    -- ================================================================

    CREATE OR REPLACE FUNCTION public.update_puzzle(
        p_puzzle_id  TEXT,
        p_category   TEXT    DEFAULT NULL,
        p_clue       TEXT    DEFAULT NULL,
        p_answer     TEXT    DEFAULT NULL,
        p_decoys     TEXT[]  DEFAULT NULL,
        p_hint       TEXT    DEFAULT NULL,
        p_difficulty TEXT    DEFAULT NULL,
        p_mode       TEXT    DEFAULT NULL
    )
    RETURNS public.puzzles AS $$
    DECLARE
        v_role        TEXT;
        updated_puzzle public.puzzles;
    BEGIN
        -- ── AUTH CHECK — ADMIN ONLY ───────────────────────────────
        SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

        IF v_role IS DISTINCT FROM 'ADMIN' THEN
            RAISE EXCEPTION 'Access denied: only admins can update puzzles';
        END IF;
        -- ─────────────────────────────────────────────────────────

        UPDATE public.puzzles SET
            category   = COALESCE(p_category,   category),
            clue       = COALESCE(p_clue,       clue),
            answer     = COALESCE(upper(p_answer), answer),
            decoys     = COALESCE(p_decoys,     decoys),
            hint       = COALESCE(p_hint,       hint),
            difficulty = COALESCE(p_difficulty, difficulty),
            mode       = COALESCE(p_mode,       mode)
        WHERE id = p_puzzle_id
        RETURNING * INTO updated_puzzle;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Puzzle % not found', p_puzzle_id;
        END IF;

        RETURN updated_puzzle;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
