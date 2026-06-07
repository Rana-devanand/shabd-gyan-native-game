-- ================================================================
-- DOMAIN  : Households
-- TABLE   : public.households
-- FILE    : rpc/households/02_get_household.sql
--
-- PURPOSE : Fetch household details along with its members count.
--           Called by ProfileScreen and any household management UI.
--
-- AUTH    : Only members of the household can view it.
--           (Checked by verifying caller's profile.household_id)
--
-- USAGE   :
--   -- Get own household (most common)
--   SELECT * FROM get_my_household();
--
--   -- Get a specific household by ID (e.g. for invite preview)
--   SELECT * FROM get_household(p_household_id := '<uuid>');
-- ================================================================

-- Get the caller's own household
CREATE OR REPLACE FUNCTION public.get_my_household()
RETURNS TABLE (
    id           UUID,
    name         TEXT,
    join_code    TEXT,
    created_at   TIMESTAMPTZ,
    member_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT
        h.id,
        h.name,
        h.join_code,
        h.created_at,
        COUNT(p.id) AS member_count
    FROM public.households h
    LEFT JOIN public.profiles p ON p.household_id = h.id
    WHERE h.id = (
        SELECT household_id FROM public.profiles WHERE id = auth.uid()
    )
    GROUP BY h.id, h.name, h.join_code, h.created_at;
$$;

-- ─────────────────────────────────────────────────────────────────
-- Get any household by ID (for invite link preview page)
CREATE OR REPLACE FUNCTION public.get_household(
    p_household_id UUID
)
RETURNS TABLE (
    id           UUID,
    name         TEXT,
    join_code    TEXT,
    created_at   TIMESTAMPTZ,
    member_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT
        h.id,
        h.name,
        h.join_code,
        h.created_at,
        COUNT(p.id) AS member_count
    FROM public.households h
    LEFT JOIN public.profiles p ON p.household_id = h.id
    WHERE h.id = p_household_id
    GROUP BY h.id, h.name, h.join_code, h.created_at;
$$;
