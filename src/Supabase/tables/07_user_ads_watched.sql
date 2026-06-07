-- Create user_ads_watched table
CREATE TABLE IF NOT EXISTS public.user_ads_watched (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ad_type TEXT NOT NULL CHECK (ad_type IN ('rewarded', 'interstitial', 'banner')),
    placement TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
