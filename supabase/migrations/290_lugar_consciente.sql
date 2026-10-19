-- 290_lugar_consciente: two distinct seals (Lugar Consciente = free/earned;
-- Sello verificado = paid B2B), the values pledge and the progress view.
-- Additive only: new nullable columns, new tables, new view.
-- Nothing existing is altered, renamed or dropped. Idempotent.
-- New tables: RLS enabled + forced, no policies, service_role only (server routes).

-- 1) Places: per-place attribution slug (?src=) and optional link to a paying org.
ALTER TABLE public.conscious_locations ADD COLUMN IF NOT EXISTS src_slug text;
ALTER TABLE public.conscious_locations ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.orgs(id) ON DELETE SET NULL;
DO $$ BEGIN
  ALTER TABLE public.conscious_locations ADD CONSTRAINT conscious_locations_src_slug_fmt
    CHECK (src_slug IS NULL OR (src_slug ~ '^qr_[a-z0-9._-]+$' AND length(src_slug) <= 40));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS conscious_locations_src_slug_uq ON public.conscious_locations (src_slug) WHERE src_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS conscious_locations_org_id_idx ON public.conscious_locations (org_id) WHERE org_id IS NOT NULL;
-- Progress queries filter votes by src + time.
CREATE INDEX IF NOT EXISTS market_votes_src_created_idx ON public.market_votes (src, created_at) WHERE src IS NOT NULL;

-- 2) Values pledge: ONE acceptance of all 7 values together (not audited rules).
CREATE TABLE IF NOT EXISTS public.values_pledges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES public.conscious_locations(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  signer_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  signer_name text NOT NULL CHECK (length(signer_name) BETWEEN 1 AND 200),
  signer_role text CHECK (signer_role IS NULL OR length(signer_role) <= 120),
  version text NOT NULL CHECK (version ~ '^[0-9]{4}-[0-9]{2}$'),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  CONSTRAINT values_pledges_one_subject CHECK ((location_id IS NULL) <> (org_id IS NULL))
);
CREATE INDEX IF NOT EXISTS values_pledges_location_idx ON public.values_pledges (location_id, accepted_at DESC);
CREATE INDEX IF NOT EXISTS values_pledges_org_idx ON public.values_pledges (org_id, accepted_at DESC);

