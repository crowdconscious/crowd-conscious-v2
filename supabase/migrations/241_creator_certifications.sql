-- Migration 241 — Conscious Creators (Phase 1, web MVP)
--
-- Certification layer for creators per docs/CONSCIOUS-CREATORS-STRATEGY-2026-06-09.md §3.
-- Identity stays on `profiles` (handle, name, avatar, bio, socials); this table
-- only holds the certification lifecycle, mirroring `conscious_locations`
-- (migration 186) so the voting-market loop, score recalculation, and the
-- admin certify flow port with minimal changes.
--
-- NOTE: `profiles.creator_trust_level` (blog self-publish gate, migration 232)
-- is a SEPARATE axis from conscious certification. Editorial trust says "can
-- publish without review"; this table says "community + admin verified as a
-- Conscious Creator". Do not conflate them.

CREATE TABLE IF NOT EXISTS public.creator_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'under_review', 'suspended', 'revoked')),

  -- community verification loop (same mechanic as locations)
  current_market_id uuid REFERENCES public.prediction_markets(id),
  conscious_score numeric,        -- null until >= 10 votes (reveal threshold)
  approval_rate numeric,
  avg_confidence numeric,
  total_votes integer DEFAULT 0 NOT NULL,

  -- admin certification (Tier 3)
  certified_at timestamptz,
  certified_by uuid REFERENCES public.profiles(id),
  next_review_date timestamptz,   -- +90 days, same cadence as locations

  -- card content (i18n column pairs, same pattern as locations)
  why_conscious text,
  why_conscious_en text,
  craft text,                     -- what they do: "Chef", "Muralista", ...
  craft_en text,
  city text DEFAULT 'CDMX',
  cover_image_url text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,  -- { "values": ["zero_waste", ...] }

  is_featured boolean DEFAULT false NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_creator_certifications_status
  ON public.creator_certifications(status);
CREATE INDEX IF NOT EXISTS idx_creator_certifications_market
  ON public.creator_certifications(current_market_id)
  WHERE current_market_id IS NOT NULL;

ALTER TABLE public.creator_certifications ENABLE ROW LEVEL SECURITY;

-- Same policy shape as conscious_locations (migration 186):
-- public read for active certifications, admin manages everything.
DROP POLICY IF EXISTS "Anyone can view active creator certifications" ON public.creator_certifications;
CREATE POLICY "Anyone can view active creator certifications"
  ON public.creator_certifications FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "Admins manage creator certifications" ON public.creator_certifications;
CREATE POLICY "Admins manage creator certifications"
  ON public.creator_certifications FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin'
  ));

COMMENT ON TABLE public.creator_certifications IS
  'Conscious Creator certification lifecycle. One row per profile; identity lives on profiles. Mirrors conscious_locations semantics (status machine, voting market, score reveal at >=10 votes, 90-day review).';

-- ── share_events: creator share analytics ──────────────────────────────────
-- Mirrors location_id so badge-card shares per creator are measurable.

ALTER TABLE public.share_events
  ADD COLUMN IF NOT EXISTS creator_profile_id uuid
    REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_share_events_creator
  ON public.share_events (creator_profile_id, created_at DESC)
  WHERE creator_profile_id IS NOT NULL;

-- A creator share is a valid target on its own.
ALTER TABLE public.share_events
  DROP CONSTRAINT IF EXISTS share_events_target_present;
ALTER TABLE public.share_events
  ADD CONSTRAINT share_events_target_present CHECK (
    market_id IS NOT NULL
    OR location_id IS NOT NULL
    OR creator_profile_id IS NOT NULL
    OR (other_type IS NOT NULL AND other_id IS NOT NULL)
  );

-- Extend the source_type vocabulary (migration 207) with 'creator'.
ALTER TABLE public.share_events
  DROP CONSTRAINT IF EXISTS share_events_source_type_check;
ALTER TABLE public.share_events
  ADD CONSTRAINT share_events_source_type_check
  CHECK (source_type IS NULL OR source_type IN ('pulse', 'location', 'cause', 'creator', 'other'));

-- ── conscious_inbox: creator nominations ───────────────────────────────────
-- The inbox type vocabulary is constrained by CHECK (last touched in
-- migration 206), so the new nomination type must be added here. The full
-- list below must stay a superset of every prior migration's list.

ALTER TABLE public.conscious_inbox DROP CONSTRAINT IF EXISTS conscious_inbox_type_check;
ALTER TABLE public.conscious_inbox
  ADD CONSTRAINT conscious_inbox_type_check
  CHECK (type IN (
    'market_idea',
    'cause_proposal',
    'ngo_suggestion',
    'general',
    'location_nomination',
    'cause_suggestion_municipal',
    'creator_nomination'
  ));
