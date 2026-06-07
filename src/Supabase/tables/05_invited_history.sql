-- Create invited_history table
CREATE TABLE IF NOT EXISTS public.invited_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'expired')),
    token TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days') NOT NULL
);
