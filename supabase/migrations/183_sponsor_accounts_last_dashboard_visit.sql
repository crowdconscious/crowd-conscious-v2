-- First-time sponsor dashboard onboarding (dismiss sets this timestamp).
ALTER TABLE public.sponsor_accounts
ADD COLUMN IF NOT EXISTS last_dashboard_visit timestamptz;

COMMENT ON COLUMN public.sponsor_accounts.last_dashboard_visit IS 'Set when sponsor dismisses onboarding or acknowledges dashboard; null = show welcome banner.';
