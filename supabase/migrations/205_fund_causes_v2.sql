-- 205: Conscious Fund causes overhaul
--
-- Turns `fund_causes` from a seed-string table into a verifiable-entity
-- table with public detail pages, logo/cover assets, verification audit,
-- optional geolocation for map surfacing, and a provenance link back to
-- `conscious_inbox` when a cause was promoted from a municipality
-- suggestion (see migration 206 for the inbox enum extension).
--
-- Everything here is idempotent so running it a second time is a no-op.
-- Public read is already gated to `active = true` by migration 137; we
-- intentionally do NOT change that policy here — `verified` is an editorial
-- badge, not an access gate. A cause can be active-but-unverified during
-- the hours between "admin creates row" and "admin has confirmed the org
-- is real", and the public surface renders it without the checkmark.

-- 1. New columns on fund_causes
ALTER TABLE public.fund_causes
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS suggested_by_sponsor_id UUID REFERENCES public.sponsor_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suggested_by_inbox_id UUID REFERENCES public.conscious_inbox(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.fund_causes.slug IS
  'URL-safe unique identifier used by /fund/causes/[slug]. Required going forward.';

COMMENT ON COLUMN public.fund_causes.verified IS
  'Editorial stamp. True only after a human confirmed the organization is real. Does not gate public read (that is `active`).';

COMMENT ON COLUMN public.fund_causes.suggested_by_sponsor_id IS
  'When a cause was promoted from a sponsor/municipality suggestion, this links back to the originating sponsor_accounts row.';

COMMENT ON COLUMN public.fund_causes.suggested_by_inbox_id IS
  'When a cause was promoted from a conscious_inbox submission, this links back to the originating inbox row.';

-- 2. Backfill slug for existing rows so the UNIQUE+NOT NULL adds below
--    don't fail on legacy data. `lower + regexp_replace` matches the
--    `lib/slug.ts` pattern we use elsewhere; we also append the row's
--    short id to guarantee uniqueness against any name collisions.
UPDATE public.fund_causes
SET slug =
  lower(regexp_replace(trim(coalesce(name, 'cause')), '[^a-zA-Z0-9]+', '-', 'g'))
  || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

-- Trim leading/trailing hyphens produced by the regex above.
UPDATE public.fund_causes
SET slug = trim(both '-' from slug)
WHERE slug LIKE '-%' OR slug LIKE '%-';

-- Now enforce NOT NULL + UNIQUE. NOT VALID isn't available for NOT NULL
-- without a separate VALIDATE step, but the backfill above guarantees
-- every row has a value.
ALTER TABLE public.fund_causes
  ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'fund_causes_slug_key'
  ) THEN
    ALTER TABLE public.fund_causes
      ADD CONSTRAINT fund_causes_slug_key UNIQUE (slug);
  END IF;
END $$;

-- 3. Expand category enum. `category` is TEXT + CHECK, not a Postgres
--    ENUM TYPE (see migration 125), so we drop the old CHECK and add a
--    superset. Existing rows ('water', 'education', 'environment',
--    'social_justice', 'health', 'other') remain valid.
ALTER TABLE public.fund_causes
  DROP CONSTRAINT IF EXISTS fund_causes_category_check;

ALTER TABLE public.fund_causes
  ADD CONSTRAINT fund_causes_category_check
  CHECK (category IN (
    'water',
    'education',
    'environment',
    'social_justice',
    'health',
    'mobility',
    'housing',
    'hunger',
    'culture',
    'emergency',
    'other'
  ));

-- 4. Indexes used by public surfaces
CREATE INDEX IF NOT EXISTS idx_fund_causes_slug
  ON public.fund_causes (slug);

-- Partial index for the landing/locations cross-surface queries that only
-- show verified + active causes. Keeps the common read path fast without
-- forcing a full sequential scan as the table grows.
CREATE INDEX IF NOT EXISTS idx_fund_causes_verified_active
  ON public.fund_causes (verified, active)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_fund_causes_city
  ON public.fund_causes (city)
  WHERE city IS NOT NULL;

-- 5. RLS — existing public SELECT policy from migration 137 covers anon
--    users reading `active = true` rows. The new columns inherit that
--    policy (RLS is row-level, not column-level). No changes required,
--    but we assert the policy exists here so a fresh database that
--    skipped 137 gets the same public-read behavior.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'fund_causes'
      AND policyname = 'Anyone can view active causes'
  ) THEN
    CREATE POLICY "Anyone can view active causes" ON public.fund_causes
      FOR SELECT USING (active = true);
  END IF;
END $$;
