-- 291: Contraste IA for ORG READINGS (Organizaciones yes/no surveys).
--
-- Numbered 291, not 290: 289 is used twice (289_pulse_ai_predictions on PR #64,
-- applied; 289_lugar_consciente on PR #63, NOT applied). 290 is left free so
-- #63 can renumber to it without colliding with this file.
--
-- ADDITIVE ONLY. One new table + two trigger functions. No existing table,
-- column, row or policy is touched.
--
-- One row per (question, wording). Guarantees enforced in the DATABASE:
--   * locked_at / created_at are the DB clock at insert time.
--   * status is computed at insert: 'locked' if the reading had zero
--     responses at that instant, 'late' otherwise (first_response_at = earliest).
--   * reading_id must be the question's own reading (checked at insert).
--   * Rows are immutable: UPDATE always raises; DELETE raises unless the parent
--     question no longer exists (lets ON DELETE CASCADE work).
--   * Service-role only: RLS enabled AND forced, no policies, privileges
--     revoked from anon/authenticated (same as 286_org_portal). Respondents
--     (the anonymous /e/<token> survey) can never read it.

create table if not exists public.org_ai_predictions (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.org_readings(id) on delete cascade,
  question_id uuid not null references public.org_questions(id) on delete cascade,
  model text not null,
  prompt_version text not null,
  persona_version text not null,
  -- What the panel saw: {org_name, title, question, locale, position, total}. Pre-field info only.
  subject jsonb not null,
  subject_hash text not null,
  n_runs integer not null check (n_runs between 1 and 10),
  n_personas integer not null check (n_personas > 0),       -- personas per run
  -- Mean share of personas answering YES across runs (0..1) and run-to-run std-dev.
  yes_share numeric(5,4) not null check (yes_share between 0 and 1),
  yes_spread numeric(5,4) not null default 0 check (yes_spread between 0 and 1),
  -- Certainty histograms {"1": n, ..., "10": n}, summed across runs.
  yes_certainty jsonb not null,
  no_certainty jsonb not null,
  avg_certainty numeric(4,2),
  -- Every run: [{run, yes_share, valid, attempted}]
  runs jsonb not null,
  -- Tokens/cost are for the whole reading call batch, apportioned evenly per question.
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  model_calls integer not null default 0,
  cost_usd numeric(10,5) not null default 0,
  trigger_source text not null default 'open'
    check (trigger_source in ('open', 'backstop', 'manual')),
  status text not null default 'locked' check (status in ('locked', 'late')),
  first_response_at timestamptz,
  created_at timestamptz not null default now(),
  locked_at timestamptz not null default now(),
  constraint org_ai_predictions_question_subject_key unique (question_id, subject_hash)
);

create index if not exists org_ai_predictions_reading_idx
  on public.org_ai_predictions (reading_id, locked_at desc);

comment on table public.org_ai_predictions is
  'Contraste IA (org readings): AI panel yes/no prediction per question, locked before the field opens. Immutable; service-role only; never shown to respondents.';

create or replace function public.org_ai_predictions_stamp_lock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_first timestamptz;
begin
  if not exists (
    select 1 from public.org_questions q
     where q.id = new.question_id and q.reading_id = new.reading_id
  ) then
    raise exception 'org_ai_predictions: question % does not belong to reading %', new.question_id, new.reading_id;
  end if;
  new.created_at := now();
  new.locked_at := now();
  select min(r.created_at) into v_first
    from public.org_responses r
   where r.reading_id = new.reading_id;
  new.first_response_at := v_first;
  new.status := case when v_first is null then 'locked' else 'late' end;
  return new;
end;
$$;

create or replace function public.org_ai_predictions_immutable()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.org_questions q where q.id = old.question_id) then
      return old; -- parent question/reading deleted: allow cascade
    end if;
    raise exception 'org_ai_predictions rows are immutable once locked (delete blocked)';
  end if;
  raise exception 'org_ai_predictions rows are immutable once locked (update blocked)';
end;
$$;

revoke all on function public.org_ai_predictions_stamp_lock() from public, anon, authenticated;
revoke all on function public.org_ai_predictions_immutable() from public, anon, authenticated;

drop trigger if exists org_ai_predictions_stamp_lock on public.org_ai_predictions;
create trigger org_ai_predictions_stamp_lock
  before insert on public.org_ai_predictions
  for each row execute function public.org_ai_predictions_stamp_lock();

drop trigger if exists org_ai_predictions_immutable on public.org_ai_predictions;
create trigger org_ai_predictions_immutable
  before update or delete on public.org_ai_predictions
  for each row execute function public.org_ai_predictions_immutable();

alter table public.org_ai_predictions enable row level security;
alter table public.org_ai_predictions force row level security;
revoke all on table public.org_ai_predictions from anon, authenticated;
grant all on table public.org_ai_predictions to service_role;
