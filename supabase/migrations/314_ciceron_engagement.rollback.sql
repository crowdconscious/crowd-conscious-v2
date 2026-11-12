-- 314_ciceron_engagement.rollback.sql
-- Drops only objects created by 314. Branch / non-prod only.

DROP VIEW IF EXISTS ciceron.metric_cost_weekly;
DROP VIEW IF EXISTS ciceron.metric_expansion;
DROP VIEW IF EXISTS ciceron.metric_value_moments_weekly;
DROP VIEW IF EXISTS ciceron.metric_review_turnaround_weekly;
DROP VIEW IF EXISTS ciceron.metric_alert_precision_weekly;
DROP VIEW IF EXISTS ciceron.metric_habit_weekly;
DROP VIEW IF EXISTS ciceron.metric_activation;

DROP FUNCTION IF EXISTS ciceron.record_product_event(text, uuid, uuid, jsonb, timestamptz, uuid);

DROP TABLE IF EXISTS ciceron.engagement_resume;
DROP TABLE IF EXISTS ciceron.briefing_previews;
DROP TABLE IF EXISTS ciceron.firm_onboarding;

ALTER TABLE ciceron.firm_ai_budgets
  DROP COLUMN IF EXISTS threshold_alert_50_at,
  DROP COLUMN IF EXISTS threshold_alert_80_at,
  DROP COLUMN IF EXISTS threshold_alert_100_at;
