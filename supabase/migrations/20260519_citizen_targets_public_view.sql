-- =============================================================================
-- 2026-05-19 · citizen_targets PII shield
--
-- Rationale: Restrict anon access to PII columns; clients read via the public
-- view. Migration 219 exposed citizen_targets.notification_email (the public
-- authority's contact email) and citizen_targets.metadata (free-form jsonb)
-- to the anon role through the citizen_targets_anon_read RLS policy. Those
-- columns are operational/PII data and must not be readable from a leaked
-- anon key. Server-side admin reads via the service-role client continue to
-- work because service_role bypasses both RLS and view-vs-table grants.
--
-- Surface decision: the view exposes only the columns that the mobile
-- compose wizard and the web target picker actually consume today
-- (id, slug, display_name, target_kind, conscious_location_id) plus
-- created_at / updated_at for ordering. We intentionally omit `metadata`
-- (operational jsonb that may grow PII over time) per the conservative-set
-- guideline. If a future client truly needs a metadata field, expose it as
-- a typed column in the view rather than re-broadening the surface.
-- =============================================================================

CREATE OR REPLACE VIEW public.citizen_targets_public AS
SELECT
  ct.id,
  ct.slug,
  ct.display_name,
  ct.target_kind,
  ct.conscious_location_id,
  ct.created_at,
  ct.updated_at
FROM public.citizen_targets ct;

COMMENT ON VIEW public.citizen_targets_public IS
  'Anon-safe projection of citizen_targets. Excludes notification_email (PII) and metadata (operational). Grant SELECT to anon + authenticated; revoke base-table SELECT from anon.';

GRANT SELECT ON public.citizen_targets_public TO anon, authenticated;

-- Drop the broad public RLS policy that allowed anon to SELECT the entire
-- base row (including notification_email). The admin policy in migration 219
-- (citizen_targets_admin_all) stays in place so the admin dashboard, the
-- service-role client, and authenticated admins continue to read/write the
-- base table.
DROP POLICY IF EXISTS citizen_targets_anon_read ON public.citizen_targets;

-- Belt-and-suspenders: revoke base-table SELECT from anon at the grant
-- level too, so even a future policy change cannot accidentally re-expose
-- PII. authenticated keeps its grant because admin policies + future
-- authenticated-author flows may need it; service_role is unaffected.
REVOKE SELECT ON public.citizen_targets FROM anon;

-- Rollback (do not run in production without review):
--   DROP VIEW IF EXISTS public.citizen_targets_public;
--   GRANT SELECT ON public.citizen_targets TO anon;
--   CREATE POLICY citizen_targets_anon_read ON public.citizen_targets
--     FOR SELECT TO anon, authenticated USING (true);
