-- Add content_types for News Monitor v2: social_scrape_log, market_suggestion, content_brief
-- Run this in Supabase SQL Editor before using the rewritten news-monitor

ALTER TABLE public.agent_content DROP CONSTRAINT IF EXISTS agent_content_content_type_check;
ALTER TABLE public.agent_content ADD CONSTRAINT agent_content_content_type_check
  CHECK (content_type IN (
    'news_summary',
    'sentiment_report',
    'data_alert',
    'social_post',
    'weekly_digest',
    'market_insight',
    'sponsor_report',
    'social_scrape_log',
    'market_suggestion',
    'content_brief'
  ));
