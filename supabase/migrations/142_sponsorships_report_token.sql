-- 142: Add report_token to sponsorships for secure sponsor analytics page access

ALTER TABLE public.sponsorships ADD COLUMN IF NOT EXISTS report_token TEXT UNIQUE;

-- Backfill existing rows with a token (for sponsors created before this migration)
UPDATE public.sponsorships
SET report_token = gen_random_uuid()::text
WHERE report_token IS NULL;

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_sponsorships_report_token ON public.sponsorships(report_token);
