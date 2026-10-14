-- 284_org_pilot_requests_v2_fields
-- ALREADY APPLIED in production (schema_migrations version 20261014003157).
-- Committed to the repo on 2026-10-14 to match the DB, reconstructed from the live schema.

ALTER TABLE public.org_pilot_requests
  ADD COLUMN IF NOT EXISTS cargo text,
  ADD COLUMN IF NOT EXISTS org_type text,
  ADD COLUMN IF NOT EXISTS current_reporting text,
  ADD COLUMN IF NOT EXISTS base_size text,
  ADD COLUMN IF NOT EXISTS visibility_pref text;

DO $$ BEGIN
  ALTER TABLE public.org_pilot_requests ADD CONSTRAINT org_pilot_requests_cargo_len CHECK (cargo IS NULL OR char_length(cargo) <= 120);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.org_pilot_requests ADD CONSTRAINT org_pilot_requests_org_type_chk
    CHECK (org_type IS NULL OR org_type = ANY (ARRAY['aseguradora_salud','banco_fintech','escuela','universidad','condominio','otra']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.org_pilot_requests ADD CONSTRAINT org_pilot_requests_current_reporting_len
    CHECK (current_reporting IS NULL OR char_length(current_reporting) <= 500);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.org_pilot_requests ADD CONSTRAINT org_pilot_requests_base_size_chk
    CHECK (base_size IS NULL OR base_size = ANY (ARRAY['lt_500','500_2k','2k_10k','10k_50k','gt_50k']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.org_pilot_requests ADD CONSTRAINT org_pilot_requests_visibility_pref_chk
    CHECK (visibility_pref IS NULL OR visibility_pref = ANY (ARRAY['privada','publica','en_llamada']));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
