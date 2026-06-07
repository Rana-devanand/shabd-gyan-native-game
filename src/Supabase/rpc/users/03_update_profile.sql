-- ================================================================
-- DOMAIN  : Users / Profiles
-- TABLE   : public.profiles
-- FILE    : rpc/users/03_update_profile.sql
--
-- PURPOSE : Update editable profile fields.
--           Called from ProfileScreen when user saves changes
--           (nickname, avatar, sound toggle, difficulty pref).
--
-- AUTH    : User can only update their OWN profile.
--
-- USAGE   :
--   SELECT * FROM update_profile(
--     user_id           := auth.uid(),
--     p_nickname        := 'NewName',
--     p_avatar          := '🦊',
--     p_sound_enabled   := false,
--     p_difficulty_pref := 'Hard'
--   );
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_profile(
    user_id           UUID,     -- Must equal auth.uid()
    p_nickname        TEXT    DEFAULT NULL,   -- New display name (NULL = no change)
    p_avatar          TEXT    DEFAULT NULL,   -- New emoji avatar (NULL = no change)
    p_sound_enabled   BOOLEAN DEFAULT NULL,   -- Sound on/off toggle
    p_difficulty_pref TEXT    DEFAULT NULL    -- 'Easy' | 'Medium' | 'Hard' | 'Super Hard'
)
RETURNS public.profiles AS $$
DECLARE
    v_profile public.profiles;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    IF user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Access denied: you can only update your own profile';
    END IF;
    -- ─────────────────────────────────────────────────────────

    -- COALESCE: only update fields that are explicitly passed in.
    -- Passing NULL leaves the existing value unchanged.
    UPDATE public.profiles SET
        nickname              = COALESCE(p_nickname, nickname),
        avatar                = COALESCE(p_avatar, avatar),
        sound_enabled         = COALESCE(p_sound_enabled, sound_enabled),
        difficulty_preference = COALESCE(p_difficulty_pref, difficulty_preference),
        updated_at            = now()
    WHERE id = user_id
    RETURNING * INTO v_profile;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for user %', user_id;
    END IF;

    RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
