-- Rollback 332 demo seed only.
DELETE FROM ciceron.match_comments
WHERE is_demo = true
  AND firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid;

DELETE FROM ciceron.match_assignments
WHERE is_demo = true
  AND firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid;
