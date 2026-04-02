-- Newsletter-only subscribers (landing / blog forms) + batch digest log rows

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  language text DEFAULT 'es',
  source text DEFAULT 'landing_page',
  is_active boolean NOT NULL DEFAULT true,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active ON public.newsletter_subscribers (is_active) WHERE is_active = true;

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert newsletter signup"
  ON public.newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read newsletter subscribers"
  ON public.newsletter_subscribers FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin')
  );

COMMENT ON TABLE public.newsletter_subscribers IS 'Email-only newsletter list; deduped with profiles in cron sends.';

-- Allow one row per newsletter batch (cron) without a user_id
ALTER TABLE public.email_digest_log ALTER COLUMN user_id DROP NOT NULL;

-- Archive legacy social agent outputs from dashboard clutter
UPDATE public.agent_content
SET archived_at = now()
WHERE content_type = 'social_post'
  AND archived_at IS NULL;
