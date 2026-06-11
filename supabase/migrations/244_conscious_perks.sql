-- 244_conscious_perks.sql
-- Conscious Perks: location offers, XP redemption, owner claim.
--
-- XP accounting (minimal breakage):
--   user_xp.total_xp       = lifetime EARNED (unchanged by vote RPCs; NEVER decremented on spend)
--   user_xp.total_xp_spent = cumulative XP redeemed at venues
--   spendable balance      = total_xp - total_xp_spent
-- Leaderboard/tiers read total_xp only — spending perks must not drop rank.
-- Negative xp_transactions (action_type perk_redemption) provide audit trail.
--
-- Owner claim mirrors sponsor_accounts migration 209: contact_email match + owner_profile_id.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. user_xp: track spend separately from earned
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_xp
  ADD COLUMN IF NOT EXISTS total_xp_spent integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_xp.total_xp IS
  'Lifetime XP earned. Never decremented on perk redemption; drives leaderboard rank and tier.';
COMMENT ON COLUMN public.user_xp.total_xp_spent IS
  'Cumulative XP spent on Conscious Perks redemptions. Spendable = total_xp - total_xp_spent.';

-- ---------------------------------------------------------------------------
-- 2. conscious_locations: owner link
-- ---------------------------------------------------------------------------
ALTER TABLE public.conscious_locations
  ADD COLUMN IF NOT EXISTS owner_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conscious_locations_owner_profile_id
  ON public.conscious_locations(owner_profile_id)
  WHERE owner_profile_id IS NOT NULL;

COMMENT ON COLUMN public.conscious_locations.owner_profile_id IS
  'Claimed venue owner (profiles.id). Set via /locations/[slug]/claim when contact_email matches.';

-- ---------------------------------------------------------------------------
-- 3. location_offers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.conscious_locations(id) ON DELETE CASCADE,

  title text NOT NULL,
  title_en text,
  description text,
  description_en text,

  xp_cost integer NOT NULL CHECK (xp_cost >= 1),
  min_tier smallint CHECK (min_tier IS NULL OR (min_tier >= 1 AND min_tier <= 5)),
  stock_limit integer CHECK (stock_limit IS NULL OR stock_limit >= 1),
  redeemed_count integer NOT NULL DEFAULT 0 CHECK (redeemed_count >= 0),
  max_redemptions_per_user integer NOT NULL DEFAULT 1 CHECK (max_redemptions_per_user >= 1),

  valid_from timestamptz,
  valid_until timestamptz,

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'expired')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT location_offers_valid_window CHECK (
    valid_from IS NULL OR valid_until IS NULL OR valid_from <= valid_until
  )
);

CREATE INDEX IF NOT EXISTS idx_location_offers_location_id
  ON public.location_offers(location_id);
CREATE INDEX IF NOT EXISTS idx_location_offers_public_active
  ON public.location_offers(location_id, status)
  WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- 4. location_redemptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.location_offers(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  redemption_code text NOT NULL,
  xp_spent integer NOT NULL CHECK (xp_spent >= 1),

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),

  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES public.profiles(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT location_redemptions_code_unique UNIQUE (redemption_code)
);

CREATE INDEX IF NOT EXISTS idx_location_redemptions_user_id
  ON public.location_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_location_redemptions_offer_id
  ON public.location_redemptions(offer_id);
CREATE INDEX IF NOT EXISTS idx_location_redemptions_code
  ON public.location_redemptions(redemption_code);

