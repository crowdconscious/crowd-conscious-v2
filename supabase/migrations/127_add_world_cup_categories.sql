-- ============================================================
-- 127: Add world_cup and sustainability categories
-- ============================================================
-- Purpose: Expand prediction_markets category to support
-- Phase 5 World Cup seed markets.
-- ============================================================

-- Drop existing category check (find by definition containing 'category')
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

-- Add expanded category constraint
ALTER TABLE public.prediction_markets
  ADD CONSTRAINT prediction_markets_category_check
  CHECK (category IN (
    'world', 'government', 'corporate', 'community', 'cause',
    'world_cup', 'sustainability'
  ));
