-- FIX: Markets with English-only titles (no Spanish characters)
-- Run in Supabase SQL Editor
--
-- Step 1: Find markets that appear to have English-only titles
-- (No ¿ á é í ó ú ñ ü - common in Spanish)

SELECT id, title, metadata, status
FROM prediction_markets
WHERE status IN ('active', 'trading')
  AND title NOT LIKE '%¿%' AND title NOT LIKE '%á%'
  AND title NOT LIKE '%é%' AND title NOT LIKE '%í%'
  AND title NOT LIKE '%ó%' AND title NOT LIKE '%ú%'
  AND title NOT LIKE '%ñ%' AND title NOT LIKE '%ü%';

-- Step 2: For each result, either:
-- a) If metadata->translations->es->title exists, use it:
--    UPDATE prediction_markets
--    SET title = COALESCE(metadata->'translations'->'es'->>'title', metadata->'translations'->>'title_es', title)
--    WHERE id = '...' AND (metadata->'translations'->'es'->>'title' IS NOT NULL OR metadata->'translations'->>'title_es' IS NOT NULL);
-- b) If no Spanish version exists, translate manually and run:
--    UPDATE prediction_markets SET title = 'Título en español' WHERE id = '...';
