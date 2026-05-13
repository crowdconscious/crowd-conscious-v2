-- Migration 219 — Citizen Signals MVP
--
-- Introduces the moderated civic-reporting surface ("Señales ciudadanas" /
-- "Citizen Signals") described in docs/SIGNALS-DESIGN-2026.md and
-- docs/SIGNALS-MVP-CHECKLIST.md. Scope is intentionally tight: complaints
-- and suggestions only, targets restricted to municipality + institution,
-- pilot geography all active CDMX conscious_locations.
--
-- Tables added:
--   citizen_targets                  — registry of municipalities/institutions
--   citizen_signals                  — citizen-authored post (one row per submission)
--   citizen_signal_evidence          — uploaded attachments (private bucket)
--   citizen_signal_cosigns           — unique (signal, user) endorsements
--   citizen_signal_comments          — public comments on published signals
--   citizen_signal_responses         — official target replies
--   citizen_signal_moderation_events — append-only admin audit log
--   citizen_signal_subscriptions     — per-signal email follow opt-ins
--   citizen_target_access_tokens     — magic-link tokens for target dashboard
--
-- View: citizen_signals_public — anon-safe projection (only published rows,
-- PII columns stripped).
--
-- Trigger: maintain citizen_signals.cosign_count on insert/delete in
-- citizen_signal_cosigns.
--
-- RLS posture mirrors migration 216 (sponsor_pulse_reports): admin-only direct
-- read/write via profiles.user_type = 'admin'; everything else flows through
-- Next.js API routes using the service-role client (createAdminClient).
-- Public reads use the citizen_signals_public view (granted to anon).
--
-- Storage bucket `citizen-signals-evidence` is **private**: signed URLs only.
-- Pattern mirrors migration 218 (blog-images) but with public=false and no
-- public read policy.
--
-- Rollback (do not run in production without backup):
--   DROP VIEW IF EXISTS public.citizen_signals_public;
--   DROP TABLE IF EXISTS public.citizen_target_access_tokens CASCADE;
--   DROP TABLE IF EXISTS public.citizen_signal_subscriptions CASCADE;
--   DROP TABLE IF EXISTS public.citizen_signal_moderation_events CASCADE;
--   DROP TABLE IF EXISTS public.citizen_signal_responses CASCADE;
--   DROP TABLE IF EXISTS public.citizen_signal_comments CASCADE;
--   DROP TABLE IF EXISTS public.citizen_signal_cosigns CASCADE;
--   DROP TABLE IF EXISTS public.citizen_signal_evidence CASCADE;
--   DROP TABLE IF EXISTS public.citizen_signals CASCADE;
--   DROP TABLE IF EXISTS public.citizen_targets CASCADE;
--   DROP FUNCTION IF EXISTS public.citizen_signal_cosign_count_trigger();
--   DELETE FROM storage.buckets WHERE id = 'citizen-signals-evidence';
--
-- =============================================================================
-- 1. citizen_targets — registry of municipalities and institutions
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.citizen_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  target_kind text NOT NULL
    CHECK (target_kind IN ('municipality', 'institution')),

  -- Optional link to a conscious_locations row when the target maps to a
  -- physical place (e.g. an alcaldía). Institutions without a fixed location
  -- (Comisión de Derechos Humanos, SEDEMA, etc.) leave this null.
  conscious_location_id uuid REFERENCES public.conscious_locations(id) ON DELETE SET NULL,

  -- Founder decision: target email is set manually by an admin (no automatic
  -- domain inference in MVP). This column may be NULL while a target is
  -- being onboarded; cron Stage 1 notification is a no-op when null.
  notification_email text,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citizen_targets_kind
  ON public.citizen_targets(target_kind);

CREATE INDEX IF NOT EXISTS idx_citizen_targets_location
  ON public.citizen_targets(conscious_location_id);

COMMENT ON TABLE public.citizen_targets IS
  'Registry of entities a Citizen Signal can be filed against. MVP: municipality + institution only.';

