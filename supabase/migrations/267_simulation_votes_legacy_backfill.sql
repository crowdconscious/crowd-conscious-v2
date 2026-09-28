-- 267_simulation_votes_legacy_backfill.sql (OPTIONAL)
-- Visor de simulación — backfill option_id + sequence_index on pre-266 votes.
--
-- The read-time path in lib/sim-viewer/build-replay.ts already resolves
-- legacy rows without this migration. Apply this ONLY if you want DB rows
-- to carry the viewer columns for cheaper queries / future writers.
--
-- Idempotent: only fills WHERE option_id IS NULL / sequence_index IS NULL.
-- Never touches prediction_markets, market_votes, or real confidence tables.
--
-- Matching rules mirror lib/sim-viewer/legacy.ts:
--   option_id ← market_outcomes.id where normalized label = option_chosen
--   sequence_index ← dense 0..n-1 over md5(run_id||vote_id) within each run
--                    (only for runs where EVERY vote still has null sequence)

-- ---------------------------------------------------------------------------
-- 1. option_id from option_chosen → market_outcomes.label
-- ---------------------------------------------------------------------------
-- Accent folding via translate of common Spanish diacritics (no unaccent ext).

with label_norm as (
  select
    mo.id as outcome_id,
    mo.market_id,
    lower(trim(both from translate(
      mo.label,
      'áàäâÁÀÄÂéèëêÉÈËÊíìïîÍÌÏÎóòöôÓÒÖÔúùüûÚÙÜÛñÑçÇ',
      'aaaaAAAAeeeeEEEEiiiiIIIIooooOOOOuuuuUUUUnNcC'
    ))) as label_key
  from market_outcomes mo
),
vote_match as (
  select distinct on (sv.id)
    sv.id as vote_id,
    ln.outcome_id
  from simulation_votes sv
  join simulation_runs sr on sr.id = sv.run_id
  join label_norm ln
    on ln.market_id = sr.market_id
   and ln.label_key = lower(trim(both from translate(
      sv.option_chosen,
      'áàäâÁÀÄÂéèëêÉÈËÊíìïîÍÌÏÎóòöôÓÒÖÔúùüûÚÙÜÛñÑçÇ',
      'aaaaAAAAeeeeEEEEiiiiIIIIooooOOOOuuuuUUUUnNcC'
    )))
  where sv.option_id is null
    and sv.option_chosen is not null
  order by sv.id, ln.outcome_id
)
update simulation_votes sv
set option_id = vote_match.outcome_id
from vote_match
where sv.id = vote_match.vote_id
  and sv.option_id is null;

-- ---------------------------------------------------------------------------
-- 2. sequence_index — only for fully-null runs (pure legacy)
-- ---------------------------------------------------------------------------
-- Mixed runs (some sequence_index already set) are left to the read-time
-- path so we never collide with existing unique (run_id, sequence_index).

update simulation_votes sv
set sequence_index = sub.seq
from (
  select
    sv2.id,
    (row_number() over (
      partition by sv2.run_id
      order by md5(sv2.run_id::text || ':' || sv2.id::text)
    ) - 1)::int as seq
  from simulation_votes sv2
  where sv2.run_id in (
    select run_id
    from simulation_votes
    where run_id is not null
    group by run_id
    having bool_and(sequence_index is null)
  )
) sub
where sv.id = sub.id
  and sv.sequence_index is null;

comment on column simulation_votes.option_id is
  'FK to market_outcomes. Backfilled from option_chosen by optional migration 267 when null; read-time resolve still works without 267.';
comment on column simulation_votes.sequence_index is
  '0..n-1 replay order. Backfilled by optional migration 267 when null on pure-legacy runs; read-time seeded shuffle still works without 267.';
