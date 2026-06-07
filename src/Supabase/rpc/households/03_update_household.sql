-- ================================================================
-- DOMAIN  : Households
-- TABLE   : public.households
-- FILE    : rpc/households/03_update_household.sql
--
-- PURPOSE : Rename a household.
--           Only the creator (created_by) can rename it.
--
-- AUTH    : Only the household creator can update it.
--
-- USAGE   :
--   SELECT * FROM update_household(
--     p_household_id := '<uuid>',
--     p_name         := 'New Household Name'
--   );
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_household(
    p_household_id UUID,
    p_name         TEXT
)
RETURNS public.households AS $$
DECLARE
    v_household public.households;
    v_creator   UUID;
BEGIN
    -- ── FETCH CREATOR ─────────────────────────────────────────
    SELECT created_by INTO v_creator
    FROM public.households
    WHERE id = p_household_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Household % not found', p_household_id;
    END IF;
    -- ─────────────────────────────────────────────────────────

    -- ── AUTH CHECK ────────────────────────────────────────────
    -- Only the original creator can rename their household
    IF v_creator <> auth.uid() THEN
        RAISE EXCEPTION 'Access denied: only the household creator can rename it';
    END IF;
    -- ─────────────────────────────────────────────────────────

    UPDATE public.households
    SET name       = p_name,
        updated_at = now()
    WHERE id = p_household_id
    RETURNING * INTO v_household;

    RETURN v_household;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
