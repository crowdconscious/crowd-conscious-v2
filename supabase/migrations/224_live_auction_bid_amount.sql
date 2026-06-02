-- ============================================================
-- 224: Live auction — open bid amounts (Green Gala / charity)
--   Extends live_auction_votes to support manual bid amounts
--   alongside the existing discount-tier voting (20/30/50).
--   One row per voter per item; bid can be updated via upsert.
-- Idempotent. Safe to re-run.
-- ============================================================

ALTER TABLE public.live_auction_votes
  ALTER COLUMN discount_vote DROP NOT NULL;

ALTER TABLE public.live_auction_votes
  ADD COLUMN IF NOT EXISTS bid_amount numeric(10,2);

ALTER TABLE public.live_auction_votes
  DROP CONSTRAINT IF EXISTS live_auction_votes_bid_mode;

ALTER TABLE public.live_auction_votes
  ADD CONSTRAINT live_auction_votes_bid_mode CHECK (
    (discount_vote IS NOT NULL AND bid_amount IS NULL)
    OR (discount_vote IS NULL AND bid_amount IS NOT NULL AND bid_amount > 0)
  );

ALTER TABLE public.live_auction_items
  ADD COLUMN IF NOT EXISTS winning_bid_amount numeric(10,2);

COMMENT ON COLUMN public.live_auction_votes.bid_amount IS
  'Open-bid amount (MXN/USD). Used for charity auctions; mutually exclusive with discount_vote.';
COMMENT ON COLUMN public.live_auction_items.winning_bid_amount IS
  'Highest bid locked when item status moves to sold.';

-- Authenticated users may update their own open bid.
DROP POLICY IF EXISTS "Users update own auction vote" ON public.live_auction_votes;
CREATE POLICY "Users update own auction vote" ON public.live_auction_votes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND anonymous_participant_id IS NULL);
