-- ================================================================
-- DOMAIN  : Households
-- TABLE   : public.households + public.profiles
-- FILE    : rpc/households/04_join_leave_household.sql
--
-- PURPOSE : Two functions —
--           join_household  : Link a user to an existing household
--                             via its join_code (short 8-char code).
--           leave_household : Unlink a user from their household
--                             (sets household_id = NULL).
--
-- AUTH    : User can only join/leave for THEMSELVES.
--
-- USAGE   :
--   -- Join by code (shown on household share screen)
--   SELECT * FROM join_household(p_join_code := 'ABC12345');
--
--   -- Leave current household
--   SELECT leave_household();
-- ================================================================

-- ── JOIN HOUSEHOLD ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_household(
    p_join_code TEXT   -- The 8-char code shown on the household invite
)
RETURNS public.profiles AS $$
DECLARE
    v_hh_id          UUID;
    updated_profile  public.profiles;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: authentication required';
    END IF;
    -- ─────────────────────────────────────────────────────────

    -- Resolve the join_code to a household ID
    SELECT id INTO v_hh_id
    FROM public.households
    WHERE join_code = p_join_code;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid join code: household not found';
    END IF;

    -- Link the user's profile to this household
    UPDATE public.profiles
    SET household_id = v_hh_id,
        updated_at   = now()
    WHERE id = auth.uid()
    RETURNING * INTO updated_profile;

    RETURN updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── LEAVE HOUSEHOLD ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leave_household()
RETURNS public.profiles AS $$
DECLARE
    updated_profile public.profiles;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: authentication required';
    END IF;
    -- ─────────────────────────────────────────────────────────

    -- Set household_id back to NULL (user is now householdless)
    UPDATE public.profiles
    SET household_id = NULL,
        updated_at   = now()
    WHERE id = auth.uid()
    RETURNING * INTO updated_profile;

    RETURN updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
