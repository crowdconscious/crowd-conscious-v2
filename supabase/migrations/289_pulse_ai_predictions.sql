-- 289: Contraste IA — locked, pre-vote AI predictions for every Pulse.
--
-- ADDITIVE ONLY. One new table + two trigger functions. No existing table,
-- column, row or policy is touched.
--
-- Guarantees enforced in the DATABASE (not trusted to app code):
--   * locked_at is always the DB clock at insert time (client value ignored).
--   * status is computed at insert: 'locked' if the Pulse had zero votes at
--     that instant, 'late' otherwise (first_vote_at records the earliest vote).
--   * Rows are immutable: UPDATE always raises; DELETE raises unless the parent
--     Pulse no longer exists (lets ON DELETE CASCADE work).
--   * Service-role only: RLS on, no policies, privileges revoked from anon and
--     authenticated (same pattern as simulation_* tables, migrations 252-254).
--
-- A Pulse can hold several predictions (e.g. one locked on the draft, then the
-- question text changed, then another locked at publish). The effective one is
-- the newest row whose subject_hash matches the published question/options;
-- unique(market_id, subject_hash) stops duplicates for the same wording.

create table if not exists public.pulse_ai_predictions (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.prediction_markets(id) on delete cascade,
  model text not null,
  prompt_version text not null,
  persona_version text not null,
  vote_mode text not null default 'single',
  -- What the panel saw: {question, description, options[], max_selections}. Pre-vote info only.
  subject jsonb not null,
  subject_hash text not null,
  n_runs integer not null check (n_runs between 1 and 10),
  n_personas integer not null check (n_personas > 0),       -- personas per run
  -- Aggregate across runs: {option label: share of personas choosing it, 0..1}
  option_distribution jsonb not null,
  -- Std-dev across runs per option (0..1), the run-to-run spread.
  option_spread jsonb not null default '{}'::jsonb,
  -- Aggregate certainty histogram {"1": n, ..., "10": n} across all runs.
  confidence_distribution jsonb not null,
  avg_confidence numeric(4,2),
  -- Every run: [{run, option_distribution, confidence_distribution, valid, attempted, input_tokens, output_tokens}]
  runs jsonb not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  model_calls integer not null default 0,
  cost_usd numeric(10,5) not null default 0,
  trigger_source text not null default 'publish'
    check (trigger_source in ('publish', 'backstop', 'draft', 'manual')),
  status text not null default 'locked' check (status in ('locked', 'late')),
  first_vote_at timestamptz,
  created_at timestamptz not null default now(),
  locked_at timestamptz not null default now(),
  constraint pulse_ai_predictions_market_subject_key unique (market_id, subject_hash)
);

create index if not exists pulse_ai_predictions_market_idx
  on public.pulse_ai_predictions (market_id, locked_at desc);

comment on table public.pulse_ai_predictions is
  'Contraste IA: AI panel prediction locked before real votes. Immutable after insert; service-role only.';

-- Stamp lock time + late status from the DB's own view of the votes.
create or replace function public.pulse_ai_predictions_stamp_lock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_first timestamptz;
begin
  new.created_at := now();
  new.locked_at := now();
  select min(v.created_at) into v_first
    from public.market_votes v
   where v.market_id = new.market_id;
  new.first_vote_at := v_first;
  new.status := case when v_first is null then 'locked' else 'late' end;
  return new;
end;
$$;

create or replace function public.pulse_ai_predictions_immutable()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.prediction_markets m where m.id = old.market_id) then
      return old; -- parent Pulse deleted: allow cascade
    end if;
    raise exception 'pulse_ai_predictions rows are immutable once locked (delete blocked)';
  end if;
  raise exception 'pulse_ai_predictions rows are immutable once locked (update blocked)';
end;
$$;

revoke all on function public.pulse_ai_predictions_stamp_lock() from public, anon, authenticated;
revoke all on function public.pulse_ai_predictions_immutable() from public, anon, authenticated;

drop trigger if exists pulse_ai_predictions_stamp_lock on public.pulse_ai_predictions;
create trigger pulse_ai_predictions_stamp_lock
  before insert on public.pulse_ai_predictions
  for each row execute function public.pulse_ai_predictions_stamp_lock();

drop trigger if exists pulse_ai_predictions_immutable on public.pulse_ai_predictions;
create trigger pulse_ai_predictions_immutable
  before update or delete on public.pulse_ai_predictions
  for each row execute function public.pulse_ai_predictions_immutable();

alter table public.pulse_ai_predictions enable row level security;
revoke all on table public.pulse_ai_predictions from anon, authenticated;
