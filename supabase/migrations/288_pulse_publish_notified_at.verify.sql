-- Expect: column exists (timestamptz).
SELECT data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='prediction_markets' AND column_name='publish_notified_at';
-- Expect: unnotified_published = 1 until Halzen is announced (then 0); halzen row NULL until announced.
SELECT count(*) FILTER (WHERE is_draft=false AND publish_notified_at IS NULL) AS unnotified_published,
       count(*) FILTER (WHERE is_draft=false AND publish_notified_at IS NOT NULL) AS notified_published
FROM public.prediction_markets;
SELECT id, published_at, publish_notified_at FROM public.prediction_markets
WHERE id='7ab2177a-d727-494f-8b40-709ac9f58d97';
SELECT version, name FROM supabase_migrations.schema_migrations WHERE name='288_pulse_publish_notified_at';
-- Rollback (only after reverting the code that references the column):
-- DROP INDEX IF EXISTS public.prediction_markets_publish_unnotified_idx;
-- ALTER TABLE public.prediction_markets DROP COLUMN IF EXISTS publish_notified_at;
