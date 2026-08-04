-- 254_simulation_votes.sql
-- Workstream B (Pulse Simulation) — B1 data model, table 3 of 3, plus the
-- single public read view (§5.2).
--
-- RLS pattern (CC_BUILD_CONTEXT.md §1.2): RLS ENABLED with NO public/permissive
-- policies. All access via the service-role client (bypasses RLS). Raw
-- simulation_votes are audit-trail rows and are NEVER exposed to clients.
--
-- run_id cascades on delete so votes are cleaned up with their parent run.

create table simulation_votes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references simulation_runs(id) on delete cascade,
  persona_id uuid references simulation_personas(id),
  option_chosen text not null,
  confidence int not null check (confidence between 1 and 10),
  reasoning_es text,
  raw_response jsonb,                       -- full model output, audit trail
  created_at timestamptz default now()
);
create index on simulation_votes (run_id);

-- RLS enabled, no policies: service-role only. No grants to anon/authenticated.
alter table simulation_votes enable row level security;

-- =============================================================================
-- revealed_simulation_runs — the ONLY public read path for simulation data (§5.2)
-- =============================================================================
--
-- This view is the sole way client / user-facing code ever reads simulation
-- data (reveal UI, Adivina three-way, reports). It exposes ONLY runs whose
-- revealed_at is not null.
--
-- Security model (matches repo convention — e.g. conscious_fund_contributions_totals
-- in 233_monetization_core.sql, citizen_signals_public in 219_citizen_signals_mvp.sql):
-- the view is created WITHOUT security_invoker, so it runs with the privileges
-- of its owner (the migration runner), reading past the RLS on simulation_runs
-- and exposing only the projected, revealed rows. This is safe precisely BECAUSE
-- the WHERE clause hard-filters unrevealed runs: synthetic votes are provably
-- uncontaminated ground truth only if unrevealed runs are unreadable at the DB
-- layer. No security_invoker views exist in this repo; matching that convention
-- keeps the gate at the database layer rather than trusting application code.
create view revealed_simulation_runs as
  select id, market_id, aggregates, divergence, revealed_at
  from simulation_runs where revealed_at is not null;

comment on view revealed_simulation_runs is
  'Sole public read path for Pulse Simulation data (CC_BUILD_CONTEXT §5.2). Exposes only runs where revealed_at is not null. Synthetic votes are provably uncontaminated ground truth only because unrevealed runs are unreadable at the DB layer; user-facing code must NEVER read the raw simulation_* tables.';

-- Grant SELECT on the VIEW ONLY, to anon + authenticated (matching how existing
-- public views are granted in this repo, e.g. citizen_signals_public and
-- conscious_fund_contributions_totals). Nothing else public. Ever.
grant select on revealed_simulation_runs to anon, authenticated;

-- =============================================================================
-- Operator verification (run AFTER applying 252–254 to a branch/shadow DB).
-- These queries assert the B1 release-blocker guarantees at the DB layer.
-- Do NOT trust application code for these — verify directly.
-- =============================================================================
--
-- As anon (e.g. via the anon key / `set role anon;`) AND as a normal
-- authenticated user (`set role authenticated;`), each of the following must
-- either ERROR ("permission denied for table ...") or return 0 rows — no raw
-- simulation table is readable by clients:
--
--   select count(*) from simulation_personas;   -- expect: permission denied / 0
--   select count(*) from simulation_runs;        -- expect: permission denied / 0
--   select count(*) from simulation_votes;       -- expect: permission denied / 0
--
-- The only public read path returns 0 rows while no run has been revealed
-- (revealed_at is null for every row), even as anon/authenticated:
--
--   select count(*) from revealed_simulation_runs;  -- expect: 0 until a reveal
--
-- To positively confirm the gate works, an operator with service-role access
-- can (on the branch DB only) insert a run and flip revealed_at, then confirm
-- the row appears in revealed_simulation_runs but the raw tables remain
-- unreadable as anon/authenticated. Clean up the test row afterward.
