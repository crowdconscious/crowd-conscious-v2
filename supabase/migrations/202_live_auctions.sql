-- ============================================================
-- 202: Conscious Live — Live Auctions data model
--   Conscious Locations stream auctions during a live_event.
--   Each item lets the audience vote on which discount tier
--   (20 / 30 / 50 %) gets applied. The winning tier is locked
--   in when the item moves to status='sold' / 'ended'.
--
-- Tables created:
--   • public.live_auction_items
--   • public.live_auction_votes
--
-- Conventions match the rest of Conscious Live:
--   • Anonymous voting reuses anonymous_participants(id),
--     not a freeform text column — keeps the alias system + RLS
--     consistent with market_votes.
--   • Public read, admin/location-owner write.
--   • Realtime publication for both tables so the bidding UI
--     can subscribe to live distributions.
--
-- Idempotent. Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.live_auction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_event_id uuid NOT NULL REFERENCES public.live_events(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.conscious_locations(id) ON DELETE SET NULL,

  title text NOT NULL,
  description text,
  category text CHECK (
    category IS NULL OR category IN (
      'food', 'drink', 'fashion', 'experience', 'art', 'merch', 'other'
    )
  ),
  image_url text,

  original_price numeric(10,2),
  currency text NOT NULL DEFAULT 'MXN',

  /**
   * `upcoming` → not yet open for bids.
   * `bidding`  → audience is voting on a discount tier.
   * `sold`     → winning tier locked, claims open.
   * `ended`    → claims closed (max_claims hit or admin closed).
   * `cancelled` → admin pulled the item from the auction.
   */
  status text NOT NULL DEFAULT 'upcoming' CHECK (
    status IN ('upcoming', 'bidding', 'sold', 'ended', 'cancelled')
  ),

  /** Tier picked by the community at item resolution: 20 | 30 | 50. */
  winning_discount integer CHECK (winning_discount IN (20, 30, 50)),

  /** Single-use shared code generated when the item is sold. */
  claim_code text UNIQUE,
  claim_count integer NOT NULL DEFAULT 0,
  max_claims integer NOT NULL DEFAULT 10,

  /** Voting window — set by the admin when toggling to `bidding`. */
  bidding_opened_at timestamptz,
  bidding_closes_at timestamptz,

  sort_order integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_auction_items_event
  ON public.live_auction_items (live_event_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_live_auction_items_location
  ON public.live_auction_items (location_id)
  WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_live_auction_items_status
  ON public.live_auction_items (status)
  WHERE status IN ('bidding', 'sold');

-- ----------------------------------------------------------------
-- Votes table — one row per (item, voter) where voter = user or
-- anonymous_participant. Discount value MUST match an allowed tier.
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.live_auction_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_item_id uuid NOT NULL REFERENCES public.live_auction_items(id) ON DELETE CASCADE,

  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  anonymous_participant_id uuid
    REFERENCES public.anonymous_participants(id) ON DELETE CASCADE,

  discount_vote integer NOT NULL CHECK (discount_vote IN (20, 30, 50)),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT live_auction_votes_voter_present CHECK (
    user_id IS NOT NULL OR anonymous_participant_id IS NOT NULL
  )
);

-- Enforce "one vote per voter per item" with two partial unique indexes
-- (Postgres can't UNIQUE over COALESCE without a helper expression).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_live_auction_votes_user
  ON public.live_auction_votes (auction_item_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_live_auction_votes_anon
  ON public.live_auction_votes (auction_item_id, anonymous_participant_id)
  WHERE anonymous_participant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_live_auction_votes_item
  ON public.live_auction_votes (auction_item_id);

-- ----------------------------------------------------------------
-- updated_at trigger for items
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_live_auction_items_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_auction_items_updated_at
  ON public.live_auction_items;
CREATE TRIGGER trg_live_auction_items_updated_at
  BEFORE UPDATE ON public.live_auction_items
  FOR EACH ROW EXECUTE FUNCTION public.set_live_auction_items_updated_at();

-- ----------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------

ALTER TABLE public.live_auction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_auction_votes ENABLE ROW LEVEL SECURITY;

-- Items: anyone can read (auctions are public discovery surfaces).
DROP POLICY IF EXISTS "Anyone can view auction items" ON public.live_auction_items;
CREATE POLICY "Anyone can view auction items" ON public.live_auction_items
  FOR SELECT USING (true);

-- Items: admins manage everything.
DROP POLICY IF EXISTS "Admins manage auction items" ON public.live_auction_items;
CREATE POLICY "Admins manage auction items" ON public.live_auction_items
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Votes: anyone can read aggregate state (UI shows live distribution).
DROP POLICY IF EXISTS "Anyone can view auction votes" ON public.live_auction_votes;
CREATE POLICY "Anyone can view auction votes" ON public.live_auction_votes
  FOR SELECT USING (true);

-- Votes: authenticated users insert their own row.
DROP POLICY IF EXISTS "Users insert own auction vote" ON public.live_auction_votes;
CREATE POLICY "Users insert own auction vote" ON public.live_auction_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND anonymous_participant_id IS NULL
  );

-- Votes: anonymous (no JWT) inserts allowed only when the row carries
-- an anonymous_participant_id and no user_id. Server is expected to
-- have already validated the anonymous session before insert.
DROP POLICY IF EXISTS "Anon insert auction vote" ON public.live_auction_votes;
CREATE POLICY "Anon insert auction vote" ON public.live_auction_votes
  FOR INSERT TO anon
  WITH CHECK (
    user_id IS NULL
    AND anonymous_participant_id IS NOT NULL
  );

-- Votes: admins can clean up.
DROP POLICY IF EXISTS "Admins manage auction votes" ON public.live_auction_votes;
CREATE POLICY "Admins manage auction votes" ON public.live_auction_votes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------
-- Realtime publication
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_auction_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_auction_items;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'live_auction_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_auction_votes;
  END IF;
END $$;

COMMENT ON TABLE public.live_auction_items IS
  'Items auctioned during a Conscious Live event. Audience votes on the discount tier (20/30/50%) and the winner is locked at resolution.';
COMMENT ON TABLE public.live_auction_votes IS
  'One vote per (item, voter) on the discount tier. Voter is either an auth user or an anonymous_participants row.';
