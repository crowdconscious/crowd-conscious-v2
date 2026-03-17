-- FIX: Duplicate prediction markets
-- Run in Supabase SQL Editor
--
-- Step 1: Find duplicates (run first to inspect)
SELECT title, COUNT(*) as count,
  array_agg(id ORDER BY created_at ASC) as market_ids,
  array_agg(created_at ORDER BY created_at ASC) as dates,
  array_agg(total_votes ORDER BY created_at ASC) as votes
FROM prediction_markets
WHERE status IN ('active', 'trading')
GROUP BY title
HAVING COUNT(*) > 1;

-- Step 2: Archive newer duplicates (keeps the OLDEST per title)
-- This updates all but the earliest market for each duplicate title
UPDATE prediction_markets
SET status = 'archived', updated_at = NOW()
WHERE id IN (
  SELECT pm.id
  FROM prediction_markets pm
  INNER JOIN (
    SELECT title, MIN(created_at) as min_created
    FROM prediction_markets
    WHERE status IN ('active', 'trading')
    GROUP BY title
    HAVING COUNT(*) > 1
  ) dup ON pm.title = dup.title AND pm.created_at > dup.min_created
  WHERE pm.status IN ('active', 'trading')
);
