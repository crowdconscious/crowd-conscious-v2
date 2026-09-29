-- 268_persona_ageb_assignment_method.sql
-- Task 4a.2 — provenance for AGEB assignment on simulation_personas.
--
-- Additive only. Does not touch prediction_markets / market_votes / real votes.
-- RLS unchanged (service-role only; migrations 252–254 / 266 pattern).

alter table simulation_personas
  add column if not exists ageb_assignment_method text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'simulation_personas_ageb_assignment_method_check'
  ) then
    alter table simulation_personas
      add constraint simulation_personas_ageb_assignment_method_check
      check (
        ageb_assignment_method is null
        or ageb_assignment_method in (
          'colonia_census_weighted',
          'alcaldia_fallback'
        )
      );
  end if;
end $$;

comment on column simulation_personas.ageb_assignment_method is
  'How ageb_code was chosen (Task 4a.2): colonia_census_weighted = official colonia ∩ AGEB + Censo 2020 P_18YMAS weights; alcaldia_fallback = all AGEBs in alcaldía when colonia name unmatched. Null = not yet assigned.';
