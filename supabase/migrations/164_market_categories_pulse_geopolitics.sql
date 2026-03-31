-- Add pulse, geopolitics, technology, economy, entertainment to prediction_markets.category

DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  WHERE c.conrelid = 'public.prediction_markets'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%category%'
  LIMIT 1;
  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.prediction_markets DROP CONSTRAINT %I', conname);
  END IF;
END $$;

ALTER TABLE public.prediction_markets
  ADD CONSTRAINT prediction_markets_category_check
  CHECK (category IN (
    'world', 'government', 'corporate', 'community', 'cause',
    'world_cup', 'sustainability',
    'pulse', 'geopolitics', 'technology', 'economy', 'entertainment'
  ));

-- Example: tag known Pulse survey (safe if row missing)
UPDATE public.prediction_markets
SET category = 'pulse'
WHERE id = '365628d5-58bd-4792-8157-d45f18d63344';
