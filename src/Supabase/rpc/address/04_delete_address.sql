-- ================================================================
-- DOMAIN  : Address
-- TABLE   : public.addresses
-- FILE    : rpc/address/04_delete_address.sql
--
-- PURPOSE : Delete a specific address record.
--
-- AUTH    : User can only delete their OWN addresses.
--
-- USAGE   :
--   SELECT delete_address(p_address_id := '<address-uuid>');
-- ================================================================

CREATE OR REPLACE FUNCTION public.delete_address(
    p_address_id UUID   -- The address record to delete
)
RETURNS BOOLEAN AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    -- ── FETCH OWNER ───────────────────────────────────────────
    SELECT user_id INTO v_owner_id
    FROM public.addresses
    WHERE id = p_address_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Address % not found', p_address_id;
    END IF;
    -- ─────────────────────────────────────────────────────────

    -- ── AUTH CHECK ────────────────────────────────────────────
    IF v_owner_id <> auth.uid() THEN
        RAISE EXCEPTION 'Access denied: you can only delete your own addresses';
    END IF;
    -- ─────────────────────────────────────────────────────────

    DELETE FROM public.addresses WHERE id = p_address_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
