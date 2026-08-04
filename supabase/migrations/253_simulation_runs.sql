-- 253_simulation_runs.sql
-- Workstream B (Pulse Simulation) — B1 data model, table 2 of 3.
--
-- RLS pattern (CC_BUILD_CONTEXT.md §1.2): RLS ENABLED with NO public/permissive
-- policies. All access via the service-role client (bypasses RLS). The only
-- public read path is the revealed_simulation_runs view (migration 254, §5.2),
-- gated on revealed_at — never this raw table.
--
-- market_id is a READ-ONLY reference to prediction_markets by convention
-- (§1 hard guardrail: real vote data is sacred). Simulation code reads market
-- metadata but NEVER writes back to prediction_markets or any real vote table.
-- revealed_at is THE reveal gate: NULL during silent calibration; set to a
-- timestamp only at public reveal (manual during calibration, per §5.5).

create table simulation_runs (
  id uuid primary key default gen_random_uuid(),
  market_id uuid references prediction_markets(id),  -- READ-ONLY by convention; NEVER written back
  persona_version text not null,
  model text not null,
  prompt_version text not null,             -- 'sim-prompt-v1'
  n_agents int not null,
  status text not null default 'pending',   -- pending|running|complete|failed
  is_brand_pretest boolean default false,   -- Pulse Sim tier runs (no market_id)
  question_override text,
  aggregates jsonb,                         -- {option_shares, avg_confidence_by_option, confidence_weighted_shares, completion_rate, synthesis}
  divergence jsonb,
  revealed_at timestamptz,                  -- NULL until public reveal — THE gate
  batch_id text,
  created_at timestamptz default now()
);

-- RLS enabled, no policies: service-role only. No grants to anon/authenticated.
-- Public read happens exclusively through revealed_simulation_runs (migration 254).
alter table simulation_runs enable row level security;
