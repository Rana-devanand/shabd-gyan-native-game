-- ================================================================
-- Shabd Gyan — Complete Database Schema
-- Paste this entire file into the Supabase SQL Editor and run it.
-- Tables are created in dependency order.
-- ================================================================

-- Ensure UUID helpers are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- SHARED HELPER: auto-update updated_at timestamp
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- TABLE 1: households
-- Group container — players can form/join a household.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.households (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    join_code   TEXT        UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
    created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE OR REPLACE TRIGGER trigger_households_updated_at
    BEFORE UPDATE ON public.households
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ================================================================
-- TABLE 2: profiles
-- Extended user data linked to auth.users.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id                    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname              TEXT,
    avatar                TEXT        DEFAULT '🧔🏽‍♂️',
    role                  TEXT        DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    sound_enabled         BOOLEAN     DEFAULT TRUE  NOT NULL,
    difficulty_preference TEXT        DEFAULT 'Easy'
                          CHECK (difficulty_preference IN ('Easy','Medium','Hard','Super Hard')),
    household_id          UUID        REFERENCES public.households(id) ON DELETE SET NULL,
    score                 INTEGER     DEFAULT 0    NOT NULL,
    streak                INTEGER     DEFAULT 0    NOT NULL,
    max_streak            INTEGER     DEFAULT 0    NOT NULL,
    quest_claimed_bonus   BOOLEAN     DEFAULT FALSE NOT NULL,
    created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at            TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE OR REPLACE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on new auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nickname, avatar)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nickname', NEW.raw_user_meta_data->>'name', 'Player'),
        COALESCE(NEW.raw_user_meta_data->>'avatar', '🧔🏽‍♂️')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- TABLE 3: addresses
-- User address details (city, state, country).
-- Separate from households so addresses are per-user.
-- ================================================================
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

CREATE OR REPLACE TRIGGER trigger_addresses_updated_at
    BEFORE UPDATE ON public.addresses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ================================================================
-- TABLE 4: puzzles
-- Stores Shabd (word scramble) and Paheli (riddle) puzzle data.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.puzzles (
    id          TEXT        PRIMARY KEY,
    category    TEXT        NOT NULL,
    clue        TEXT        NOT NULL,
    answer      TEXT        NOT NULL,
    decoys      TEXT[]      NOT NULL DEFAULT '{}',
    hint        TEXT        NOT NULL,
    difficulty  TEXT        DEFAULT 'Easy'
                CHECK (difficulty IN ('Easy','Medium','Hard','Super Hard')),
    mode        TEXT        DEFAULT 'shabd'
                CHECK (mode IN ('shabd','paheli')),
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ================================================================
-- TABLE 5: user_solved_puzzles
-- Tracks which puzzles a user has solved — prevents repeats.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_solved_puzzles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    puzzle_id   TEXT        NOT NULL REFERENCES public.puzzles(id) ON DELETE CASCADE,
    solved_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, puzzle_id)
);

-- ================================================================
-- TABLE 6: invited_history
-- Tracks household invitations sent to users.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.invited_history (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id   UUID        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    invited_email  TEXT        NOT NULL,
    invited_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    status         TEXT        DEFAULT 'pending' NOT NULL
                   CHECK (status IN ('pending','accepted','expired')),
    token          TEXT        UNIQUE,
    created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
    expires_at     TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days') NOT NULL
);

