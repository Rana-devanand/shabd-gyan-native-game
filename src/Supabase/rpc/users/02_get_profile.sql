-- ================================================================
-- DOMAIN  : Users / Profiles
-- TABLE   : public.profiles
-- FILE    : rpc/users/02_get_profile.sql
--
-- PURPOSE : Fetch a single profile by user ID.
--           Used by: ProfileScreen, HomeScreen, LeaderboardScreen.
--
-- AUTH    : Any authenticated user can read any profile
--           (needed for leaderboard display).
--           A user can ALWAYS read their own profile.
--
-- USAGE   :
--   -- Get own profile
--   SELECT * FROM get_profile(user_id := auth.uid());
--
--   -- Get another player's profile (for leaderboard cards)
--   SELECT * FROM get_profile(user_id := '<other-uuid>');
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_profile(
    user_id UUID   -- The profile to retrieve
)
RETURNS public.profiles AS $$
DECLARE
    v_profile public.profiles;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    -- Caller must be a logged-in user (anon cannot call this).
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: authentication required';
    END IF;
    -- ─────────────────────────────────────────────────────────

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for user %', user_id;
    END IF;

    RETURN v_profile;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