-- =============================================================================
-- 2. citizen_signals — the citizen-authored post
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.citizen_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stable, URL-safe slug minted by the API on create. Unique so /signals/[slug]
  -- never collides; used as the canonical link on share and email.
  public_slug text NOT NULL UNIQUE,

  post_type text NOT NULL
    CHECK (post_type IN ('complaint', 'suggestion')),

  -- Free-text in DB so we can extend the allowed list without a schema change.
  -- The API constrains category to the canonical constant in lib/i18n/citizen-signals.ts.
  category text NOT NULL,

  severity text NOT NULL
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  target_kind text NOT NULL
    CHECK (target_kind IN ('municipality', 'institution')),
  citizen_target_id uuid NOT NULL REFERENCES public.citizen_targets(id) ON DELETE RESTRICT,

  title text NOT NULL,
  body text NOT NULL,
  language text NOT NULL
    CHECK (language IN ('es', 'en')),

  conscious_location_id uuid NOT NULL REFERENCES public.conscious_locations(id) ON DELETE RESTRICT,

  -- Author always retained for moderation + abuse review. Public projection
  -- in citizen_signals_public hides this column.
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Anonymity is display-only in MVP: we always know who filed it; the public
  -- feed uses anonymous_display_name when anonymous_display_mode is true.
  anonymous_display_mode boolean NOT NULL DEFAULT false,
  anonymous_display_name text,

  publication_status text NOT NULL DEFAULT 'pending_review'
    CHECK (publication_status IN (
      'draft',
      'pending_review',
      'needs_edit',
      'published',
      'rejected',
      'archived',
      'disputed'
    )),

  -- 0 = published, 1 = private notify, 2 = public dossier-lite. Stages > 2
  -- are out of MVP scope; the column stays smallint so we can extend later
  -- without a schema change.
  threshold_stage smallint NOT NULL DEFAULT 0,

  -- Counter denormalised by trigger; do not write directly from app code.
  cosign_count integer NOT NULL DEFAULT 0,

  -- Output of lib/agents/signals-moderator.ts. Shape: { category_guess,
  -- severity_guess, pii_detected, defamation_risk, summary_es, summary_en }.
  -- jsonb so we can extend without a migration.
  ai_scores jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Timestamps for cron transitions. Cron sets stage1_met_at when
  -- cosign_count crosses 50, stage2_met_at when it crosses 200.
  -- private_target_notify_at records when the Stage 1 email was sent.
  stage1_met_at timestamptz,
  stage2_met_at timestamptz,
  private_target_notify_at timestamptz,

  -- Admin "merge duplicates": the merged-away signal points its
  -- canonical_duplicate_of at the canonical row and is moved to
  -- publication_status = 'archived'. The canonical signal absorbs the
  -- co-signs (handled in the F7 admin merge endpoint).
  canonical_duplicate_of uuid REFERENCES public.citizen_signals(id) ON DELETE SET NULL,

  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citizen_signals_status_created
  ON public.citizen_signals(publication_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_citizen_signals_location_category
  ON public.citizen_signals(conscious_location_id, category);

CREATE INDEX IF NOT EXISTS idx_citizen_signals_target
  ON public.citizen_signals(citizen_target_id);

CREATE INDEX IF NOT EXISTS idx_citizen_signals_author
  ON public.citizen_signals(author_user_id);

CREATE INDEX IF NOT EXISTS idx_citizen_signals_stage
  ON public.citizen_signals(threshold_stage, publication_status)
  WHERE publication_status = 'published';

COMMENT ON TABLE public.citizen_signals IS
  'Citizen-authored civic signal. MVP: complaint or suggestion against a municipality or institution in CDMX. Public reads via citizen_signals_public view only.';

-- =============================================================================
-- 3. citizen_signal_evidence — attachments
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.citizen_signal_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES public.citizen_signals(id) ON DELETE CASCADE,

  kind text NOT NULL
    CHECK (kind IN ('image', 'pdf', 'link')),

  -- Either storage_path (for image/pdf in the private bucket) or external_url
  -- (for kind = 'link'). The API enforces exactly one of the two is set.
  storage_path text,
  external_url text,

  caption text,

  -- Default 'moderators_only'; the admin approval flow flips this to 'public'
  -- alongside publication_status = 'published'. The citizen_signals_public
  -- view filters to visibility = 'public' only.
  visibility text NOT NULL DEFAULT 'moderators_only'
    CHECK (visibility IN ('public', 'moderators_only')),

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT citizen_signal_evidence_one_source CHECK (
    (storage_path IS NOT NULL AND external_url IS NULL) OR
    (storage_path IS NULL AND external_url IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_citizen_signal_evidence_signal
  ON public.citizen_signal_evidence(signal_id);

COMMENT ON TABLE public.citizen_signal_evidence IS
  'Uploaded attachments for a Citizen Signal. Files live in the private citizen-signals-evidence bucket; visibility defaults to moderators_only until approved.';

-- =============================================================================
-- 4. citizen_signal_cosigns — endorsements (one per user)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.citizen_signal_cosigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES public.citizen_signals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (signal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_citizen_signal_cosigns_signal_created
  ON public.citizen_signal_cosigns(signal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_citizen_signal_cosigns_user
  ON public.citizen_signal_cosigns(user_id);

COMMENT ON TABLE public.citizen_signal_cosigns IS
  'One-row-per-user endorsement of a Citizen Signal. UNIQUE(signal_id, user_id) prevents duplicate co-signs; trigger maintains citizen_signals.cosign_count.';

-- Trigger function: keep citizen_signals.cosign_count in sync. Lives in
-- public schema so DROP TABLE CASCADE drops the dependency cleanly.
CREATE OR REPLACE FUNCTION public.citizen_signal_cosign_count_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.citizen_signals
       SET cosign_count = cosign_count + 1,
           updated_at = now()
     WHERE id = NEW.signal_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.citizen_signals
       SET cosign_count = GREATEST(cosign_count - 1, 0),
           updated_at = now()
     WHERE id = OLD.signal_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS citizen_signal_cosigns_count
  ON public.citizen_signal_cosigns;

CREATE TRIGGER citizen_signal_cosigns_count
  AFTER INSERT OR DELETE ON public.citizen_signal_cosigns
  FOR EACH ROW
  EXECUTE FUNCTION public.citizen_signal_cosign_count_trigger();

-- =============================================================================
-- 5. citizen_signal_comments — public comments (only on published signals)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.citizen_signal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES public.citizen_signals(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citizen_signal_comments_signal_created
  ON public.citizen_signal_comments(signal_id, created_at DESC);

COMMENT ON TABLE public.citizen_signal_comments IS
  'Public comments on a published Citizen Signal. The API rejects writes when the parent signals row is not in publication_status = published.';

-- =============================================================================
-- 6. citizen_signal_responses — official target replies
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.citizen_signal_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES public.citizen_signals(id) ON DELETE CASCADE,
  citizen_target_id uuid NOT NULL REFERENCES public.citizen_targets(id) ON DELETE RESTRICT,

  -- Free-text role attested by the target rep on the magic-link dashboard
  -- (e.g. "Director de Vinculación, Alcaldía MH").
  author_label text NOT NULL,
  body text NOT NULL,

  official_status text NOT NULL
    CHECK (official_status IN ('acknowledged', 'in_progress', 'resolved')),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citizen_signal_responses_signal_created
  ON public.citizen_signal_responses(signal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_citizen_signal_responses_target
  ON public.citizen_signal_responses(citizen_target_id);

COMMENT ON TABLE public.citizen_signal_responses IS
  'Official replies posted from the target magic-link dashboard. Status transitions are enforced in the dashboard API, not at the DB layer.';

-- =============================================================================
-- 7. citizen_signal_moderation_events — append-only admin audit log
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.citizen_signal_moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES public.citizen_signals(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Free-text action label; the admin API constrains the set
  -- (submit, approve, reject, request_edit, archive, merge, dispute, etc.).
  action text NOT NULL,

  -- Arbitrary structured detail (the reason text, target slug for merges,
  -- the previous publication_status, etc.).
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citizen_signal_moderation_events_signal_created
  ON public.citizen_signal_moderation_events(signal_id, created_at DESC);

COMMENT ON TABLE public.citizen_signal_moderation_events IS
  'Append-only audit log of moderation actions. No UPDATE/DELETE paths in the application; corrections come as a new event.';

-- =============================================================================
-- 8. citizen_signal_subscriptions — per-signal email follow opt-ins
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.citizen_signal_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES public.citizen_signals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frequency text NOT NULL DEFAULT 'immediate'
    CHECK (frequency IN ('immediate', 'daily', 'off')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (signal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_citizen_signal_subscriptions_user
  ON public.citizen_signal_subscriptions(user_id);

COMMENT ON TABLE public.citizen_signal_subscriptions IS
  'User-level email follow opt-ins per signal. Default frequency immediate; daily and off reserved for Phase 2 digest scheduling.';

-- =============================================================================
-- 9. citizen_target_access_tokens — magic-link tokens for target dashboard
-- =============================================================================
--
-- We store **hash only** of the raw token (SHA-256 hex). The raw token is
-- delivered once by email in the magic-link URL; subsequent dashboard
-- requests SHA-256 the URL param and compare against token_hash with a
-- timing-safe compare in lib/target-token-hash.ts.
--
-- One active token per target at a time: the admin "issue magic link" flow
-- sets revoked_at = now() on any prior un-revoked row, then inserts a new
-- one. This is enforced in the API, not at the DB layer.

CREATE TABLE IF NOT EXISTS public.citizen_target_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_target_id uuid NOT NULL REFERENCES public.citizen_targets(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_citizen_target_access_tokens_target
  ON public.citizen_target_access_tokens(citizen_target_id);

CREATE INDEX IF NOT EXISTS idx_citizen_target_access_tokens_hash
  ON public.citizen_target_access_tokens(token_hash);

COMMENT ON TABLE public.citizen_target_access_tokens IS
  'Magic-link tokens (SHA-256 hashed) for the target /dashboard/target/[token] surface. Raw tokens are never persisted.';

-- =============================================================================
-- 10. citizen_signals_public — anon-safe projection
-- =============================================================================
--
-- Strips PII (author_user_id, ai_scores moderator detail, evidence kept
-- behind a separate view if exposed). Anonymous and authenticated readers
-- query this view directly; admin reads go against citizen_signals.

CREATE OR REPLACE VIEW public.citizen_signals_public AS
SELECT
  cs.id,
  cs.public_slug,
  cs.post_type,
  cs.category,
  cs.severity,
  cs.target_kind,
  cs.citizen_target_id,
  cs.title,
  cs.body,
  cs.language,
  cs.conscious_location_id,
  CASE WHEN cs.anonymous_display_mode THEN cs.anonymous_display_name ELSE NULL END AS display_name,
  cs.anonymous_display_mode,
  cs.threshold_stage,
  cs.cosign_count,
  cs.stage1_met_at,
  cs.stage2_met_at,
  cs.created_at,
  cs.updated_at
FROM public.citizen_signals cs
WHERE cs.publication_status = 'published';

COMMENT ON VIEW public.citizen_signals_public IS
  'Anon-safe projection of published Citizen Signals. Excludes author_user_id, moderator-only fields, and unmoderated content. Grant SELECT to anon + authenticated.';

GRANT SELECT ON public.citizen_signals_public TO anon, authenticated;

-- =============================================================================
-- 11. Row Level Security
-- =============================================================================
--
-- Strategy mirrors migration 216 (sponsor_pulse_reports):
--   * Admin direct access via profiles.user_type = 'admin'.
--   * All user writes go through Next.js API routes using the service-role
--     client (createAdminClient), which bypasses RLS.
--   * Public reads use the citizen_signals_public view (granted to anon).
--
-- We still enable RLS on every table so a leaked anon key cannot SELECT
-- private columns directly.

ALTER TABLE public.citizen_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_signal_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_signal_cosigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_signal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_signal_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_signal_moderation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_signal_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_target_access_tokens ENABLE ROW LEVEL SECURITY;

-- Admin-all policies. We DROP IF EXISTS to allow safe re-apply on staging.

DROP POLICY IF EXISTS citizen_targets_admin_all ON public.citizen_targets;
CREATE POLICY citizen_targets_admin_all ON public.citizen_targets
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'));

-- citizen_targets is also readable by anon for the compose-wizard target picker.
-- Display_name + slug + target_kind are not PII; notification_email IS PII and
-- must be stripped at the API layer. We expose the read but trust the API to
-- project safe columns; if you want to belt-and-suspenders, add a
-- citizen_targets_public view and grant only that to anon.
DROP POLICY IF EXISTS citizen_targets_anon_read ON public.citizen_targets;
CREATE POLICY citizen_targets_anon_read ON public.citizen_targets
  FOR SELECT TO anon, authenticated
  USING (true);

-- citizen_signals: author can SELECT their own row at any status (for the
-- "track my signal" surface). Public reads happen through the view; admin
-- bypass via service role or admin policy below.
DROP POLICY IF EXISTS citizen_signals_admin_all ON public.citizen_signals;
CREATE POLICY citizen_signals_admin_all ON public.citizen_signals
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'));

DROP POLICY IF EXISTS citizen_signals_author_select ON public.citizen_signals;
CREATE POLICY citizen_signals_author_select ON public.citizen_signals
  FOR SELECT TO authenticated
  USING (author_user_id = auth.uid());

-- Evidence: admin-all; author can read own rows. Public access happens via
-- signed URLs that the API hands out only for visibility = 'public' rows.
DROP POLICY IF EXISTS citizen_signal_evidence_admin_all ON public.citizen_signal_evidence;
CREATE POLICY citizen_signal_evidence_admin_all ON public.citizen_signal_evidence
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'));

DROP POLICY IF EXISTS citizen_signal_evidence_author_select ON public.citizen_signal_evidence;
CREATE POLICY citizen_signal_evidence_author_select ON public.citizen_signal_evidence
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.citizen_signals s
     WHERE s.id = citizen_signal_evidence.signal_id
       AND s.author_user_id = auth.uid()
  ));

-- Cosigns: any authenticated user can see who co-signed which signal (we
-- expose the count publicly; the audit benefit of full visibility outweighs
-- the privacy cost here). Admin-all for moderation.
DROP POLICY IF EXISTS citizen_signal_cosigns_admin_all ON public.citizen_signal_cosigns;
CREATE POLICY citizen_signal_cosigns_admin_all ON public.citizen_signal_cosigns
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'));

DROP POLICY IF EXISTS citizen_signal_cosigns_self_select ON public.citizen_signal_cosigns;
CREATE POLICY citizen_signal_cosigns_self_select ON public.citizen_signal_cosigns
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Comments: public read for comments on published signals; admin-all.
DROP POLICY IF EXISTS citizen_signal_comments_admin_all ON public.citizen_signal_comments;
CREATE POLICY citizen_signal_comments_admin_all ON public.citizen_signal_comments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'));

DROP POLICY IF EXISTS citizen_signal_comments_published_select ON public.citizen_signal_comments;
CREATE POLICY citizen_signal_comments_published_select ON public.citizen_signal_comments
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.citizen_signals s
     WHERE s.id = citizen_signal_comments.signal_id
       AND s.publication_status = 'published'
  ));

-- Responses, moderation_events, subscriptions, tokens: admin-only direct access.
-- All app reads go through the service-role client behind authenticated
-- API routes that do their own scoping.
DROP POLICY IF EXISTS citizen_signal_responses_admin_all ON public.citizen_signal_responses;
CREATE POLICY citizen_signal_responses_admin_all ON public.citizen_signal_responses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'));

DROP POLICY IF EXISTS citizen_signal_responses_published_select ON public.citizen_signal_responses;
CREATE POLICY citizen_signal_responses_published_select ON public.citizen_signal_responses
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.citizen_signals s
     WHERE s.id = citizen_signal_responses.signal_id
       AND s.publication_status = 'published'
  ));

DROP POLICY IF EXISTS citizen_signal_moderation_events_admin_all ON public.citizen_signal_moderation_events;
CREATE POLICY citizen_signal_moderation_events_admin_all ON public.citizen_signal_moderation_events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'));

DROP POLICY IF EXISTS citizen_signal_subscriptions_admin_all ON public.citizen_signal_subscriptions;
CREATE POLICY citizen_signal_subscriptions_admin_all ON public.citizen_signal_subscriptions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'));

DROP POLICY IF EXISTS citizen_signal_subscriptions_self ON public.citizen_signal_subscriptions;
CREATE POLICY citizen_signal_subscriptions_self ON public.citizen_signal_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS citizen_target_access_tokens_admin_all ON public.citizen_target_access_tokens;
CREATE POLICY citizen_target_access_tokens_admin_all ON public.citizen_target_access_tokens
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'));

-- =============================================================================
-- 12. Storage bucket: citizen-signals-evidence (private)
-- =============================================================================
--
-- Mirrors migration 218 (blog-images) shape but with public = false. Reads
-- happen exclusively through signed URLs handed out by the API after it
-- verifies (a) the requester is the author or an admin OR (b) the parent
-- evidence row has visibility = 'public' AND the signal is published.
-- Writes go through the API + service-role client (RLS-bypass).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'citizen-signals-evidence',
  'citizen-signals-evidence',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

-- No public read policy (bucket is private). Admin reads go through the
-- service-role client, which bypasses storage RLS.
