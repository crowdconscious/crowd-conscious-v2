-- Migration 248 — Citizen Signals: expanded target kinds
--
-- Founder ask: municipalities often don't answer, so citizens can now aim a
-- signal at three NEW target kinds in addition to the registry-backed
-- municipality / institution pair:
--
--   * 'company'             — free-text company name typed by the citizen,
--                             plus an OPTIONAL contact email so the platform
--                             can notify the company when the Stage-1
--                             co-sign threshold is crossed.
--   * 'neighborhood'        — free-text colonia/neighbourhood name. No email;
--                             these escalate publicly only.
--   * 'conscious_location'  — an existing ACTIVE `conscious_locations` row
--                             (certified directory). Stage-1 notification
--                             uses the location's own `contact_email`.
--
-- Design: the new kinds are "direct" targets stored ON the signal row itself
-- (target_name / target_contact_email / target_location_id) instead of the
-- `citizen_targets` registry. The registry stays the source of truth for
-- municipality/institution (magic-link dashboard, official responses); the
-- direct kinds have no registry row and therefore no target dashboard —
-- Stage-1 email links them to the public signal page instead.
--
-- Backward compatibility:
--   * Existing rows: routing_mode='routed' + target_kind IN
--     ('municipality','institution') + citizen_target_id NOT NULL — all
--     remain valid under the widened CHECKs below.
--   * Old mobile clients keep POSTing only municipality/institution payloads;
--     nothing in this migration changes that contract.
--
-- Depends on (already in production):
--   * migration 219/221/222 (citizen_signals MVP + support + precision)
--   * mobile migration 20260602_signal_geography_cities_routing.sql
--     (routing_mode, country_code/city_slug/locality, nullable FKs, the
--     three citizen_signals_routing_* CHECK constraints, and the current
--     citizen_signals_public column order this file appends to)
--
-- Rollback (do not run in production without backup):
--   DROP VIEW IF EXISTS public.citizen_signals_public;
--   -- re-run the view definition from 20260602_signal_geography_cities_routing.sql
--   -- re-run the get_signals_feed definition from 20260518_sprint7_ugc.sql
--   ALTER TABLE public.citizen_signals
--     DROP CONSTRAINT IF EXISTS citizen_signals_direct_target_fields_check;
--   -- re-add the three routing checks from 20260602 (municipality/institution only)
--   DROP INDEX IF EXISTS public.idx_citizen_signals_target_location;
--   ALTER TABLE public.citizen_signals
--     DROP COLUMN IF EXISTS target_name,
--     DROP COLUMN IF EXISTS target_contact_email,
--     DROP COLUMN IF EXISTS target_location_id;

-- =============================================================================
-- 1. New columns on citizen_signals
-- =============================================================================