-- 3) Seal awards (history kept; one open award per subject + type).
CREATE TABLE IF NOT EXISTS public.seal_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seal_type text NOT NULL CHECK (seal_type IN ('lugar_consciente', 'sello_verificado')),
  location_id uuid REFERENCES public.conscious_locations(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'lapsed', 'revoked')),
  awarded_by text NOT NULL CHECK (awarded_by IN ('auto', 'auto_paid', 'admin')),
  pledge_id uuid REFERENCES public.values_pledges(id) ON DELETE SET NULL,
  earned_at timestamptz,
  expires_at timestamptz,
  suspicious jsonb,
  note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seal_awards_one_subject CHECK ((location_id IS NULL) <> (org_id IS NULL)),
  CONSTRAINT seal_awards_active_dates CHECK (status <> 'active' OR (earned_at IS NOT NULL AND expires_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS seal_awards_open_loc_uq ON public.seal_awards (seal_type, location_id) WHERE status IN ('pending', 'active') AND location_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS seal_awards_open_org_uq ON public.seal_awards (seal_type, org_id) WHERE status IN ('pending', 'active') AND org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS seal_awards_expiry_idx ON public.seal_awards (expires_at) WHERE status = 'active';

-- Audit trail for automatic and admin changes.
CREATE TABLE IF NOT EXISTS public.seal_award_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  award_id uuid NOT NULL REFERENCES public.seal_awards(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('created', 'activated', 'renewed', 'lapsed', 'revoked', 'extended', 'flagged', 'note')),
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seal_award_events_award_idx ON public.seal_award_events (award_id, created_at);

ALTER TABLE public.values_pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.values_pledges FORCE ROW LEVEL SECURITY;
ALTER TABLE public.seal_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seal_awards FORCE ROW LEVEL SECURITY;
ALTER TABLE public.seal_award_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seal_award_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.values_pledges, public.seal_awards, public.seal_award_events FROM anon, authenticated;
GRANT ALL ON public.values_pledges, public.seal_awards, public.seal_award_events TO service_role;

-- 4) Progress per location over a rolling 8 weeks (Francisco, 16 Oct 2026):
--    qualifying week = >= 3 distinct voters; eligible = >= 4 such weeks AND >= 25 distinct voters.
--    Guards: owner's own votes excluded; at most 2 voters per anonymous ip_hash per week;
--    dropped voters and the top ip_hash share are exposed so the cron can mark 'pending'.
CREATE OR REPLACE VIEW public.lugar_consciente_progress
WITH (security_invoker = true) AS
WITH v AS (
  SELECT l.id AS location_id,
         date_trunc('week', mv.created_at) AS wk,
         coalesce('u:' || mv.user_id::text, 'a:' || mv.anonymous_participant_id::text) AS voter,
         ap.ip_hash
  FROM public.conscious_locations l
  JOIN public.market_votes mv ON mv.src = l.src_slug
  LEFT JOIN public.anonymous_participants ap ON ap.id = mv.anonymous_participant_id
  WHERE l.src_slug IS NOT NULL
    AND mv.created_at >= now() - interval '8 weeks'
    AND (mv.user_id IS NOT NULL OR mv.anonymous_participant_id IS NOT NULL)
    AND (l.owner_profile_id IS NULL OR mv.user_id IS DISTINCT FROM l.owner_profile_id)
    AND (l.owner_profile_id IS NULL OR ap.converted_to_user_id IS DISTINCT FROM l.owner_profile_id)
), dv AS (
  SELECT DISTINCT location_id, wk, voter, ip_hash FROM v
), ranked AS (
  SELECT dv.*, CASE WHEN ip_hash IS NULL THEN 1
                    ELSE row_number() OVER (PARTITION BY location_id, wk, ip_hash ORDER BY voter) END AS rn
  FROM dv
), capped AS (
  SELECT * FROM ranked WHERE rn <= 2
), weekly AS (
  SELECT location_id, wk, count(DISTINCT voter) AS n FROM capped GROUP BY 1, 2
), totals AS (
  SELECT location_id, count(DISTINCT voter) AS total_voters FROM capped GROUP BY 1
), dropped AS (
  SELECT location_id, count(*) AS dropped_voter_weeks FROM ranked WHERE rn > 2 GROUP BY 1
), ipshare AS (
  SELECT location_id, max(c) AS top_ip_voters FROM (
    SELECT location_id, ip_hash, count(DISTINCT voter) AS c FROM capped WHERE ip_hash IS NOT NULL GROUP BY 1, 2
  ) x GROUP BY 1
)
SELECT l.id AS location_id,
       l.slug,
       l.src_slug,
       coalesce((SELECT count(*) FROM weekly w WHERE w.location_id = l.id AND w.n >= 3), 0)::int AS weeks_ok,
       coalesce(t.total_voters, 0)::int AS total_voters,
       coalesce(d.dropped_voter_weeks, 0)::int AS dropped_voter_weeks,
       coalesce(i.top_ip_voters, 0)::int AS top_ip_voters,
       (SELECT coalesce(jsonb_agg(jsonb_build_object('week', w.wk, 'voters', w.n) ORDER BY w.wk), '[]'::jsonb)
          FROM weekly w WHERE w.location_id = l.id) AS weeks
FROM public.conscious_locations l
LEFT JOIN totals t ON t.location_id = l.id
LEFT JOIN dropped d ON d.location_id = l.id
LEFT JOIN ipshare i ON i.location_id = l.id
WHERE l.src_slug IS NOT NULL;

REVOKE ALL ON public.lugar_consciente_progress FROM anon, authenticated;
GRANT SELECT ON public.lugar_consciente_progress TO service_role;
