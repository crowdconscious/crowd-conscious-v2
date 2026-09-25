-- Migration 263 — Reconocimientos ("Mándanos lo bueno")
--
-- In-house intake for positive civic recognitions with photo upload.
-- Phase replaces the external-form link-out: submissions land as `pending`,
-- admins approve/reject, approved rows get a public share page + OG card.
--
-- Tables:
--   recognitions — one row per submission (includes private `contact`)
--
-- View:
--   recognitions_public — anon-safe projection of approved rows only
--   (never exposes contact or user_id)
--
-- Storage:
--   Bucket `recognitions` is PRIVATE. Pending photos are never publicly
--   reachable. Public pages and OG cards fetch bytes via the Next.js API
--   (service role) only after status = 'approved'.
--
-- RLS: ON. No anon/authenticated INSERT/UPDATE. Reads of the base table
-- are admin-only; the public uses the view. All writes go through the API +
-- service-role client.
--
-- Francisco runs this SQL manually in the Supabase SQL editor.
--
-- Rollback (do not run in production without backup):
--   DROP VIEW IF EXISTS public.recognitions_public;
--   DROP TABLE IF EXISTS public.recognitions CASCADE;
--   DELETE FROM storage.buckets WHERE id = 'recognitions';

-- =============================================================================
-- 1. recognitions
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.recognitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Null when submitted as guest.
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Private storage path inside the `recognitions` bucket (e.g. originals/<id>.jpg).
  photo_path text NOT NULL,

  what text NOT NULL
    CHECK (char_length(what) >= 1 AND char_length(what) <= 280),

  where_text text NOT NULL
    CHECK (char_length(where_text) >= 1 AND char_length(where_text) <= 200),

  who_type text NOT NULL
    CHECK (who_type IN (
      'lugar_negocio',
      'evento',
      'colectivo_vecinos',
      'escuela',
      'gobierno_alcaldia',
      'otro'
    )),

  how_known text NOT NULL
    CHECK (how_known IN ('en_persona', 'me_contaron', 'soy_parte')),

  credit_handle text
    CHECK (credit_handle IS NULL OR char_length(credit_handle) <= 80),

  -- Private. Never exposed via recognitions_public or public APIs.
  contact text
    CHECK (contact IS NULL OR char_length(contact) <= 200),

  consent_at timestamptz NOT NULL,
  consent_version text NOT NULL,

  -- Attribution source (web / ios / android / papalote / …). Sanitized in API.
  src text NOT NULL DEFAULT 'unknown'
    CHECK (src ~ '^[a-z0-9_]{1,40}$'),

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),

  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reject_reason text
    CHECK (reject_reason IS NULL OR char_length(reject_reason) <= 500),

  -- Short public slug for /reconocimientos/[slug]. Minted on insert.
  share_slug text NOT NULL UNIQUE
    CHECK (char_length(share_slug) >= 4 AND char_length(share_slug) <= 32)
);

CREATE INDEX IF NOT EXISTS idx_recognitions_status_created
  ON public.recognitions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recognitions_src
  ON public.recognitions (src);

CREATE INDEX IF NOT EXISTS idx_recognitions_share_slug
  ON public.recognitions (share_slug);

COMMENT ON TABLE public.recognitions IS
  'Reconocimientos intake — positive civic recognitions with photo. contact is private.';

COMMENT ON COLUMN public.recognitions.contact IS
  'Optional private contact. Never expose via public view or public API.';

COMMENT ON COLUMN public.recognitions.consent_version IS
  'Versioned consent copy id, e.g. v1-2026-09-25.';

-- =============================================================================
-- 2. Public view (approved only; no contact / user_id / reject internals)
-- =============================================================================

CREATE OR REPLACE VIEW public.recognitions_public
WITH (security_invoker = false)
AS
SELECT
  id,
  created_at,
  photo_path,
  what,
  where_text,
  who_type,
  how_known,
  credit_handle,
  src,
  share_slug,
  reviewed_at
FROM public.recognitions
WHERE status = 'approved';

COMMENT ON VIEW public.recognitions_public IS
  'Anon-safe projection of approved recognitions. Omits contact, user_id, reject_reason.';

GRANT SELECT ON public.recognitions_public TO anon, authenticated;

-- =============================================================================
-- 3. RLS on base table — admin read only; no direct client writes
-- =============================================================================

ALTER TABLE public.recognitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recognitions_admin_select ON public.recognitions;
CREATE POLICY recognitions_admin_select
  ON public.recognitions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  );

-- No INSERT/UPDATE/DELETE policies for anon/authenticated.
-- Service-role client bypasses RLS for API writes.

-- =============================================================================
-- 4. Private storage bucket
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recognitions',
  'recognitions',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

-- No public storage read policies. Bytes leave the bucket only via the
-- Next.js API using the service-role client (and only for approved rows
-- on public routes, or for admins on the moderation console).
