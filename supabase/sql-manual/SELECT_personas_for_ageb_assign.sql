-- SELECT_personas_for_ageb_assign.sql
-- Task 4a.2 — READ-ONLY export for the AGEB assigner.
-- Paste into the Supabase SQL editor, download as CSV, then:
--
--   node --experimental-strip-types scripts/geo/assign-persona-agebs.ts \
--     --in personas.csv
--
-- Column list must match what assign-persona-agebs.ts expects.

select
  id,
  version,
  alcaldia,
  colonia,
  age,
  gender,
  education,
  occupation,
  income_band,
  nse_band,
  persona_key,
  ageb_code,
  centroid_lat,
  centroid_lng
from simulation_personas
where version = 'cdmx-v1'
order by created_at asc, id asc;
