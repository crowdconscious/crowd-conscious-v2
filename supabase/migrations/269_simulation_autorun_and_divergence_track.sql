-- 269_simulation_autorun_and_divergence_track.sql
-- Auto-queue agent simulations for every published Pulse, and persist a
-- durable simulated-vs-real divergence track record when a Pulse closes.
--
-- Safely re-runnable: IF NOT EXISTS / DROP IF EXISTS / OR REPLACE where needed.
-- RLS enabled, no public policies — service-role only (same pattern as
-- simulation_runs / simulation_votes).

-- ---------------------------------------------------------------------------
-- 1. Queue: one row per Pulse. Re-run resets the row in place (UNIQUE market_id).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS simulation_autorun_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  -- queued | running | complete | failed
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'complete', 'failed')),
  simulation_run_id uuid REFERENCES simulation_runs(id) ON DELETE SET NULL,
  -- auto = publish/create hook; backfill = cron discovery; rerun = admin button
  source text NOT NULL DEFAULT 'auto'
    CHECK (source IN ('auto', 'backfill', 'rerun')),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  cost_usd numeric,
  input_tokens int,
  output_tokens int,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT simulation_autorun_jobs_market_id_key UNIQUE (market_id)
);

CREATE INDEX IF NOT EXISTS idx_sim_autorun_jobs_claim
  ON simulation_autorun_jobs (status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_sim_autorun_jobs_run
  ON simulation_autorun_jobs (simulation_run_id)
  WHERE simulation_run_id IS NOT NULL;

ALTER TABLE simulation_autorun_jobs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Durable divergence track record (one per Pulse, upserted on close).
--    divergences_score is NULL when has_real_data is false — never a fake 0.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pulse_simulation_divergence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
  simulation_run_id uuid REFERENCES simulation_runs(id) ON DELETE SET NULL,
  category text,
  subcategory text,
  -- { option_shares, avg_confidence_by_option } from the sim run
  simulated_distribution jsonb,
  -- same shape from real votes; NULL when outcome = 'no_real_data'
  real_distribution jsonb,
  -- n real votes (0 when no_real_data) — filter small samples later
  real_vote_count int NOT NULL DEFAULT 0,
  -- 0–100 Divergence Index; NULL when there is no real data to compare
  divergence_score numeric,
  has_real_data boolean NOT NULL DEFAULT false,
  -- scored | no_real_data | multi_select_unsupported | no_sim_run
  outcome text NOT NULL
    CHECK (outcome IN (
      'scored',
      'no_real_data',
      'multi_select_unsupported',
      'no_sim_run'
    )),
  computed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pulse_simulation_divergence_market_id_key UNIQUE (market_id)
);

CREATE INDEX IF NOT EXISTS idx_pulse_sim_divergence_category
  ON pulse_simulation_divergence (category);

CREATE INDEX IF NOT EXISTS idx_pulse_sim_divergence_computed
  ON pulse_simulation_divergence (computed_at DESC);

ALTER TABLE pulse_simulation_divergence ENABLE ROW LEVEL SECURITY;
