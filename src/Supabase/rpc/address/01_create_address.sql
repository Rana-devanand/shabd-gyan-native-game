-- ================================================================
-- DOMAIN  : Address
-- TABLE   : public.addresses
-- FILE    : rpc/address/01_create_address.sql
--
-- PURPOSE : Save a user's location details (city, state, country).
--           Called from CreateHousehold screen when a user fills
--           in their address during onboarding/household setup.
--
-- AUTH    : User can only create addresses for THEMSELVES.
--
-- USAGE   :
--   SELECT * FROM create_address(
--     user_id      := auth.uid(),
--     p_city       := 'Mumbai',
--     p_state      := 'Maharashtra',
--     p_country    := 'India',
--     p_household  := '<household-uuid>'   -- optional
--   );
-- ================================================================

CREATE OR REPLACE FUNCTION public.create_address(
    user_id      UUID,            -- Must equal auth.uid()
    p_city       TEXT    DEFAULT NULL,
    p_state      TEXT    DEFAULT NULL,
    p_country    TEXT    DEFAULT 'India',
    p_household  UUID    DEFAULT NULL    -- Link to a household (optional)
)
RETURNS public.addresses AS $$
DECLARE
    v_address public.addresses;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    IF user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Access denied: you can only create your own address';
    END IF;
    -- ─────────────────────────────────────────────────────────

    -- If this is the first address, mark it as primary automatically
    INSERT INTO public.addresses
        (user_id, household_id, city, state, country, is_primary)
    VALUES
        (user_id, p_household, p_city, p_state, p_country,
         -- is_primary = TRUE if no address exists yet for this user
         NOT EXISTS (SELECT 1 FROM public.addresses WHERE user_id = user_id))
    RETURNING * INTO v_address;

    RETURN v_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