-- ---------------------------------------------------------------------------
-- 5. Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.perk_tier_from_xp(p_xp integer)
RETURNS smallint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_xp, 0) >= 7501 THEN 5::smallint
    WHEN COALESCE(p_xp, 0) >= 3501 THEN 4::smallint
    WHEN COALESCE(p_xp, 0) >= 1501 THEN 3::smallint
    WHEN COALESCE(p_xp, 0) >= 501 THEN 2::smallint
    ELSE 1::smallint
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_location_owner(p_location_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conscious_locations cl
    LEFT JOIN public.profiles p ON p.id = p_user_id
    WHERE cl.id = p_location_id
      AND (
        cl.owner_profile_id = p_user_id
        OR (
          cl.contact_email IS NOT NULL
          AND p.email IS NOT NULL
          AND lower(cl.contact_email) = lower(p.email)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_perk_redemption_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
  v_i integer;
BEGIN
  FOR v_i IN 1..8 LOOP
    v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
  END LOOP;
  RETURN v_code;
END;
$$;

-- Atomic spend + redemption creation
CREATE OR REPLACE FUNCTION public.spend_xp_for_perk_redemption(
  p_user_id uuid,
  p_offer_id uuid
)
RETURNS public.location_redemptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer public.location_offers%ROWTYPE;
  v_location public.conscious_locations%ROWTYPE;
  v_user_xp public.user_xp%ROWTYPE;
  v_user_tier smallint;
  v_spendable integer;
  v_user_count integer;
  v_code text;
  v_redemption public.location_redemptions%ROWTYPE;
  v_attempts integer := 0;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_offer FROM public.location_offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer_not_found';
  END IF;

  SELECT * INTO v_location FROM public.conscious_locations WHERE id = v_offer.location_id;
  IF NOT FOUND OR v_location.status <> 'active' THEN
    RAISE EXCEPTION 'location_not_active';
  END IF;

  IF v_offer.status <> 'active' THEN
    RAISE EXCEPTION 'offer_not_active';
  END IF;

  IF v_offer.valid_from IS NOT NULL AND now() < v_offer.valid_from THEN
    RAISE EXCEPTION 'offer_not_yet_valid';
  END IF;

  IF v_offer.valid_until IS NOT NULL AND now() > v_offer.valid_until THEN
    RAISE EXCEPTION 'offer_expired';
  END IF;

  IF v_offer.stock_limit IS NOT NULL AND v_offer.redeemed_count >= v_offer.stock_limit THEN
    RAISE EXCEPTION 'offer_out_of_stock';
  END IF;

  SELECT * INTO v_user_xp FROM public.user_xp WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.user_xp (user_id, total_xp, total_xp_spent, current_tier, tier_progress, xp_to_next_tier)
    VALUES (p_user_id, 0, 0, 1, 0, 500)
    RETURNING * INTO v_user_xp;
  END IF;

  v_user_tier := public.perk_tier_from_xp(v_user_xp.total_xp);
  IF v_offer.min_tier IS NOT NULL AND v_user_tier < v_offer.min_tier THEN
    RAISE EXCEPTION 'tier_too_low';
  END IF;

  v_spendable := COALESCE(v_user_xp.total_xp, 0) - COALESCE(v_user_xp.total_xp_spent, 0);
  IF v_spendable < v_offer.xp_cost THEN
    RAISE EXCEPTION 'insufficient_xp';
  END IF;

  SELECT COUNT(*)::integer INTO v_user_count
  FROM public.location_redemptions lr
  WHERE lr.offer_id = p_offer_id
    AND lr.user_id = p_user_id
    AND lr.status IN ('pending', 'confirmed');

  IF v_user_count >= v_offer.max_redemptions_per_user THEN
    RAISE EXCEPTION 'user_redemption_cap';
  END IF;

  LOOP
    v_attempts := v_attempts + 1;
    IF v_attempts > 12 THEN
      RAISE EXCEPTION 'code_generation_failed';
    END IF;
    v_code := public.generate_perk_redemption_code();
    BEGIN
      INSERT INTO public.location_redemptions (
        offer_id, user_id, redemption_code, xp_spent, status, expires_at
      ) VALUES (
        p_offer_id, p_user_id, v_code, v_offer.xp_cost, 'pending', now() + interval '48 hours'
      )
      RETURNING * INTO v_redemption;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- collision — retry
    END;
  END LOOP;

  INSERT INTO public.xp_transactions (user_id, amount, action_type, action_id, description)
  VALUES (
    p_user_id,
    -v_offer.xp_cost,
    'perk_redemption',
    v_redemption.id,
    'Conscious Perk: ' || v_offer.title || ' @ ' || v_location.slug
  );

  UPDATE public.user_xp
  SET total_xp_spent = COALESCE(total_xp_spent, 0) + v_offer.xp_cost,
      updated_at = now()
  WHERE user_id = p_user_id;

  UPDATE public.location_offers
  SET redeemed_count = redeemed_count + 1,
      updated_at = now()
  WHERE id = p_offer_id;

  RETURN v_redemption;
END;
$$;

GRANT EXECUTE ON FUNCTION public.spend_xp_for_perk_redemption(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_location_owner(uuid, uuid) TO authenticated;

-- conscious_locations owner policies (require is_location_owner above)
DROP POLICY IF EXISTS "owners_read_own_conscious_location" ON public.conscious_locations;
CREATE POLICY "owners_read_own_conscious_location"
  ON public.conscious_locations
  FOR SELECT
  TO authenticated
  USING (public.is_location_owner(id, auth.uid()));

DROP POLICY IF EXISTS "owners_claim_conscious_location_by_email" ON public.conscious_locations;
CREATE POLICY "owners_claim_conscious_location_by_email"
  ON public.conscious_locations
  FOR UPDATE
  TO authenticated
  USING (
    owner_profile_id IS NULL
    AND contact_email IS NOT NULL
    AND lower(contact_email) = (
      SELECT lower(p.email) FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (owner_profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.location_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_redemptions ENABLE ROW LEVEL SECURITY;

-- Offers: public read active offers for active locations
DROP POLICY IF EXISTS "public_read_active_location_offers" ON public.location_offers;
CREATE POLICY "public_read_active_location_offers"
  ON public.location_offers
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.conscious_locations cl
      WHERE cl.id = location_offers.location_id
        AND cl.status = 'active'
    )
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
  );

-- Offers: owners read all their location's offers (any status)
DROP POLICY IF EXISTS "owners_read_own_location_offers" ON public.location_offers;
CREATE POLICY "owners_read_own_location_offers"
  ON public.location_offers
  FOR SELECT
  TO authenticated
  USING (public.is_location_owner(location_id, auth.uid()));

-- Offers: owners manage their offers
DROP POLICY IF EXISTS "owners_manage_own_location_offers" ON public.location_offers;
CREATE POLICY "owners_manage_own_location_offers"
  ON public.location_offers
  FOR ALL
  TO authenticated
  USING (public.is_location_owner(location_id, auth.uid()))
  WITH CHECK (public.is_location_owner(location_id, auth.uid()));

-- Offers: admin ALL
DROP POLICY IF EXISTS "admins_manage_location_offers" ON public.location_offers;
CREATE POLICY "admins_manage_location_offers"
  ON public.location_offers
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'
  ));

-- Redemptions: users read own
DROP POLICY IF EXISTS "users_read_own_redemptions" ON public.location_redemptions;
CREATE POLICY "users_read_own_redemptions"
  ON public.location_redemptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Redemptions: owners read redemptions for their location's offers
DROP POLICY IF EXISTS "owners_read_location_redemptions" ON public.location_redemptions;
CREATE POLICY "owners_read_location_redemptions"
  ON public.location_redemptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.location_offers lo
      WHERE lo.id = location_redemptions.offer_id
        AND public.is_location_owner(lo.location_id, auth.uid())
    )
  );

-- Redemptions: owners confirm (update) pending codes for their offers
DROP POLICY IF EXISTS "owners_confirm_location_redemptions" ON public.location_redemptions;
CREATE POLICY "owners_confirm_location_redemptions"
  ON public.location_redemptions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.location_offers lo
      WHERE lo.id = location_redemptions.offer_id
        AND public.is_location_owner(lo.location_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.location_offers lo
      WHERE lo.id = location_redemptions.offer_id
        AND public.is_location_owner(lo.location_id, auth.uid())
    )
  );

-- Redemptions: admin ALL
DROP POLICY IF EXISTS "admins_manage_location_redemptions" ON public.location_redemptions;
CREATE POLICY "admins_manage_location_redemptions"
  ON public.location_redemptions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'
  ));

-- Allow authenticated users to invoke spend RPC (creates their redemption row)
DROP POLICY IF EXISTS "users_insert_own_redemptions_via_rpc" ON public.location_redemptions;
-- Inserts happen via SECURITY DEFINER RPC — no direct INSERT policy needed for users.

COMMIT;
