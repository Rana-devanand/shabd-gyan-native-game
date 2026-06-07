-- ================================================================
-- DOMAIN  : Address
-- TABLE   : public.addresses
-- FILE    : rpc/address/02_get_address.sql
--
-- PURPOSE : Fetch all addresses for a user.
--           Returns them ordered so primary address comes first.
--           Used by: ProfileScreen (to display saved location).
--
-- AUTH    : User can only read THEIR OWN addresses.
--
-- USAGE   :
--   SELECT * FROM get_address(user_id := auth.uid());
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_address(
    user_id UUID   -- Must equal auth.uid()
)
RETURNS SETOF public.addresses AS $$
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    IF user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Access denied: you can only read your own addresses';
    END IF;
    -- ─────────────────────────────────────────────────────────

    RETURN QUERY
    SELECT *
    FROM public.addresses
    WHERE addresses.user_id = get_address.user_id
    ORDER BY is_primary DESC, created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
