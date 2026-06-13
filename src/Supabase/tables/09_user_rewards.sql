-- ================================================================
-- TABLE 9: user_rewards
-- Unlocked rewards (discount coupons at 1k, mobile recharge at 50k).
-- ================================================================
CREATE TABLE IF NOT EXISTS public.user_rewards (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_type   TEXT        NOT NULL CHECK (reward_type IN ('coupon_1k', 'recharge_50k')),
    reward_value  TEXT        NOT NULL,   -- e.g. Coupon code or Phone number
    claimed_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id, reward_type)
);

-- Enable RLS
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/insert their own rewards
CREATE POLICY "rewards_own" ON public.user_rewards
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
