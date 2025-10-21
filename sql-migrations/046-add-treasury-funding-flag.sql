-- Add flag to sponsorships table to track if it was funded by treasury
ALTER TABLE public.sponsorships 
ADD COLUMN IF NOT EXISTS funded_by_treasury boolean DEFAULT FALSE;

-- Add index for filtering treasury-funded sponsorships
CREATE INDEX IF NOT EXISTS idx_sponsorships_treasury_funded 
ON public.sponsorships(funded_by_treasury) 
WHERE funded_by_treasury = TRUE;

-- Add comment
COMMENT ON COLUMN public.sponsorships.funded_by_treasury IS 'Whether this sponsorship was paid from the community treasury/pool';

