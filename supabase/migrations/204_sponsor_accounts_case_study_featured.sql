-- 204: case_study_featured flag for sponsor_accounts
--
-- Adds an opt-in flag controlling whether a sponsor's logo appears in the
-- public "Trusted Brands" row on the landing page. We never auto-feature a
-- sponsor on a paid tier — the founder must flip this manually after the
-- brand signs off on being listed as a case study or paid customer.

ALTER TABLE public.sponsor_accounts
  ADD COLUMN IF NOT EXISTS case_study_featured boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sponsor_accounts.case_study_featured IS
  'Opt-in: when true, this sponsor''s logo renders in the public Trusted Brands row on the landing page. Toggled manually from /predictions/admin/sponsors.';

-- Partial index so the landing-page query (SELECT … WHERE case_study_featured)
-- stays fast as sponsor_accounts grows.
CREATE INDEX IF NOT EXISTS idx_sponsor_accounts_case_study_featured
  ON public.sponsor_accounts (case_study_featured)
  WHERE case_study_featured = true;
