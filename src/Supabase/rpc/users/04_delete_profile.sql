-- ================================================================
-- DOMAIN  : Users / Profiles
-- TABLE   : public.profiles (cascades to all child tables)
-- FILE    : rpc/users/04_delete_profile.sql
--
-- PURPOSE : Permanently delete a player account and ALL their data.
--           This triggers cascade deletes on:
--             • user_solved_puzzles
--             • points
--             • user_ads_watched
--             • user_activities
--             • addresses
--           The auth.users row itself must be deleted separately
--           via supabase.auth.admin.deleteUser() (server-side only).
--
-- AUTH    : User can only delete their OWN account.
--           In ProfileScreen this is behind a warning dialog.
--
-- USAGE   :
--   SELECT delete_profile(user_id := auth.uid());
-- ================================================================

CREATE OR REPLACE FUNCTION public.delete_profile(
    user_id UUID   -- Must equal auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    IF user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Access denied: you can only delete your own profile';
    END IF;
    -- ─────────────────────────────────────────────────────────

    -- Delete profile; cascade rules in schema will auto-clean
    -- all child records (points, solved puzzles, activities, etc.)
    DELETE FROM public.profiles WHERE id = user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for user %', user_id;
    END IF;

    -- Return TRUE to indicate successful deletion
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
