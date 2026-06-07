-- ================================================================
-- DOMAIN  : Address
-- TABLE   : public.addresses
-- FILE    : rpc/address/03_update_address.sql
--
-- PURPOSE : Update an existing address record.
--           Called from ProfileScreen when user edits their city/state.
--
-- AUTH    : User can only update addresses they OWN.
--
-- USAGE   :
--   SELECT * FROM update_address(
--     p_address_id := '<address-uuid>',
--     p_city       := 'Pune',
--     p_state      := 'Maharashtra',
--     p_country    := 'India'
--   );
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_address(
    p_address_id UUID,            -- The address record to update
    p_city       TEXT DEFAULT NULL,
    p_state      TEXT DEFAULT NULL,
    p_country    TEXT DEFAULT NULL
)
RETURNS public.addresses AS $$
DECLARE
    v_address    public.addresses;
    v_owner_id   UUID;
BEGIN
    -- ── FETCH OWNER ───────────────────────────────────────────
    -- Retrieve the user_id for this address first
    SELECT user_id INTO v_owner_id
    FROM public.addresses
    WHERE id = p_address_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Address % not found', p_address_id;
    END IF;
    -- ─────────────────────────────────────────────────────────

    -- ── AUTH CHECK ────────────────────────────────────────────
    -- Confirm the caller owns this address
    IF v_owner_id <> auth.uid() THEN
        RAISE EXCEPTION 'Access denied: you can only update your own addresses';
    END IF;
    -- ─────────────────────────────────────────────────────────

    -- Partial update: only change fields that are passed in
    UPDATE public.addresses SET
        city       = COALESCE(p_city,    city),
        state      = COALESCE(p_state,   state),
        country    = COALESCE(p_country, country),
        updated_at = now()
    WHERE id = p_address_id
    RETURNING * INTO v_address;

    RETURN v_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
