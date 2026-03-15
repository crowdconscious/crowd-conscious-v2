-- ============================================================================
-- FIX: RLS Enabled No Policy - public.payment_transactions
-- ============================================================================
-- Supabase linter: Table has RLS enabled but no policies exist.
--
-- WHAT THIS MEANS:
-- - RLS blocks all access by default
-- - With no policies, the table is effectively locked (nobody can read/write)
-- - Fix: Add policies for the operations your app needs
--
-- payment_transactions: Audit trail for Stripe payments (sponsorships).
-- - INSERT/UPDATE: Done by webhooks via service role (bypasses RLS)
-- - SELECT: Admins only (sponsorships table has sponsor_email/url, not sponsor_id)
--
-- RUN IN SUPABASE SQL EDITOR.
-- ============================================================================

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (in case of partial migration)
DROP POLICY IF EXISTS "Admin and involved parties can view payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Admins can view payment transactions" ON public.payment_transactions;

-- SELECT: Admins only (sponsorships has sponsor_email/sponsor_url, no sponsor_id for user link)
CREATE POLICY "Admins can view payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- ============================================================================
-- Note: INSERT/UPDATE are done by Stripe webhooks using the service role,
-- which bypasses RLS. No client-side policies needed for write operations.
-- Sponsors access their reports via report_token (admin client), not this table.
-- ============================================================================
