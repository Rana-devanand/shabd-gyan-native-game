-- ================================================================
-- DOMAIN  : Activity
-- TABLE   : public.user_activities
-- FILE    : rpc/activity/01_log_activity.sql
--
-- PURPOSE : Record a user activity event for analytics tracking.
--           Called from any screen when a notable action occurs.
--
-- EXAMPLE ACTIVITY STRINGS:
--   'login'            — user opened the app and logged in
--   'start_game'       — user tapped "Chalo Khelein" on PlayScreen
--   'open_leaderboard' — user opened the Leaderboard tab
--   'hint_revealed'    — user tapped "Reveal Hint" during play
--   'category_selected'— user chose a puzzle category
--   'quest_completed'  — user finished a quest milestone
--
-- AUTH    : User can only log activities for THEMSELVES.
--
-- USAGE   :
--   SELECT * FROM log_activity(
--     p_activity := 'start_game',
--     p_details  := '{"category": "Fruits & Food", "difficulty": "Easy"}'::jsonb
--   );
-- ================================================================

CREATE OR REPLACE FUNCTION public.log_activity(
    p_activity TEXT,
    p_details  JSONB DEFAULT '{}'::jsonb
)
RETURNS public.user_activities AS $$
DECLARE
    new_activity public.user_activities;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: authentication required';
    END IF;
    -- ─────────────────────────────────────────────────────────

    INSERT INTO public.user_activities (user_id, activity, details)
    VALUES (auth.uid(), p_activity, p_details)
    RETURNING * INTO new_activity;

    RETURN new_activity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================================================================
-- PURPOSE : Fetch recent activity events for a user.
--           Useful for admin dashboards or a "Your Activity" screen.
--
-- USAGE   :
--   SELECT * FROM get_user_activities(p_limit := 20);
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_user_activities(
    p_limit  INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS SETOF public.user_activities AS $$
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: authentication required';
    END IF;
    -- ─────────────────────────────────────────────────────────

    RETURN QUERY
    SELECT *
    FROM public.user_activities
    WHERE user_id = auth.uid()
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ================================================================
-- PURPOSE : Clear all activity logs for the calling user.
--           Called during "Delete Account" in ProfileScreen.
--
-- USAGE   :
--   SELECT clear_my_activities();
-- ================================================================

CREATE OR REPLACE FUNCTION public.clear_my_activities()
RETURNS INTEGER AS $$
DECLARE
    rows_deleted INTEGER;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: authentication required';
    END IF;
    -- ─────────────────────────────────────────────────────────

    DELETE FROM public.user_activities WHERE user_id = auth.uid();
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;

    RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
