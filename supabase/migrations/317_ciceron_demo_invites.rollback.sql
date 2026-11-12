-- 317_ciceron_demo_invites.rollback.sql
-- Drops only Prompt 9 invite/session objects. Does not touch audit_events rows
-- or earlier prompts' objects.

DROP FUNCTION IF EXISTS ciceron.switch_demo_persona(text, uuid);
DROP FUNCTION IF EXISTS ciceron.resolve_demo_session(text);
DROP FUNCTION IF EXISTS ciceron.redeem_invite(text, text, text, int);

DROP TABLE IF EXISTS ciceron.guided_story_progress;
DROP TABLE IF EXISTS ciceron.demo_sessions;
DROP TABLE IF EXISTS ciceron.invite_codes;
