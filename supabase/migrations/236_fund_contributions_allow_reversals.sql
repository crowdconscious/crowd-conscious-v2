-- =============================================================================
-- PENDING USER APPROVAL — apply manually in Supabase Dashboard.
-- Do NOT run via `supabase db push`. Apply ONCE in the shared Supabase project
-- (web + mobile share the same database).
--
-- APPLY ORDER for the creator-market batch: 232 -> 233 -> 234 -> 235 -> 236.
--
-- ACTION REQUIRED: this migration must be applied BEFORE the refund-reversal
-- webhook code can succeed. Until it is applied, the old
-- `conscious_fund_contributions_amount_check` (amount >= 0) is still live and
-- will REJECT the negative reversing row. The webhook refund handler is written
-- to fail gracefully in that window (it logs and continues, returning 200), so
-- nothing breaks — but the fund ledger will stay overstated until this is run.
-- =============================================================================
-- PROMPT 6 — Refund reversals: turn the fund inflow ledger into a SIGNED ledger.
--
-- THE GAP: migration 233 created conscious_fund_contributions with an inline
-- `amount numeric(12,2) NOT NULL CHECK (amount >= 0)`. That inline column check
-- auto-names to `conscious_fund_contributions_amount_check`. It blocks the only
-- correct way to undo a refunded sponsorship's 20% inflow: a NEGATIVE reversing
-- contribution row. Without it, a refund flips the sponsorship status but the
-- fund's "recaudado" total stays overstated forever.
--
-- THE FIX: drop the non-negativity check so `amount` becomes a SIGNED ledger
-- value. `amount` stays NOT NULL. A refund now writes a paired negative row
-- (amount = -original fund_amount, same sponsorship_id), so
-- SUM(amount) = net recaudado and the existing aggregate view
-- `conscious_fund_contributions_totals` (which already does SUM(amount)) nets
-- correctly with no view change required.
--
-- SCOPE: this touches ONLY conscious_fund_contributions.amount. It does NOT
-- relax conscious_fund_distributions.amount (outflows stay non-negative) and it
-- does NOT alter any RLS — writes remain service-role only.
-- =============================================================================

-- Drop the non-negativity constraint so reversals (negative rows) are allowed.
-- The inline `CHECK (amount >= 0)` from migration 233 auto-named to
-- conscious_fund_contributions_amount_check.
ALTER TABLE public.conscious_fund_contributions
  DROP CONSTRAINT IF EXISTS conscious_fund_contributions_amount_check;

-- amount stays mandatory; only its sign is now unconstrained.
ALTER TABLE public.conscious_fund_contributions
  ALTER COLUMN amount SET NOT NULL;

COMMENT ON COLUMN public.conscious_fund_contributions.amount IS
  'Signed: positive = inflow (20% of gross); negative = reversal of a refunded sponsorship. SUM(amount) = net recaudado.';
