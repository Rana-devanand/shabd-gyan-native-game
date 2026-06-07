-- ================================================================
-- DOMAIN  : Users / Profiles
-- TABLE   : public.profiles
-- FILE    : rpc/users/01_create_profile.sql
--
-- PURPOSE : Create or update a player profile after signup.
--           Called once from Signup.tsx when the user picks
--           their nickname and avatar for the first time.
--
-- AUTH    : Only the authenticated user can create/update
--           their OWN profile (enforced via auth.uid() check).
--
-- USAGE   :
--   SELECT * FROM create_profile(
--     user_id    := auth.uid(),
--     p_nickname := 'WordNinja',
--     p_avatar   := '🦁'
--   );
-- ================================================================

CREATE OR REPLACE FUNCTION public.create_profile(
    user_id    UUID,     -- Must match auth.uid() (enforced below)
    p_nickname TEXT,     -- Display name chosen by the player
    p_avatar   TEXT      -- Emoji avatar e.g. '🧔🏽‍♂️'
)
RETURNS public.profiles AS $$
DECLARE
    v_profile public.profiles;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    -- A user can only create/modify their own profile.
    IF user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Access denied: you can only create your own profile';
    END IF;
    -- ─────────────────────────────────────────────────────────

    -- UPSERT: insert on first call, update on subsequent calls
    INSERT INTO public.profiles (id, nickname, avatar, updated_at)
    VALUES (user_id, p_nickname, p_avatar, now())
    ON CONFLICT (id) DO UPDATE
        SET nickname   = EXCLUDED.nickname,
            avatar     = EXCLUDED.avatar,
            updated_at = now()
    RETURNING * INTO v_profile;

    RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
