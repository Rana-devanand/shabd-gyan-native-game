-- ================================================================
-- DOMAIN  : Points — Leaderboard
-- TABLE   : public.profiles + public.user_solved_puzzles
-- FILE    : rpc/points/02_leaderboard.sql
--
-- PURPOSE : Three leaderboard queries for the Leaderboard screen:
--
--   get_leaderboard      — Global top players, ranked by XP score.
--                          Used by: Leaderboard.tsx podium + list.
--
--   get_my_rank          — Returns only the calling user's rank
--                          (efficient — no need to fetch all rows).
--
--   get_household_leaderboard — Rankings only within the caller's
--                          household (for group competition).
--
-- AUTH    : Any authenticated user can view leaderboard data.
-- ================================================================

-- ── 1. GLOBAL LEADERBOARD ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_leaderboard(
    p_limit  INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    rank         BIGINT,
    user_id      UUID,
    nickname     TEXT,
    avatar       TEXT,
    score        INTEGER,
    streak       INTEGER,
    max_streak   INTEGER,
    solved_count BIGINT,
    is_me        BOOLEAN   -- TRUE if this row is the calling user
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT
        ROW_NUMBER() OVER (ORDER BY p.score DESC, p.max_streak DESC) AS rank,
        p.id          AS user_id,
        p.nickname,
        p.avatar,
        p.score,
        p.streak,
        p.max_streak,
        COUNT(usp.id) AS solved_count,
        p.id = auth.uid() AS is_me   -- highlights the caller's own row
    FROM public.profiles p
    LEFT JOIN public.user_solved_puzzles usp ON usp.user_id = p.id
    GROUP BY p.id, p.nickname, p.avatar, p.score, p.streak, p.max_streak
    ORDER BY p.score DESC, p.max_streak DESC
    LIMIT  p_limit
    OFFSET p_offset;
$$;


-- ── 2. GET MY RANK ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_rank()
RETURNS TABLE (
    rank         BIGINT,
    score        INTEGER,
    solved_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    WITH ranked AS (
        SELECT
            p.id,
            p.score,
            COUNT(usp.id)                                           AS solved_count,
            ROW_NUMBER() OVER (ORDER BY p.score DESC, p.max_streak DESC) AS rank
        FROM public.profiles p
        LEFT JOIN public.user_solved_puzzles usp ON usp.user_id = p.id
        GROUP BY p.id, p.score, p.max_streak
    )
    SELECT rank, score, solved_count
    FROM ranked
    WHERE id = auth.uid();
$$;


-- ── 3. HOUSEHOLD LEADERBOARD (group competition) ─────────────────
CREATE OR REPLACE FUNCTION public.get_household_leaderboard()
RETURNS TABLE (
    rank         BIGINT,
    user_id      UUID,
    nickname     TEXT,
    avatar       TEXT,
    score        INTEGER,
    solved_count BIGINT,
    is_me        BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    WITH my_household AS (
        -- Get the calling user's household_id
        SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY p.score DESC)   AS rank,
        p.id                                         AS user_id,
        p.nickname,
        p.avatar,
        p.score,
        COUNT(usp.id)                                AS solved_count,
        p.id = auth.uid()                            AS is_me
    FROM public.profiles p
    LEFT JOIN public.user_solved_puzzles usp ON usp.user_id = p.id
    -- Only include members of the same household
    WHERE p.household_id = (SELECT household_id FROM my_household)
    GROUP BY p.id, p.nickname, p.avatar, p.score
    ORDER BY p.score DESC;
$$;
