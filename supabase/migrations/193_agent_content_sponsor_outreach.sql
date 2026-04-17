-- Extend agent_content.content_type to include 'sponsor_outreach'.
--
-- Context
-- -------
-- The CEO Digest agent (lib/agents/ceo-digest.ts) now generates a separate
-- "Sponsor Outreach" artifact alongside the daily digest, and persists it as
-- its own row so the founder can query / review it independently. The
-- existing CHECK constraint on `content_type` does not list this value, which
-- would silently 23514 the insert (the agent code wraps the insert in
-- try/catch so the digest itself still succeeds, but no row is written).
--
-- This migration rebuilds the constraint to include `sponsor_outreach` while
-- preserving every value previously allowed (last set in migration 168).
-- Re-running is safe.

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
    'content_brief',
    'blog_post',
    'sponsor_outreach'
  ));
