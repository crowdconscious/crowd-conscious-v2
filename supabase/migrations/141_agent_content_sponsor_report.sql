-- 141: Add sponsor_report content_type to agent_content for sponsor impact reports

-- Drop existing content_type check and add new one with sponsor_report
ALTER TABLE public.agent_content DROP CONSTRAINT IF EXISTS agent_content_content_type_check;
ALTER TABLE public.agent_content ADD CONSTRAINT agent_content_content_type_check
  CHECK (content_type IN (
    'news_summary', 'sentiment_report', 'data_alert', 'social_post',
    'weekly_digest', 'market_insight', 'sponsor_report'
  ));
