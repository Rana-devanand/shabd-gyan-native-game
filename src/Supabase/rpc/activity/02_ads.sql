-- ================================================================
-- DOMAIN  : Activity — Ads
-- TABLE   : public.user_ads_watched
-- FILE    : rpc/activity/02_ads.sql
--
-- PURPOSE : Two functions for ad tracking:
--
--   log_ad_watch   : Record that a user watched an ad.
--                    Called after AdMob callback fires in the app.
--   get_ads_stats  : Return count of ads watched by type (for admin
--                    dashboards or rewarded-ad unlock logic).
--
-- AD TYPES:
--   'rewarded'      — user watches to earn a hint or extra life
--   'interstitial'  — full-screen ad shown between puzzle sets
--   'banner'        — passive banner shown on HomeScreen
--
-- PLACEMENTS (examples):
--   'hint_reveal'   — before revealing the puzzle hint
--   'between_levels'— after completing a puzzle, before next
--   'home_banner'   — persistent banner on HomeScreen
--
-- AUTH    : User can only log/read their OWN ad data.
-- ================================================================

-- ── 1. LOG A WATCHED AD ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_ad_watch(
    p_ad_type   TEXT,   -- 'rewarded' | 'interstitial' | 'banner'
    p_placement TEXT    -- Where in the app the ad was shown
)
RETURNS public.user_ads_watched AS $$
DECLARE
    new_log public.user_ads_watched;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: authentication required';
    END IF;
    -- ─────────────────────────────────────────────────────────

    INSERT INTO public.user_ads_watched (user_id, ad_type, placement)
    VALUES (auth.uid(), p_ad_type, p_placement)
    RETURNING * INTO new_log;

    RETURN new_log;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 2. GET AD WATCH STATS ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_ads_stats()
RETURNS TABLE (
    ad_type       TEXT,
    watch_count   BIGINT,
    last_watched  TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT
        ad_type,
        COUNT(*)          AS watch_count,
        MAX(created_at)   AS last_watched
    FROM public.user_ads_watched
    WHERE user_id = auth.uid()
    GROUP BY ad_type
    ORDER BY watch_count DESC;
$$;
