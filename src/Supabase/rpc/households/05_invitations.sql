-- ================================================================
-- DOMAIN  : Households — Invitations
-- TABLE   : public.invited_history
-- FILE    : rpc/households/05_invitations.sql
--
-- PURPOSE : Three functions for the full invitation lifecycle:
--
--   invite_member      : Send an invitation (records email + token)
--   get_invitations    : List all invitations for a household
--   accept_invitation  : Mark a token as accepted + auto-join
--   expire_invitations : Mark overdue invites as 'expired' (cron job)
--
-- AUTH    :
--   • invite_member    — household member only
--   • get_invitations  — household member only
--   • accept_invitation — anyone with valid token (pre-auth flow)
-- ================================================================

-- ── 1. INVITE A MEMBER ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invite_member(
    p_household_id UUID,   -- Which household to invite to
    p_email        TEXT,   -- Email address of the person being invited
    p_token        TEXT    -- Unique token (generate on client with uuid())
)
RETURNS public.invited_history AS $$
DECLARE
    new_invite public.invited_history;
    v_member   UUID;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    -- Caller must be a member of this household to send invites
    SELECT id INTO v_member
    FROM public.profiles
    WHERE id = auth.uid() AND household_id = p_household_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Access denied: you must be a member of this household to invite others';
    END IF;
    -- ─────────────────────────────────────────────────────────

    INSERT INTO public.invited_history
        (household_id, invited_email, invited_by, status, token, expires_at)
    VALUES
        (p_household_id, p_email, auth.uid(), 'pending', p_token, now() + INTERVAL '7 days')
    RETURNING * INTO new_invite;

    RETURN new_invite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 2. GET ALL INVITATIONS FOR A HOUSEHOLD ───────────────────────
CREATE OR REPLACE FUNCTION public.get_invitations(
    p_household_id UUID
)
RETURNS SETOF public.invited_history AS $$
DECLARE
    v_member UUID;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    SELECT id INTO v_member
    FROM public.profiles
    WHERE id = auth.uid() AND household_id = p_household_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Access denied: only household members can view invitations';
    END IF;
    -- ─────────────────────────────────────────────────────────

    RETURN QUERY
    SELECT * FROM public.invited_history
    WHERE household_id = p_household_id
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ── 3. ACCEPT AN INVITATION (auto-join household) ────────────────
CREATE OR REPLACE FUNCTION public.accept_invitation(
    p_token TEXT   -- The token from the invitation link
)
RETURNS public.profiles AS $$
DECLARE
    v_invite        public.invited_history;
    updated_profile public.profiles;
BEGIN
    -- ── AUTH CHECK ────────────────────────────────────────────
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: you must be logged in to accept an invitation';
    END IF;
    -- ─────────────────────────────────────────────────────────

    -- Find the pending, non-expired invitation
    SELECT * INTO v_invite
    FROM public.invited_history
    WHERE token = p_token
      AND status = 'pending'
      AND expires_at > now();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation token';
    END IF;

    -- Mark invitation as accepted
    UPDATE public.invited_history
    SET status = 'accepted'
    WHERE id = v_invite.id;

    -- Auto-join the household
    UPDATE public.profiles
    SET household_id = v_invite.household_id,
        updated_at   = now()
    WHERE id = auth.uid()
    RETURNING * INTO updated_profile;

    RETURN updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 4. EXPIRE OLD INVITATIONS (run via cron or Edge Function) ────
CREATE OR REPLACE FUNCTION public.expire_invitations()
RETURNS INTEGER AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    -- Mark all pending invitations past their expiry date
    UPDATE public.invited_history
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at <= now();

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;   -- Returns how many records were expired
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