-- ================================================================
-- TABLE 7: points
-- Granular XP ledger — every earn/deduction is logged here.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.points (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points        INTEGER     NOT NULL,
    reason        TEXT        NOT NULL,   -- e.g. 'puzzle_solved', 'hint_used', 'quest_bonus'
    reference_id  TEXT,                  -- puzzle_id or quest_id
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ================================================================
-- TABLE 8: user_ads_watched
-- Logs every ad view — enables future rewarded-ad features.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_ads_watched (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ad_type     TEXT        NOT NULL
                CHECK (ad_type IN ('rewarded','interstitial','banner')),
    placement   TEXT,       -- e.g. 'hint_reveal', 'between_levels'
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ================================================================
-- TABLE 9: user_activities
-- Generic event log for analytics.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_activities (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity    TEXT        NOT NULL,   -- e.g. 'login', 'start_game', 'open_leaderboard'
    details     JSONB       DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ================================================================
-- PERFORMANCE INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_score          ON public.profiles(score DESC);
CREATE INDEX IF NOT EXISTS idx_points_user_id          ON public.points(user_id);
CREATE INDEX IF NOT EXISTS idx_solved_user_id          ON public.user_solved_puzzles(user_id);
CREATE INDEX IF NOT EXISTS idx_solved_puzzle_id        ON public.user_solved_puzzles(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id      ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_ads_user_id             ON public.user_ads_watched(user_id);
CREATE INDEX IF NOT EXISTS idx_invites_household_id    ON public.invited_history(household_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id       ON public.addresses(user_id);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS so users can only read/write their own data.
-- ================================================================
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_solved_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ads_watched   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invited_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households         ENABLE ROW LEVEL SECURITY;

-- profiles: users can only read/write their own row
CREATE POLICY "profiles_own" ON public.profiles
    USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- addresses: users can read/write their own addresses
CREATE POLICY "addresses_own" ON public.addresses
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_solved_puzzles: own rows only
CREATE POLICY "solved_own" ON public.user_solved_puzzles
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- points: own rows only
CREATE POLICY "points_own" ON public.points
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ads: own rows only
CREATE POLICY "ads_own" ON public.user_ads_watched
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- activities: own rows only
CREATE POLICY "activities_own" ON public.user_activities
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- leaderboard: all authenticated users can read profiles (for rankings)
CREATE POLICY "profiles_read_all" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- households: members can view their household
CREATE POLICY "household_members_read" ON public.households
    FOR SELECT USING (
        id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
    );

-- invitations: own household's invites
CREATE POLICY "invites_household" ON public.invited_history
    FOR SELECT USING (
        household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
    );

-- ================================================================
-- RPC FUNCTIONS (inline — deploy along with schema)
-- ================================================================

-- 1. Create or update profile
CREATE OR REPLACE FUNCTION public.create_profile(
    user_id  UUID,
    p_nickname TEXT,
    p_avatar   TEXT
)
RETURNS public.profiles AS $$
DECLARE
    v_profile public.profiles;
BEGIN
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

-- 2. Create household + join in one transaction
CREATE OR REPLACE FUNCTION public.create_household_and_join(
    user_id   UUID,
    h_name    TEXT,
    h_city    TEXT    DEFAULT NULL,
    h_state   TEXT    DEFAULT NULL,
    h_country TEXT    DEFAULT 'India'
)
RETURNS public.households AS $$
DECLARE
    new_hh public.households;
BEGIN
    INSERT INTO public.households (name, created_by)
    VALUES (h_name, user_id)
    RETURNING * INTO new_hh;

    -- Link profile to household
    UPDATE public.profiles
       SET household_id = new_hh.id, updated_at = now()
     WHERE id = user_id;

    -- Save address
    INSERT INTO public.addresses (user_id, household_id, city, state, country)
    VALUES (user_id, new_hh.id, h_city, h_state, h_country);

    RETURN new_hh;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Join an existing household
CREATE OR REPLACE FUNCTION public.join_household(
    user_id UUID,
    h_id    UUID
)
RETURNS public.profiles AS $$
DECLARE
    updated_profile public.profiles;
BEGIN
    UPDATE public.profiles
       SET household_id = h_id, updated_at = now()
     WHERE id = user_id
    RETURNING * INTO updated_profile;
    RETURN updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Invite a user to a household
CREATE OR REPLACE FUNCTION public.invite_user(
    p_household_id UUID,
    p_email        TEXT,
    p_invited_by   UUID,
    p_token        TEXT
)
RETURNS public.invited_history AS $$
DECLARE
    new_invite public.invited_history;
BEGIN
    INSERT INTO public.invited_history
        (household_id, invited_email, invited_by, status, token, expires_at)
    VALUES
        (p_household_id, p_email, p_invited_by, 'pending', p_token, now() + INTERVAL '7 days')
    RETURNING * INTO new_invite;
    RETURN new_invite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Log a points transaction + update profile score
CREATE OR REPLACE FUNCTION public.add_points_transaction(
    p_user_id     UUID,
    p_points      INTEGER,
    p_reason      TEXT,
    p_reference_id TEXT DEFAULT NULL
)
RETURNS public.profiles AS $$
DECLARE
    updated_profile public.profiles;
BEGIN
    INSERT INTO public.points (user_id, points, reason, reference_id)
    VALUES (p_user_id, p_points, p_reason, p_reference_id);

    UPDATE public.profiles
       SET score      = GREATEST(0, score + p_points),
           updated_at = now()
     WHERE id = p_user_id
    RETURNING * INTO updated_profile;

    RETURN updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Core gameplay: solve puzzle → reward points → update streaks
CREATE OR REPLACE FUNCTION public.solve_puzzle_and_reward(
    p_user_id   UUID,
    p_puzzle_id TEXT,
    p_points    INTEGER,
    p_reason    TEXT DEFAULT 'puzzle_solved'
)
RETURNS public.profiles AS $$
DECLARE
    already_solved  BOOLEAN;
    cur_streak      INTEGER;
    cur_max_streak  INTEGER;
    updated_profile public.profiles;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.user_solved_puzzles
         WHERE user_id = p_user_id AND puzzle_id = p_puzzle_id
    ) INTO already_solved;

    IF NOT already_solved THEN
        -- Mark puzzle as solved (prevents repeats)
        INSERT INTO public.user_solved_puzzles (user_id, puzzle_id)
        VALUES (p_user_id, p_puzzle_id);

        -- Log XP transaction
        INSERT INTO public.points (user_id, points, reason, reference_id)
        VALUES (p_user_id, p_points, p_reason, p_puzzle_id);

        -- Compute new streaks
        SELECT streak, max_streak
          INTO cur_streak, cur_max_streak
          FROM public.profiles
         WHERE id = p_user_id;

        cur_streak := cur_streak + 1;
        IF cur_streak > cur_max_streak THEN
            cur_max_streak := cur_streak;
        END IF;

        -- Apply all updates atomically
        UPDATE public.profiles
           SET score      = score + p_points,
               streak     = cur_streak,
               max_streak = cur_max_streak,
               updated_at = now()
         WHERE id = p_user_id
        RETURNING * INTO updated_profile;
    ELSE
        -- Already solved → return current profile (practice replay, no XP)
        SELECT * INTO updated_profile FROM public.profiles WHERE id = p_user_id;
    END IF;

    RETURN updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Log ad watched
CREATE OR REPLACE FUNCTION public.log_ad_watch(
    p_user_id   UUID,
    p_ad_type   TEXT,
    p_placement TEXT
)
RETURNS public.user_ads_watched AS $$
DECLARE
    new_log public.user_ads_watched;
BEGIN
    INSERT INTO public.user_ads_watched (user_id, ad_type, placement)
    VALUES (p_user_id, p_ad_type, p_placement)
    RETURNING * INTO new_log;
    RETURN new_log;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Log user activity event
CREATE OR REPLACE FUNCTION public.log_activity(
    p_user_id  UUID,
    p_activity TEXT,
    p_details  JSONB DEFAULT '{}'::jsonb
)
RETURNS public.user_activities AS $$
DECLARE
    new_activity public.user_activities;
BEGIN
    INSERT INTO public.user_activities (user_id, activity, details)
    VALUES (p_user_id, p_activity, p_details)
    RETURNING * INTO new_activity;
    RETURN new_activity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Leaderboard — ranked by score DESC
CREATE OR REPLACE FUNCTION public.get_leaderboard(
    p_limit  INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    rank         BIGINT,
    user_id      UUID,
    nickname     TEXT,
    avatar       TEXT,
    score        INTEGER,
    streak       INTEGER,
    max_streak   INTEGER,
    solved_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT
        ROW_NUMBER() OVER (ORDER BY p.score DESC, p.max_streak DESC) AS rank,
        p.id          AS user_id,
        p.nickname,
        p.avatar,
        p.score,
        p.streak,
        p.max_streak,
        COUNT(usp.id) AS solved_count
    FROM public.profiles p
    LEFT JOIN public.user_solved_puzzles usp ON usp.user_id = p.id
    GROUP BY p.id, p.nickname, p.avatar, p.score, p.streak, p.max_streak
    ORDER BY p.score DESC, p.max_streak DESC
    LIMIT  p_limit
    OFFSET p_offset;
$$;
