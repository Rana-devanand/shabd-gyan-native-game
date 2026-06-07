-- =====================================================
-- TABLE: households
-- Stores the household group meta (name, join code)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.households (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT        NOT NULL,
    join_code    TEXT        UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
    created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =====================================================
-- TABLE: addresses
-- Stores user address details (city, state, country)
-- linked to a profile, not a household.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.addresses (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    household_id UUID        REFERENCES public.households(id) ON DELETE SET NULL,
    city         TEXT,
    state        TEXT,
    country      TEXT        DEFAULT 'India',
    is_primary   BOOLEAN     DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger: auto-update updated_at on households
CREATE OR REPLACE TRIGGER trigger_households_updated_at
    BEFORE UPDATE ON public.households
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: auto-update updated_at on addresses
CREATE OR REPLACE TRIGGER trigger_addresses_updated_at
    BEFORE UPDATE ON public.addresses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
