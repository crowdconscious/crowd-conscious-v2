-- Rollback 328_ciceron_boletines_demo.sql
-- Removes demo bulletin seed + coordinador persona.
-- Restores refresh_demo_dates / reset_demo_firm to 322 bodies — re-apply 322 if needed.

DELETE FROM ciceron.bulletin_hits
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid AND is_demo = true;
DELETE FROM ciceron.bulletin_entries
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid AND is_demo = true;
DELETE FROM ciceron.bulletin_manual_checks
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid AND is_demo = true;
DELETE FROM ciceron.bulletin_runs
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid AND is_demo = true;
DELETE FROM ciceron.bulletin_matter_catalogue
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid AND is_demo = true;

DELETE FROM ciceron.case_files
WHERE id IN (
  'f1000000-0000-4000-8000-000000000021'::uuid,
  'f1000000-0000-4000-8000-000000000022'::uuid,
  'f1000000-0000-4000-8000-000000000023'::uuid,
  'f1000000-0000-4000-8000-000000000024'::uuid,
  'f1000000-0000-4000-8000-000000000025'::uuid
);

DELETE FROM ciceron.memberships
WHERE user_id = 'b1000000-0000-4000-8000-000000000006'::uuid;
DELETE FROM ciceron.demo_personas
WHERE id = 'b1000000-0000-4000-8000-000000000006'::uuid;

-- NOTE: refresh_demo_dates / reset_demo_firm stay at 328 bodies unless 322 is re-applied.
