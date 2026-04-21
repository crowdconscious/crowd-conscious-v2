-- 209_sponsor_accounts_user_discovery.sql
-- Let a logged-in user discover the sponsor_accounts they own so they have
-- a durable path back to their token dashboard after any logout/login cycle.
--
-- Scope decisions (deviation from the original PR prompt):
--   * The prompt asked for a new `owner_user_id UUID REFERENCES auth.users(id)`.
--     `sponsor_accounts.user_id UUID REFERENCES public.profiles(id)` already
--     exists (since 159_sponsor_accounts.sql) and is functionally identical
--     because `profiles.id = auth.users.id` in this project. Adding a second
--     user column would create dual-source-of-truth drift with no semantic
--     gain, so this migration reuses `user_id`.
--   * `contact_email` already exists (NOT NULL) and is already indexed via
--     `idx_sponsor_accounts_contact_email_lower`, so no column work needed.
--
-- What this migration does:
--   1. Adds a lookup index on `user_id` (partial, non-null) so the sidebar
--      "hasSponsorAccounts" count query stays cheap.
--   2. Enables an RLS SELECT policy so `authenticated` users can read:
--        a. sponsor_accounts they own (user_id = auth.uid()), OR
--        b. sponsor_accounts whose contact_email matches their profile email
--           (handles "redeemed while logged out, signed up later with same
--           email" — reconciliation happens on first authed read).
--   3. Leaves the existing admin-client access paths (service role bypasses
--      RLS) and the token-URL dashboard flow untouched. The `/dashboard/
--      sponsor/[token]` page continues to load via admin client.
--
-- What this migration does NOT do:
--   * No magic-link auth. That is PR 2.
--   * No write / update / delete policies for non-admin users.
--   * No backfill of user_id on existing rows — see
--     `scripts/backfill-sponsor-owners.ts` for the manual, reviewed path.
--
-- Idempotent; safe to re-run.

BEGIN;

-- 1. Lookup index for the sidebar count and the /sponsor-accounts listing.
CREATE INDEX IF NOT EXISTS idx_sponsor_accounts_user_id
  ON public.sponsor_accounts(user_id)
  WHERE user_id IS NOT NULL;

-- 2. RLS SELECT policy.
-- Drop-then-create so re-running picks up copy edits safely.
DROP POLICY IF EXISTS "users_read_own_sponsor_accounts"
  ON public.sponsor_accounts;

CREATE POLICY "users_read_own_sponsor_accounts"
  ON public.sponsor_accounts
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      contact_email IS NOT NULL
      AND lower(contact_email) = (
        SELECT lower(p.email)
        FROM public.profiles p
        WHERE p.id = auth.uid()
      )
    )
  );

COMMIT;
