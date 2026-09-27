-- 266_simulation_viewer_data_layer.sql
-- Visor de simulación — Task 1 data layer (prompt pack).
--
-- CONTEXT: migrations 252–254 already created simulation_personas /
-- simulation_runs / simulation_votes for the B-pipeline ("¿La IA nos conoce?").
-- The pack's CREATE TABLE names collide with those. This migration EXTENDS the
-- existing tables additively so the visual replay (sequence_index, AGEB fields,
-- option UUID FK, run mode/timing) can work without replacing the live pipeline
-- or touching any real vote / confidence / señal table.
--
-- Canonical Pulse tables in this repo (do not invent alternate names):
--   prediction_markets  — the Pulse row (is_pulse = true)
--   market_outcomes     — the Pulse options
-- simulation_runs.market_id already references prediction_markets(id).
--
-- Pack named the persona table `synthetic_personas`; this repo's table is
-- `simulation_personas` (252). We extend that table rather than creating a
-- parallel one. See PR parked question if a rename/view is preferred.
--
-- Migration numbering: 262 is multi-select on main; 263–265 are claimed by
-- open PR #16 (Reconocimientos). Next free integer is 266.
-- Known historical collision at 261 (ops notify vs civic reputation) noted.
--
-- HARD RULES honored:
--   - No ALTER / backfill / RMW of prediction_markets, market_votes,
--     market_outcomes vote counters, or señal co-sign tables.
--   - RLS stays ENABLED with NO client policies (existing 252–254 pattern).
--     All reads go through the Task 2 API (service-role). Pack suggested
--     "authenticated read" on personas — parked; do not guess RLS.
--   - Feature gated in app code by NEXT_PUBLIC_SIM_VIEWER_ENABLED (default false).

-- =============================================================================
-- 1. simulation_personas — AGEB / identity columns for map + inspector
-- =============================================================================

alter table simulation_personas
  add column if not exists persona_key text,
  add column if not exists ageb_code text,
  add column if not exists centroid_lat double precision,
  add column if not exists centroid_lng double precision,
  add column if not exists nse_band text,
  add column if not exists household_size integer,
  add column if not exists active boolean not null default true;

-- Stable slug for deep-links (?persona=<personaKey>). Nullable so existing
-- cdmx-v1 rows remain valid; new / fixture rows must set it.
create unique index if not exists simulation_personas_persona_key_uidx
  on simulation_personas (persona_key)
  where persona_key is not null;

create index if not exists simulation_personas_alcaldia_ageb_idx
  on simulation_personas (alcaldia, ageb_code);

comment on column simulation_personas.persona_key is
  'Stable slug for viewer deep-links (e.g. mh-anahuac-c-034). Visor Task 1.';
comment on column simulation_personas.ageb_code is
  'INEGI AGEB identifier for map plotting. Visor Task 1/4.';
comment on column simulation_personas.centroid_lat is
  'AGEB centroid latitude for map plotting. Visor Task 1/4.';
comment on column simulation_personas.centroid_lng is
  'AGEB centroid longitude for map plotting. Visor Task 1/4.';
comment on column simulation_personas.nse_band is
  'AMAI NSE band (A/B, C+, C, C-, D+, D). Prefer over income_band for viewer copy when set.';
comment on column simulation_personas.active is
  'When false, persona is excluded from new simulation runs. Visor Task 1.';

-- =============================================================================
-- 2. simulation_runs — replay metadata (additive; keep market_id / n_agents / …)
-- =============================================================================
-- market_id  ≡ pack's pulse_id  (FK → prediction_markets)
-- n_agents   ≡ pack's persona_count
-- divergence jsonb already stores the full DivergenceResult; divergence_index
-- is a denormalized numeric for cheap listing / sorting in the viewer.

alter table simulation_runs
  add column if not exists mode text not null default 'batch',
  add column if not exists temperature numeric,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists divergence_index numeric,
  add column if not exists divergence_meta jsonb,
  add column if not exists notes text,
  add column if not exists is_fixture boolean not null default false;

-- pending|running|complete|failed already live in status (253).
-- batch|live for mode; constrain lightly so typos fail loudly.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'simulation_runs_mode_check'
  ) then
    alter table simulation_runs
      add constraint simulation_runs_mode_check
      check (mode in ('batch', 'live'));
  end if;
end $$;

create index if not exists simulation_runs_market_created_idx
  on simulation_runs (market_id, created_at desc);

comment on column simulation_runs.mode is
  'batch = Anthropic Batch API; live = streaming. Visor Task 1.';
comment on column simulation_runs.divergence_index is
  '0–100 Divergence Index; null until the Pulse closes / index is computed.';
comment on column simulation_runs.divergence_meta is
  'Component scores + computed_at for the viewer (shareScore, confScore, …).';
comment on column simulation_runs.is_fixture is
  'True for seed/fixture runs. NEVER treat as a real calibration datapoint.';
comment on column simulation_runs.notes is
  'Operator notes; fixture runs should say FIXTURE explicitly.';

-- =============================================================================
-- 3. simulation_votes — replay order + option UUID FK
-- =============================================================================
-- Existing rows store option_chosen as the outcome LABEL (text). The viewer
-- needs option_id (uuid → market_outcomes). Both coexist: pipeline keeps
-- writing option_chosen; viewer seed / future writers also set option_id +
-- sequence_index. sequence_index is the REPLAY ORDER (shuffled at write time).

alter table simulation_votes
  add column if not exists option_id uuid references market_outcomes(id),
  add column if not exists sequence_index integer,
  add column if not exists latency_ms integer,
  add column if not exists reasoning text;

-- Prefer reasoning when set; reasoning_es remains for the B-pipeline.
-- Backfill reasoning from reasoning_es for rows that already have it.
update simulation_votes
set reasoning = reasoning_es
where reasoning is null and reasoning_es is not null;

create unique index if not exists simulation_votes_run_persona_uidx
  on simulation_votes (run_id, persona_id)
  where run_id is not null and persona_id is not null;

create unique index if not exists simulation_votes_run_sequence_uidx
  on simulation_votes (run_id, sequence_index)
  where run_id is not null and sequence_index is not null;

create index if not exists simulation_votes_run_sequence_idx
  on simulation_votes (run_id, sequence_index);

comment on column simulation_votes.option_id is
  'FK to market_outcomes (Pulse option). Nullable for pre-viewer pipeline rows that only have option_chosen text.';
comment on column simulation_votes.sequence_index is
  '0..n-1 REPLAY ORDER. Assigned shuffled at write time — never grouped by option. Visor Task 1.';
comment on column simulation_votes.latency_ms is
  'Optional per-persona model latency for audit / capture pacing.';
comment on column simulation_votes.reasoning is
  'One-sentence reasoning in the persona register. Alias of reasoning_es for viewer contract.';

-- =============================================================================
-- RLS: unchanged. Tables stay service-role only (no client policies).
-- Task 2 API is the sole read path for runs/votes. Do not add authenticated
-- SELECT on personas here — see parked RLS question in the PR.
-- =============================================================================
