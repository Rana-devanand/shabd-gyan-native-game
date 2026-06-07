-- ================================================================
-- DOMAIN  : Points
-- TABLE   : public.points + public.profiles + public.user_solved_puzzles
-- FILE    : rpc/points/01_solve_and_reward.sql
--
-- PURPOSE : THE CORE GAMEPLAY TRANSACTION.
--           Called every time a player correctly solves a puzzle.
--           Performs EVERYTHING in one atomic transaction:
--
--     Step 1 — Check if puzzle is already solved (prevents double XP)
--     Step 2 — INSERT into user_solved_puzzles (marks puzzle done)
--     Step 3 — INSERT into points ledger (XP audit log)
--     Step 4 — Compute new streak (current + 1, update max if needed)
--     Step 5 — UPDATE profiles (score, streak, max_streak)
--
--           If the puzzle was already solved → returns current profile
--           with NO changes (practice replay = 0 XP, streak unchanged).
--
-- AUTH    : User can only award XP to THEMSELVES.
--
-- USAGE   :
--   -- Called from PlayScreen.tsx → checkAnswer() → on correct answer
--   SELECT * FROM solve_puzzle_and_reward(
--     p_puzzle_id := 'food_1',
--     p_points    := 100,
--     p_reason    := 'puzzle_solved'
--   );
--
-- POINTS REASON VALUES:
--   'puzzle_solved'      — correct answer without hint
--   'puzzle_with_hint'   — correct answer after revealing hint
--   'quest_bonus'        — bonus from completing a quest milestone
-- ================================================================

CREATE OR REPLACE FUNCTION public.solve_puzzle_and_reward(
    p_puzzle_id TEXT,
    p_points    INTEGER,
    p_reason    TEXT DEFAULT 'puzzle_solved'
)
RETURNS public.profiles AS $$
DECLARE
    already_solved  BOOLEAN;
    cur_streak      INTEGER;
    cur_max_streak  INTEGER;
    updated_profile public.profiles;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: authentication required';
    END IF;
    -- ─────────────────────────────────────────────────────────

    -- ── STEP 1: Check for duplicate solve ────────────────────
    SELECT EXISTS(
        SELECT 1 FROM public.user_solved_puzzles
        WHERE user_id = auth.uid() AND puzzle_id = p_puzzle_id
    ) INTO already_solved;
    -- ─────────────────────────────────────────────────────────

    IF NOT already_solved THEN

        -- ── STEP 2: Mark puzzle as solved ────────────────────
        INSERT INTO public.user_solved_puzzles (user_id, puzzle_id)
        VALUES (auth.uid(), p_puzzle_id);

        -- ── STEP 3: Log the XP transaction ───────────────────
        INSERT INTO public.points (user_id, points, reason, reference_id)
        VALUES (auth.uid(), p_points, p_reason, p_puzzle_id);

        -- ── STEP 4: Compute updated streaks ──────────────────
        SELECT streak, max_streak
        INTO   cur_streak, cur_max_streak
        FROM   public.profiles
        WHERE  id = auth.uid();

        cur_streak := cur_streak + 1;
        IF cur_streak > cur_max_streak THEN
            cur_max_streak := cur_streak;
        END IF;

        -- ── STEP 5: Apply all changes to profile ─────────────
        UPDATE public.profiles SET
            score      = score + p_points,
            streak     = cur_streak,
            max_streak = cur_max_streak,
            updated_at = now()
        WHERE id = auth.uid()
        RETURNING * INTO updated_profile;

    ELSE
        -- ── ALREADY SOLVED: return current profile unchanged ──
        -- This is a practice replay — no XP awarded, no streak change
        SELECT * INTO updated_profile
        FROM public.profiles
        WHERE id = auth.uid();
    END IF;

    RETURN updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================================
-- PURPOSE : Award a bonus points transaction (not tied to a puzzle).
--           Used by: QuestScreen for completing quest milestones,
--           and any future reward mechanics.
--
-- USAGE   :
--   SELECT * FROM award_bonus_points(
--     p_points  := 500,
--     p_reason  := 'quest_bonus',
--     p_ref_id  := 'quest_streak_3'
--   );
-- ================================================================

CREATE OR REPLACE FUNCTION public.award_bonus_points(
    p_points  INTEGER,
    p_reason  TEXT,
    p_ref_id  TEXT DEFAULT NULL
)
RETURNS public.profiles AS $$
DECLARE
    updated_profile public.profiles;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: authentication required';
    END IF;
    -- ─────────────────────────────────────────────────────────

    -- Insert into points ledger for full audit trail
    INSERT INTO public.points (user_id, points, reason, reference_id)
    VALUES (auth.uid(), p_points, p_reason, p_ref_id);

    -- Update profile score (floor at 0 — can never go negative)
    UPDATE public.profiles SET
        score      = GREATEST(0, score + p_points),
        updated_at = now()
    WHERE id = auth.uid()
    RETURNING * INTO updated_profile;

    RETURN updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================================
-- PURPOSE : Fetch the full XP transaction history for a user.
--           Used by: ProfileScreen "Points History" section (future).
--
-- USAGE   :
--   SELECT * FROM get_my_points_history(p_limit := 20);
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_my_points_history(
    p_limit  INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS SETOF public.points AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: authentication required';
    END IF;

    RETURN QUERY
    SELECT *
    FROM public.points
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