ALTER TABLE public.citizen_signals
  ADD COLUMN IF NOT EXISTS target_name text,
  ADD COLUMN IF NOT EXISTS target_contact_email text,
  ADD COLUMN IF NOT EXISTS target_location_id uuid
    REFERENCES public.conscious_locations(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.citizen_signals.target_name IS
  'Display name of a direct (non-registry) target. Required for target_kind company/neighborhood; denormalised copy of the location name for conscious_location. NULL for municipality/institution/observation rows.';

COMMENT ON COLUMN public.citizen_signals.target_contact_email IS
  'Optional citizen-provided contact email for target_kind=company. PII: never exposed via citizen_signals_public; the Stage-1 cron and the admin triage are the only readers.';

COMMENT ON COLUMN public.citizen_signals.target_location_id IS
  'FK to conscious_locations for target_kind=conscious_location (the certified place the signal is aimed at). Distinct from conscious_location_id (the alcaldía bucket) and partner_location_id (geo refinement).';

CREATE INDEX IF NOT EXISTS idx_citizen_signals_target_location
  ON public.citizen_signals(target_location_id)
  WHERE target_location_id IS NOT NULL;

-- =============================================================================
-- 2. Widen the routing CHECK constraints (from 20260602)
-- =============================================================================
--
-- Registry kinds keep their old contract verbatim. Direct kinds must NOT
-- reference the registry (citizen_target_id stays NULL) and do NOT require an
-- alcaldía (conscious_location_id optional — a company target should not
-- depend on municipal routing).

ALTER TABLE public.citizen_signals
  DROP CONSTRAINT IF EXISTS citizen_signals_routing_target_kind_check;

ALTER TABLE public.citizen_signals
  ADD CONSTRAINT citizen_signals_routing_target_kind_check
    CHECK (
      (routing_mode = 'observation'::public.signal_routing_mode AND target_kind IS NULL)
      OR
      (routing_mode = 'routed'::public.signal_routing_mode
        AND target_kind IS NOT NULL
        AND target_kind IN (
          'municipality', 'institution',
          'company', 'neighborhood', 'conscious_location'
        ))
    );

ALTER TABLE public.citizen_signals
  DROP CONSTRAINT IF EXISTS citizen_signals_routing_target_check;

ALTER TABLE public.citizen_signals
  ADD CONSTRAINT citizen_signals_routing_target_check
    CHECK (
      (routing_mode = 'observation'::public.signal_routing_mode AND citizen_target_id IS NULL)
      OR
      (routing_mode = 'routed'::public.signal_routing_mode
        AND target_kind IN ('municipality', 'institution')
        AND citizen_target_id IS NOT NULL)
      OR
      (routing_mode = 'routed'::public.signal_routing_mode
        AND target_kind IN ('company', 'neighborhood', 'conscious_location')
        AND citizen_target_id IS NULL)
    );

ALTER TABLE public.citizen_signals
  DROP CONSTRAINT IF EXISTS citizen_signals_routing_location_check;

ALTER TABLE public.citizen_signals
  ADD CONSTRAINT citizen_signals_routing_location_check
    CHECK (
      (routing_mode = 'observation'::public.signal_routing_mode AND conscious_location_id IS NULL)
      OR
      (routing_mode = 'routed'::public.signal_routing_mode
        AND target_kind IN ('municipality', 'institution')
        AND conscious_location_id IS NOT NULL)
      OR
      -- Direct kinds: alcaldía is optional geo context, never a requirement.
      (routing_mode = 'routed'::public.signal_routing_mode
        AND target_kind IN ('company', 'neighborhood', 'conscious_location'))
    );

-- Per-kind required fields for the direct kinds. Registry kinds and
-- observation rows are unconstrained here (their fields stay NULL by
-- convention, enforced at the API layer).
ALTER TABLE public.citizen_signals
  DROP CONSTRAINT IF EXISTS citizen_signals_direct_target_fields_check;

ALTER TABLE public.citizen_signals
  ADD CONSTRAINT citizen_signals_direct_target_fields_check
    CHECK (
      (target_kind IS NULL OR target_kind IN ('municipality', 'institution'))
      OR
      (target_kind IN ('company', 'neighborhood')
        AND target_name IS NOT NULL
        AND char_length(btrim(target_name)) >= 2)
      OR
      (target_kind = 'conscious_location' AND target_location_id IS NOT NULL)
    );

-- =============================================================================
-- 3. citizen_signals_public — APPEND target_name + target_location_id
-- =============================================================================
--
-- CREATE OR REPLACE VIEW only allows appending columns at the end (42P16).
-- Column order locked by 219 → 221 → 222 → 20260602; preserved verbatim.
-- target_contact_email is intentionally NOT exposed (PII).

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
  cs.updated_at,
  cs.anonymous_support_count,
  cs.partner_location_id,
  cs.street_reference,
  cs.country_code,
  cs.city_slug,
  cs.locality,
  cs.routing_mode,
  cs.target_name,
  cs.target_location_id
FROM public.citizen_signals cs
WHERE cs.publication_status = 'published';

COMMENT ON VIEW public.citizen_signals_public IS
  'Anon-safe projection of published Citizen Signals. Migration 248 appends target_name + target_location_id for the direct target kinds (company/neighborhood/conscious_location). target_contact_email is PII and stays moderator-only.';

GRANT SELECT ON public.citizen_signals_public TO anon, authenticated;

-- Re-issue get_signals_feed (20260518_sprint7_ugc.sql) so the SETOF rowtype
-- picks up the appended view columns deterministically. Body unchanged.
CREATE OR REPLACE FUNCTION public.get_signals_feed(
  p_limit  int DEFAULT 30,
  p_before timestamptz DEFAULT null
)
RETURNS SETOF public.citizen_signals_public
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  select s.*
  from public.citizen_signals_public s
  where (p_before is null or s.created_at < p_before)
    and (
      auth.uid() is null
      or not exists (
        select 1
        from public.citizen_signals cs
        join public.user_blocks ub
          on ub.blocker_id = auth.uid()
         and ub.blocked_id = cs.author_user_id
        where cs.id = s.id
      )
    )
  order by s.created_at desc
  limit greatest(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_signals_feed(int, timestamptz)
  TO anon, authenticated;

-- =============================================================================
-- 4. RLS: widen the routed INSERT policy (documentation parity)
-- =============================================================================
--
-- POST /api/signals writes through the service-role client, so this policy is
-- belt-and-suspenders for any future direct supabase-js insert path. It
-- mirrors the CHECK constraints above.

DROP POLICY IF EXISTS citizen_signals_insert_routed ON public.citizen_signals;
CREATE POLICY citizen_signals_insert_routed ON public.citizen_signals
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND routing_mode = 'routed'::public.signal_routing_mode
    AND country_code IS NOT NULL
    AND city_slug IS NOT NULL
    AND (
      (target_kind IN ('municipality', 'institution')
        AND citizen_target_id IS NOT NULL
        AND conscious_location_id IS NOT NULL)
      OR
      (target_kind IN ('company', 'neighborhood')
        AND citizen_target_id IS NULL
        AND target_name IS NOT NULL)
      OR
      (target_kind = 'conscious_location'
        AND citizen_target_id IS NULL
        AND target_location_id IS NOT NULL)
    )
  );
